ALTER TABLE public.training_content
  ADD COLUMN IF NOT EXISTS feature_key TEXT,
  ADD COLUMN IF NOT EXISTS body_markdown TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_training_content_feature_key
  ON public.training_content(feature_key)
  WHERE feature_key IS NOT NULL AND is_published = true;

CREATE INDEX IF NOT EXISTS idx_training_content_feature_key
  ON public.training_content(feature_key) WHERE feature_key IS NOT NULL;

COMMENT ON COLUMN public.training_content.feature_key IS
  'Identificador estável da funcionalidade (ex: finance.transactions). Usado pelo HelpTooltip para localizar conteúdo correspondente.';

COMMENT ON COLUMN public.training_content.short_description IS
  'Texto curto (até 200 caracteres) exibido no tooltip do ícone (?). Diferente da description completa, que aparece dentro de /training.';

COMMENT ON COLUMN public.training_content.body_markdown IS
  'Texto completo em markdown para explicações detalhadas na página de treinamento.';