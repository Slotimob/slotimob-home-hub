-- Adicionar RLS policy para rate_limits (tabela de sistema)
-- Esta tabela é usada internamente para controle de rate limiting

CREATE POLICY "Service role can manage rate limits" 
ON public.rate_limits 
FOR ALL 
USING (true)
WITH CHECK (true);