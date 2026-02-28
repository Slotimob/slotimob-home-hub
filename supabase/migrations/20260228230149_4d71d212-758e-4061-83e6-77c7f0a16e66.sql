-- Restrict role_templates to authenticated users only
DROP POLICY IF EXISTS "Role templates are publicly readable" ON public.role_templates;

CREATE POLICY "Authenticated users can view role templates"
ON public.role_templates
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);