import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';

export interface WhatsAppTag {
  id: string;
  name: string;
  color: string;
  broker_id: string;
  created_at: string;
}

export interface ConversationTag {
  id: string;
  conversation_id: string;
  tag_id: string;
  created_at: string;
  tag?: WhatsAppTag;
}

export function useWhatsAppTags() {
  const { effectiveBrokerId } = useWorkspace();
  const [tags, setTags] = useState<WhatsAppTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    if (!effectiveBrokerId) return;
    const { data, error } = await supabase
      .from('whatsapp_tags')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching whatsapp tags:', error);
    } else {
      setTags((data as any as WhatsAppTag[]) || []);
    }
    setLoading(false);
  }, [effectiveBrokerId]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(async (name: string, color: string) => {
    if (!effectiveBrokerId) return null;
    const { data, error } = await supabase
      .from('whatsapp_tags')
      .insert({ name: name.toLowerCase().trim(), color, broker_id: effectiveBrokerId } as any)
      .select()
      .single();

    if (error) {
      // Duplicate — try to find existing
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('whatsapp_tags')
          .select('*')
          .eq('name', name.toLowerCase().trim())
          .maybeSingle();
        if (existing) {
          setTags(prev => prev.some(t => t.id === (existing as any).id) ? prev : [...prev, existing as any]);
          return existing as any as WhatsAppTag;
        }
      }
      console.error('Error creating tag:', error);
      return null;
    }
    const newTag = data as any as WhatsAppTag;
    setTags(prev => [...prev, newTag]);
    return newTag;
  }, [effectiveBrokerId]);

  const deleteTag = useCallback(async (tagId: string) => {
    const { error } = await supabase.from('whatsapp_tags').delete().eq('id', tagId);
    if (!error) setTags(prev => prev.filter(t => t.id !== tagId));
  }, []);

  return { tags, loading, createTag, deleteTag, refetch: fetchTags };
}

export function useConversationTags(conversationId: string | null) {
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTagIds = useCallback(async () => {
    if (!conversationId) { setTagIds([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('whatsapp_conversation_tags')
      .select('tag_id')
      .eq('conversation_id', conversationId);

    if (error) console.error('Error fetching conversation tags:', error);
    else setTagIds((data as any[])?.map(d => d.tag_id) || []);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchTagIds();
  }, [fetchTagIds]);

  const addTag = useCallback(async (tagId: string) => {
    if (!conversationId) return;
    setTagIds(prev => prev.includes(tagId) ? prev : [...prev, tagId]);
    await supabase
      .from('whatsapp_conversation_tags')
      .insert({ conversation_id: conversationId, tag_id: tagId } as any);
  }, [conversationId]);

  const removeTag = useCallback(async (tagId: string) => {
    if (!conversationId) return;
    setTagIds(prev => prev.filter(id => id !== tagId));
    await supabase
      .from('whatsapp_conversation_tags')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('tag_id', tagId);
  }, [conversationId]);

  return { tagIds, loading, addTag, removeTag, refetch: fetchTagIds };
}
