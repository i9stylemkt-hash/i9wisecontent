-- ============================================
-- Migration: Adicionar colunas faltantes na tabela blogs
-- ============================================
-- O código espera colunas que não existem na tabela original.
-- Esta migration adiciona as colunas definidas no Drizzle schema.

-- Adicionar colunas de texto
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS tone_of_voice TEXT;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS author_persona TEXT;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS keywords TEXT[];
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS content_language TEXT DEFAULT 'pt-BR';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS publication_frequency TEXT DEFAULT 'weekly'
  CHECK (publication_frequency IN ('daily', 'twice_weekly', 'weekly', 'biweekly', 'monthly'));
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS automation_level TEXT DEFAULT 'approve_final'
  CHECK (automation_level IN ('full_auto', 'approve_final', 'approve_each_step', 'manual_trigger'));
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS content_types JSONB;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS quality_threshold INTEGER DEFAULT 7;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS human_review_required BOOLEAN DEFAULT true;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS seo_config JSONB;

-- Migrar dados existentes:
-- tone → tone_of_voice
UPDATE public.blogs SET tone_of_voice = tone WHERE tone IS NOT NULL AND tone_of_voice IS NULL;
-- language → content_language
UPDATE public.blogs SET content_language = language WHERE language IS NOT NULL AND content_language IS NULL;
-- status 'active' → is_active true
UPDATE public.blogs SET is_active = (status = 'active') WHERE is_active IS NULL;

-- Gerar slugs para blogs existentes que não têm
UPDATE public.blogs
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- Adicionar constraint unique no slug (após popular)
-- Nota: em caso de colisão, adicionar sufixo manualmente antes de rodar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blogs_slug_unique'
  ) THEN
    ALTER TABLE public.blogs ADD CONSTRAINT blogs_slug_unique UNIQUE (slug);
  END IF;
END$$;

-- Criar índice no slug
CREATE INDEX IF NOT EXISTS idx_blogs_slug ON public.blogs(slug);
CREATE INDEX IF NOT EXISTS idx_blogs_is_active ON public.blogs(is_active);

-- ============================================
-- Tabelas adicionais necessárias para o pipeline
-- ============================================

-- Tabela: pipeline_runs
CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  idea_id UUID,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled', 'rejected')),
  current_stage TEXT,
  awaiting_stage TEXT,
  stages_completed JSONB,
  stages_data JSONB,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: agent_logs
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('planner', 'researcher', 'writer', 'reviewer')),
  model_used TEXT NOT NULL DEFAULT 'auto',
  provider TEXT NOT NULL DEFAULT 'auto',
  input_data JSONB,
  output_data JSONB,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost DECIMAL(10,6) DEFAULT 0,
  duration_ms INTEGER,
  status TEXT DEFAULT 'running',
  error_message TEXT,
  prompt_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: ideas
CREATE TABLE IF NOT EXISTS public.ideas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "references" TEXT[],
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'approved', 'in_progress', 'done', 'discarded')),
  tags TEXT[],
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: templates
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  structure TEXT,
  sections JSONB,
  content_type TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: blog_templates
CREATE TABLE IF NOT EXISTS public.blog_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: prompts
CREATE TABLE IF NOT EXISTS public.prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  agent_type TEXT CHECK (agent_type IN ('planner', 'researcher', 'writer', 'reviewer')),
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  key_encrypted TEXT NOT NULL,
  key_alias TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  total_cost DECIMAL(10,6) DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  rate_limit_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: cost_metrics
CREATE TABLE IF NOT EXISTS public.cost_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pipeline_run_id UUID REFERENCES public.pipeline_runs(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  agent_type TEXT CHECK (agent_type IN ('planner', 'researcher', 'writer', 'reviewer')),
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  cost_brl DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: tags
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: article_tags
CREATE TABLE IF NOT EXISTS public.article_tags (
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (article_id, tag_id)
);

-- Tabela: article_notes
CREATE TABLE IF NOT EXISTS public.article_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: cron_jobs
CREATE TABLE IF NOT EXISTS public.cron_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL,
  schedule TEXT NOT NULL,
  job_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Atualizar tabela articles para ter as colunas do Drizzle schema
-- ============================================
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS pipeline_run_id UUID;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_markdown TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS quality_score INTEGER;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS scoring_details JSONB;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS scheduled_date TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS published_date TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Remover constraint de status antigo (se existir) e atualizar
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_status_check
  CHECK (status IN ('idea', 'planning', 'researching', 'writing', 'reviewing', 'revision', 'ready', 'published', 'archived'));

-- ============================================
-- RLS para novas tabelas
-- ============================================
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies para pipeline_runs (via join com blogs)
CREATE POLICY "Users can view own pipeline runs" ON public.pipeline_runs FOR SELECT
  USING (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()));
CREATE POLICY "Users can create pipeline runs" ON public.pipeline_runs FOR INSERT
  WITH CHECK (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own pipeline runs" ON public.pipeline_runs FOR UPDATE
  USING (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()));

-- Policies para ideas
CREATE POLICY "Users can manage own ideas" ON public.ideas FOR ALL
  USING (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()));

-- Policies para templates
CREATE POLICY "Users can manage own templates" ON public.templates FOR ALL
  USING (auth.uid() = user_id);

-- Policies para prompts
CREATE POLICY "Users can manage own prompts" ON public.prompts FOR ALL
  USING (auth.uid() = user_id);

-- Policies para api_keys
CREATE POLICY "Users can manage own api keys" ON public.api_keys FOR ALL
  USING (auth.uid() = user_id);

-- Policies para notifications
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL
  USING (auth.uid() = user_id);

-- Policies para agent_logs (via pipeline_runs → blogs)
CREATE POLICY "Users can view own agent logs" ON public.agent_logs FOR SELECT
  USING (pipeline_run_id IN (
    SELECT id FROM public.pipeline_runs WHERE blog_id IN (
      SELECT id FROM public.blogs WHERE user_id = auth.uid()
    )
  ));
CREATE POLICY "Users can create agent logs" ON public.agent_logs FOR INSERT
  WITH CHECK (pipeline_run_id IN (
    SELECT id FROM public.pipeline_runs WHERE blog_id IN (
      SELECT id FROM public.blogs WHERE user_id = auth.uid()
    )
  ));

-- Policies para tags
CREATE POLICY "Users can manage own tags" ON public.tags FOR ALL
  USING (auth.uid() = user_id);

-- Policies para article_tags (via articles → user_id)
CREATE POLICY "Users can manage own article tags" ON public.article_tags FOR ALL
  USING (article_id IN (SELECT id FROM public.articles WHERE user_id = auth.uid()));

-- Policies para article_notes
CREATE POLICY "Users can manage own article notes" ON public.article_notes FOR ALL
  USING (article_id IN (SELECT id FROM public.articles WHERE user_id = auth.uid()));

-- Policies para blog_templates
CREATE POLICY "Users can manage own blog templates" ON public.blog_templates FOR ALL
  USING (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()));

-- Policies para cron_jobs
CREATE POLICY "Users can manage own cron jobs" ON public.cron_jobs FOR ALL
  USING (blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid()));

-- Policies para cost_metrics
CREATE POLICY "Users can view own cost metrics" ON public.cost_metrics FOR SELECT
  USING (pipeline_run_id IN (
    SELECT id FROM public.pipeline_runs WHERE blog_id IN (
      SELECT id FROM public.blogs WHERE user_id = auth.uid()
    )
  ));

-- ============================================
-- Índices adicionais
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_blog_id ON public.pipeline_runs(blog_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON public.pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_logs_pipeline_run_id ON public.agent_logs(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_ideas_blog_id ON public.ideas(blog_id);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON public.ideas(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_cron_jobs_blog_id ON public.cron_jobs(blog_id);
