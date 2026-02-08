-- Corrigir policy de rate_limits para ser mais restritiva
-- Rate limits só pode ser gerenciado via service_role (edge functions)

DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- Bloquear acesso de usuários normais (só service_role consegue)
CREATE POLICY "Block direct user access to rate_limits" 
ON public.rate_limits 
FOR ALL 
USING (false);