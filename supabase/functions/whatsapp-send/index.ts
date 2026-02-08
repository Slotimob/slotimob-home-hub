import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decrypt } from "../_shared/encryption.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_TEXT_LENGTH = 4096; // WhatsApp text limit
const MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB base64
const ALLOWED_MESSAGE_TYPES = ['text', 'image', 'document', 'audio', 'video'];

// Rate limiting constants
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_WINDOW_MINUTES = 1;

// Validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Sanitize text content - remove potentially dangerous characters
function sanitizeContent(content: string): string {
  if (!content) return '';
  // Remove null bytes and other control characters that could cause issues
  return content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

// Rate limiting helper
async function checkRateLimit(
  supabaseAdmin: any,
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
  
  // Get current count within window
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('request_count, window_start')
    .eq('identifier', identifier)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Rate limit check error:', error);
    // Allow on error to not block legitimate requests
    return { allowed: true, remaining: maxRequests };
  }

  const currentCount = data?.request_count || 0;
  
  if (currentCount >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  // Upsert rate limit entry
  if (data) {
    await supabaseAdmin
      .from('rate_limits')
      .update({ request_count: currentCount + 1 })
      .eq('identifier', identifier)
      .eq('endpoint', endpoint)
      .eq('window_start', data.window_start);
  } else {
    await supabaseAdmin
      .from('rate_limits')
      .insert({
        identifier,
        endpoint,
        request_count: 1,
        window_start: new Date().toISOString()
      });
  }

  return { allowed: true, remaining: maxRequests - currentCount - 1 };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Validate Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Create admin client for rate limiting
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate JWT using getClaims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error('JWT validation error:', claimsError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Check rate limit
    const rateLimitResult = await checkRateLimit(
      supabaseAdmin,
      userId,
      'whatsapp-send',
      RATE_LIMIT_MAX_REQUESTS,
      RATE_LIMIT_WINDOW_MINUTES
    );

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user ${userId}`);
      return new Response(JSON.stringify({ error: 'Too many requests. Please wait before sending more messages.' }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60'
        },
      });
    }

    // Parse and validate input
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { conversationId, messageType, content, mediaUrl, mediaBase64, mediaMimeType, mediaFilename } = requestBody;

    // Validate conversationId
    if (!conversationId || typeof conversationId !== 'string' || !isValidUUID(conversationId)) {
      return new Response(JSON.stringify({ error: 'Invalid conversation ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate messageType
    const validatedMessageType = messageType || 'text';
    if (!ALLOWED_MESSAGE_TYPES.includes(validatedMessageType)) {
      return new Response(JSON.stringify({ error: 'Unsupported message type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate content length
    if (content && typeof content === 'string' && content.length > MAX_TEXT_LENGTH) {
      return new Response(JSON.stringify({ error: `Message content exceeds maximum length of ${MAX_TEXT_LENGTH} characters` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate mediaBase64 size
    if (mediaBase64 && typeof mediaBase64 === 'string' && mediaBase64.length > MAX_MEDIA_SIZE) {
      return new Response(JSON.stringify({ error: 'Media file exceeds maximum size of 10MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate mediaUrl if provided
    if (mediaUrl && typeof mediaUrl === 'string') {
      try {
        new URL(mediaUrl);
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid media URL' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Sanitize content
    const sanitizedContent = sanitizeContent(content || '');

    console.log(`Sending WhatsApp message for user: ${userId}, conversation: ${conversationId}, type: ${validatedMessageType}`);

    // Get conversation with connection details
    const { data: conversation, error: convError } = await supabaseClient
      .from('whatsapp_conversations')
      .select(`
        *,
        connection:whatsapp_connections(*)
      `)
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user owns this connection
    if (conversation.connection.broker_id !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const connection = conversation.connection;
    const evolutionApiUrl = connection.evolution_api_url;
    // Decrypt the API key before use
    const evolutionApiKey = await decrypt(connection.evolution_api_key);
    const instanceName = connection.instance_name;

    let sendEndpoint = '';
    let sendBody: Record<string, unknown> = {
      number: conversation.remote_jid,
    };

    // Build request based on message type
    switch (validatedMessageType) {
      case 'text':
        sendEndpoint = `${evolutionApiUrl}/message/sendText/${instanceName}`;
        sendBody.text = sanitizedContent;
        break;

      case 'image':
        sendEndpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
        sendBody.mediatype = 'image';
        sendBody.caption = sanitizedContent;
        if (mediaBase64) {
          sendBody.media = mediaBase64;
        } else if (mediaUrl) {
          sendBody.media = mediaUrl;
        }
        break;

      case 'document':
        sendEndpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
        sendBody.mediatype = 'document';
        sendBody.fileName = sanitizeContent(mediaFilename || 'document');
        if (mediaBase64) {
          sendBody.media = mediaBase64;
        } else if (mediaUrl) {
          sendBody.media = mediaUrl;
        }
        break;

      case 'audio':
        sendEndpoint = `${evolutionApiUrl}/message/sendWhatsAppAudio/${instanceName}`;
        if (mediaBase64) {
          sendBody.audio = mediaBase64;
        } else if (mediaUrl) {
          sendBody.audio = mediaUrl;
        }
        break;

      case 'video':
        sendEndpoint = `${evolutionApiUrl}/message/sendMedia/${instanceName}`;
        sendBody.mediatype = 'video';
        sendBody.caption = sanitizedContent;
        if (mediaBase64) {
          sendBody.media = mediaBase64;
        } else if (mediaUrl) {
          sendBody.media = mediaUrl;
        }
        break;

      default:
        return new Response(JSON.stringify({ error: 'Unsupported message type' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log('Sending to Evolution API:', sendEndpoint);

    // Send message via Evolution API
    const sendResponse = await fetch(sendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
      body: JSON.stringify(sendBody),
    });

    const sendData = await sendResponse.json();
    console.log('Evolution API send response:', sendData);

    if (!sendResponse.ok) {
      return new Response(JSON.stringify({ error: sendData.message || 'Failed to send message' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique message ID
    const messageId = sendData.key?.id || `sent_${Date.now()}`;

    // Save message to database
    const { data: message, error: msgError } = await supabaseClient
      .from('whatsapp_messages')
      .insert({
        conversation_id: conversationId,
        message_id: messageId,
        direction: 'outgoing',
        message_type: validatedMessageType,
        content: sanitizedContent,
        media_url: mediaUrl,
        media_mime_type: mediaMimeType,
        media_filename: mediaFilename,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error saving message:', msgError);
    }

    // Update conversation's last message
    await supabaseClient
      .from('whatsapp_conversations')
      .update({
        last_message: sanitizedContent || `[${validatedMessageType}]`,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return new Response(JSON.stringify({ 
      success: true, 
      message,
      evolutionResponse: sendData
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': String(rateLimitResult.remaining)
      },
    });
  } catch (error) {
    console.error('Error in whatsapp-send function:', error);
    // Return generic error to avoid leaking internal details
    return new Response(JSON.stringify({ error: 'Failed to send message. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
