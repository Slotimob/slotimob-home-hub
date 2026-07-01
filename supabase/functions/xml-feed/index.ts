import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeXml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function mapPropertyType(type: string | null | undefined): string {
  const map: Record<string, string> = {
    apartamento: 'Apartment',
    casa: 'Home',
    sobrado: 'Home',
    comercial: 'Commercial',
    sala_comercial: 'Commercial',
    loja: 'Commercial',
    galpao: 'Commercial',
    terreno: 'Land',
    rural: 'CountryHouse',
    kitnet: 'Studio',
    studio: 'Studio',
    cobertura: 'Penthouse',
    outros: 'Residential',
  };
  return map[type?.toLowerCase() || ''] || 'Residential';
}

// intent_type in DB: 'sale' | 'rental' | 'both'
function mapTransactionType(intent: string | null | undefined): string {
  if (intent === 'rental') return 'For Rent';
  return 'For Sale'; // 'sale' or 'both' → For Sale (RentPrice added separately when 'both')
}

// furnished in DB: 'sim' | 'semimobiliado' | 'parcial' | 'nao'
function mapFurnished(furnished: string | null | undefined): string | null {
  if (furnished === 'sim') return 'Mobiliado';
  if (furnished === 'semimobiliado' || furnished === 'parcial') return 'Semi-mobiliado';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('Token is required', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limiting: max 30 requests per token per 15 minutes
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: recentRequests } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', `xml:${token}`)
      .gte('window_start', windowStart);

    if ((recentRequests || 0) >= 30) {
      return new Response('Too many requests', { status: 429, headers: corsHeaders });
    }

    await supabase.from('rate_limits').insert({
      identifier: `xml:${token}`,
      window_start: new Date().toISOString(),
    });

    // Find user by feed_token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('feed_token', token)
      .single();

    if (profileError || !profile) {
      return new Response('Invalid token', { status: 401, headers: corsHeaders });
    }

    const userId = profile.id;

    // Fetch published units (both standalone and linked)
    const { data: units, error: unitsError } = await supabase
      .from('units')
      .select(`
        id,
        unit_number,
        bedrooms,
        bathrooms,
        suites,
        area,
        price,
        rent_price,
        condo_fee,
        iptu,
        property_type,
        parking_spots,
        description,
        address,
        city,
        state,
        postal_code,
        neighborhood,
        furnished,
        cover_image_url,
        gallery_images,
        intent_type,
        is_standalone,
        properties!units_property_id_fkey (
          name,
          address,
          city,
          state,
          postal_code,
          neighborhood
        )
      `)
      .eq('broker_id', userId)
      .eq('is_published_portal', true);

    if (unitsError) {
      console.error('Error fetching units:', unitsError);
      return new Response('Error fetching data', { status: 500, headers: corsHeaders });
    }

    const listings = units || [];
    const now = new Date().toISOString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<ListingDataFeed xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;
    xml += `  <Header>\n`;
    xml += `    <Provider>\n`;
    xml += `      <Name>${escapeXml(profile.full_name || 'SlotiMob')}</Name>\n`;
    xml += `      <Homepage>https://slotimob.com.br</Homepage>\n`;
    xml += `    </Provider>\n`;
    xml += `    <Listings count="${listings.length}" />\n`;
    xml += `    <Generated>${now}</Generated>\n`;
    xml += `  </Header>\n`;
    xml += `  <Listings>\n`;

    for (const unit of listings) {
      const prop = (unit.properties as any);
      // Address: standalone uses unit's own fields; linked uses property's fields
      const addr = unit.is_standalone ? unit.address : (prop?.address || unit.address || '');
      const city = unit.is_standalone ? unit.city : (prop?.city || unit.city || '');
      const state = unit.is_standalone ? unit.state : (prop?.state || unit.state || '');
      const postal = unit.is_standalone ? unit.postal_code : (prop?.postal_code || unit.postal_code || '');
      const neighborhood = unit.is_standalone ? unit.neighborhood : (prop?.neighborhood || unit.neighborhood || '');

      const intent = unit.intent_type as string | null;
      const transactionType = mapTransactionType(intent);
      // Price: use rent_price for rental-only, price for sale or both
      const listingPrice = intent === 'rental' ? (unit.rent_price || 0) : (unit.price || 0);
      const propType = mapPropertyType(unit.property_type);

      const titleParts = [unit.property_type || 'Imóvel'];
      if (unit.bedrooms) titleParts.push(`${unit.bedrooms} quartos`);
      if (neighborhood) titleParts.push(neighborhood);
      else if (city) titleParts.push(city);
      const title = titleParts.join(' - ');

      const pictures: string[] = [];
      if (unit.cover_image_url) pictures.push(unit.cover_image_url);
      if (Array.isArray(unit.gallery_images)) {
        for (const img of unit.gallery_images) {
          if (img && img !== unit.cover_image_url) pictures.push(img);
        }
      }

      xml += `    <Listing>\n`;
      xml += `      <ListingID>${escapeXml(unit.id)}</ListingID>\n`;
      xml += `      <Title>${escapeXml(title)}</Title>\n`;
      xml += `      <TransactionType>${transactionType}</TransactionType>\n`;
      xml += `      <ListingType>Residential</ListingType>\n`;
      xml += `      <PropertyType>${propType}</PropertyType>\n`;
      xml += `      <Price>\n`;
      xml += `        <Currency>BRL</Currency>\n`;
      xml += `        <Amount>${listingPrice}</Amount>\n`;
      xml += `      </Price>\n`;

      // For 'both': also emit RentPrice
      if (intent === 'both' && unit.rent_price) {
        xml += `      <RentPrice>\n`;
        xml += `        <Currency>BRL</Currency>\n`;
        xml += `        <Amount>${unit.rent_price}</Amount>\n`;
        xml += `      </RentPrice>\n`;
      }

      xml += `      <Location>\n`;
      xml += `        <Country>BR</Country>\n`;
      xml += `        <State>${escapeXml(state)}</State>\n`;
      xml += `        <City>${escapeXml(city)}</City>\n`;
      xml += `        <Neighborhood>${escapeXml(neighborhood)}</Neighborhood>\n`;
      xml += `        <Address>${escapeXml(addr)}</Address>\n`;
      xml += `        <PostalCode>${escapeXml((postal || '').replace(/\D/g, ''))}</PostalCode>\n`;
      xml += `      </Location>\n`;

      xml += `      <Details>\n`;
      if (unit.bedrooms !== null && unit.bedrooms !== undefined) xml += `        <Bedrooms>${unit.bedrooms}</Bedrooms>\n`;
      if (unit.suites !== null && unit.suites !== undefined) xml += `        <Suites>${unit.suites}</Suites>\n`;
      if (unit.bathrooms !== null && unit.bathrooms !== undefined) xml += `        <Bathrooms>${unit.bathrooms}</Bathrooms>\n`;
      if (unit.parking_spots !== null && unit.parking_spots !== undefined) xml += `        <GarageSpaces>${unit.parking_spots}</GarageSpaces>\n`;
      if (unit.area !== null && unit.area !== undefined) xml += `        <LivingArea>${unit.area}</LivingArea>\n`;
      xml += `      </Details>\n`;

      const features: string[] = [];
      if (unit.condo_fee) features.push(`Condomínio R$ ${unit.condo_fee}`);
      if (unit.iptu) features.push(`IPTU R$ ${unit.iptu}/ano`);
      const furnishedLabel = mapFurnished(unit.furnished);
      if (furnishedLabel) features.push(furnishedLabel);

      if (features.length > 0) {
        xml += `      <Features>\n`;
        for (const f of features) {
          xml += `        <Feature>${escapeXml(f)}</Feature>\n`;
        }
        xml += `      </Features>\n`;
      }

      if (pictures.length > 0) {
        xml += `      <Pictures>\n`;
        for (const pic of pictures) {
          xml += `        <Picture><PictureURL>${escapeXml(pic)}</PictureURL></Picture>\n`;
        }
        xml += `      </Pictures>\n`;
      }

      if (unit.description) {
        xml += `      <Description>${escapeXml(unit.description)}</Description>\n`;
      }

      xml += `      <ContactInfo>\n`;
      xml += `        <Name>${escapeXml(profile.full_name || 'SlotiMob')}</Name>\n`;
      xml += `      </ContactInfo>\n`;
      xml += `    </Listing>\n`;
    }

    xml += `  </Listings>\n`;
    xml += `</ListingDataFeed>`;

    console.log(`XML feed generated for broker ${userId}: ${listings.length} listings`);

    return new Response(xml, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error generating XML feed:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});