-- ============================================
-- i9 Wise Content — Schema Inicial Completo
-- Migration: 0000_initial_schema.sql
-- ============================================

-- ========== ENUMS ==========

CREATE TYPE article_status AS ENUM (
  'idea', 'planning', 'researching', 'writing',
  'reviewing', 'revision', 'ready', 'published', 'archived'
);

CREATE TYPE pipeline_status AS ENUM (
  'queued', 'running', 'awaiting_approval',
  'completed', 'failed', 'cancelled'
);

CREATE TYPE pipeline_stage AS ENUM (
  'planning', 'research', 'generation', 'review', 'completed'
);

CREATE TYPE agent_type AS ENUM (
  'planner', 'researcher', 'writer', 'reviewer'
);

CREATE TYPE idea_priority AS ENUM (
  'low', 'medium', 'high', 'urgent'
);

CREATE TYPE idea_status AS ENUM (
  'backlog', 'approved', 'in_progress', 'done', 'discarded'
);

CREATE TYPE publication_frequency AS ENUM (
  'daily', 'twice_weekly', 'weekly', 'biweekly', 'monthly'
);

CREATE TYPE automation_level AS ENUM (
  'full_auto', 'approve_final', 'approve_each_step', 'manual_trigger'
);

-- ========== TABLES ==========

-- Blogs
CREATE TABLE blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  niche TEXT NOT NULL,
  description TEXT,
  tone_of_voice TEXT,
  author_persona TEXT,
  target_audience TEXT,
  keywords TEXT[],
  content_language TEXT NOT NULL DEFAULT 'pt-BR',
  publication_frequency publication_frequency NOT NULL DEFAULT 'weekly',
  automation_level automation_level NOT NULL DEFAULT 'approve_final',
  content_types JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  quality_threshold INTEGER NOT NULL DEFAULT 7,
  human_review_required BOOLEAN NOT NULL DEFAULT true,
  seo_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Articles
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  pipeline_run_id UUID,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  meta_description TEXT,
  content_markdown TEXT,
  content_html TEXT,
  summary TEXT,
  tags TEXT[],
  status article_status NOT NULL DEFAULT 'idea',
  quality_score INTEGER,
  seo_score JSONB,
  scoring_details JSONB,
  scheduled_date TEXT,
  published_date TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ideas
CREATE TABLE ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "references" TEXT[],
  priority idea_priority NOT NULL DEFAULT 'medium',
  status idea_status NOT NULL DEFAULT 'backlog',
  tags TEXT[],
  source TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pipeline Runs
CREATE TABLE pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
  idea_id UUID REFERENCES ideas(id) ON DELETE SET NULL,
  status pipeline_status NOT NULL DEFAULT 'queued',
  current_stage pipeline_stage,
  stages_completed JSONB,
  stages_data JSONB,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 6) DEFAULT 0,
  duration_ms INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent Logs
CREATE TABLE agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id UUID NOT NULL REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  agent_type agent_type NOT NULL,
  model_used TEXT NOT NULL,
  provider TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  prompt_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Templates
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  structure TEXT,
  sections JSONB,
  content_type TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Blog Templates (N:N)
CREATE TABLE blog_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prompts
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  agent_type agent_type,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  key_encrypted TEXT NOT NULL,
  key_alias TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_count INTEGER NOT NULL DEFAULT 0,
  total_cost DECIMAL(10, 6) DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  rate_limit_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cost Metrics
CREATE TABLE cost_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id UUID REFERENCES pipeline_runs(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  agent_type agent_type,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  cost_usd DECIMAL(10, 6) DEFAULT 0,
  cost_brl DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Article Tags (N:N)
CREATE TABLE article_tags (
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Article Notes
CREATE TABLE article_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cron Jobs
CREATE TABLE cron_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  schedule TEXT NOT NULL,
  job_type TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK for articles.pipeline_run_id (after pipeline_runs table exists)
ALTER TABLE articles
  ADD CONSTRAINT fk_articles_pipeline_run
  FOREIGN KEY (pipeline_run_id) REFERENCES pipeline_runs(id) ON DELETE SET NULL;

-- ========== INDEXES ==========

CREATE INDEX idx_blogs_user_id ON blogs(user_id);
CREATE INDEX idx_blogs_is_active ON blogs(is_active);

CREATE INDEX idx_articles_blog_id ON articles(blog_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_blog_status ON articles(blog_id, status);
CREATE INDEX idx_articles_scheduled_date ON articles(scheduled_date);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);

CREATE INDEX idx_ideas_blog_id ON ideas(blog_id);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_priority ON ideas(priority);

CREATE INDEX idx_pipeline_runs_blog_id ON pipeline_runs(blog_id);
CREATE INDEX idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX idx_pipeline_runs_created_at ON pipeline_runs(created_at DESC);

CREATE INDEX idx_agent_logs_pipeline_run_id ON agent_logs(pipeline_run_id);
CREATE INDEX idx_agent_logs_created_at ON agent_logs(created_at DESC);

CREATE INDEX idx_cost_metrics_pipeline_run_id ON cost_metrics(pipeline_run_id);
CREATE INDEX idx_cost_metrics_created_at ON cost_metrics(created_at DESC);

CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_cron_jobs_blog_id ON cron_jobs(blog_id);

-- ========== ROW LEVEL SECURITY ==========

ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_jobs ENABLE ROW LEVEL SECURITY;

-- Blogs: direct user_id ownership
CREATE POLICY "blogs_select" ON blogs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "blogs_insert" ON blogs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "blogs_update" ON blogs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "blogs_delete" ON blogs FOR DELETE USING (auth.uid() = user_id);

-- Articles: via blog ownership
CREATE POLICY "articles_select" ON articles FOR SELECT
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "articles_insert" ON articles FOR INSERT
  WITH CHECK (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "articles_update" ON articles FOR UPDATE
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "articles_delete" ON articles FOR DELETE
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));

-- Ideas: via blog ownership
CREATE POLICY "ideas_select" ON ideas FOR SELECT
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "ideas_insert" ON ideas FOR INSERT
  WITH CHECK (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "ideas_update" ON ideas FOR UPDATE
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "ideas_delete" ON ideas FOR DELETE
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));

-- Pipeline Runs: via blog ownership
CREATE POLICY "pipeline_runs_select" ON pipeline_runs FOR SELECT
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "pipeline_runs_insert" ON pipeline_runs FOR INSERT
  WITH CHECK (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "pipeline_runs_update" ON pipeline_runs FOR UPDATE
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "pipeline_runs_delete" ON pipeline_runs FOR DELETE
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));

-- Agent Logs: via pipeline_run → blog ownership
CREATE POLICY "agent_logs_select" ON agent_logs FOR SELECT
  USING (pipeline_run_id IN (
    SELECT id FROM pipeline_runs WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));
CREATE POLICY "agent_logs_insert" ON agent_logs FOR INSERT
  WITH CHECK (pipeline_run_id IN (
    SELECT id FROM pipeline_runs WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));

-- Templates: direct user_id ownership
CREATE POLICY "templates_select" ON templates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "templates_insert" ON templates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "templates_update" ON templates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "templates_delete" ON templates FOR DELETE USING (auth.uid() = user_id);

-- Blog Templates: via blog ownership
CREATE POLICY "blog_templates_select" ON blog_templates FOR SELECT
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "blog_templates_insert" ON blog_templates FOR INSERT
  WITH CHECK (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "blog_templates_delete" ON blog_templates FOR DELETE
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));

-- Prompts: direct user_id ownership
CREATE POLICY "prompts_select" ON prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prompts_insert" ON prompts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prompts_update" ON prompts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "prompts_delete" ON prompts FOR DELETE USING (auth.uid() = user_id);

-- API Keys: direct user_id ownership
CREATE POLICY "api_keys_select" ON api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE USING (auth.uid() = user_id);

-- Cost Metrics: via pipeline_run → blog ownership
CREATE POLICY "cost_metrics_select" ON cost_metrics FOR SELECT
  USING (pipeline_run_id IN (
    SELECT id FROM pipeline_runs WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));
CREATE POLICY "cost_metrics_insert" ON cost_metrics FOR INSERT
  WITH CHECK (pipeline_run_id IN (
    SELECT id FROM pipeline_runs WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));

-- Tags: direct user_id ownership
CREATE POLICY "tags_select" ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tags_insert" ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tags_update" ON tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tags_delete" ON tags FOR DELETE USING (auth.uid() = user_id);

-- Article Tags: via article → blog ownership
CREATE POLICY "article_tags_select" ON article_tags FOR SELECT
  USING (article_id IN (
    SELECT id FROM articles WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));
CREATE POLICY "article_tags_insert" ON article_tags FOR INSERT
  WITH CHECK (article_id IN (
    SELECT id FROM articles WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));
CREATE POLICY "article_tags_delete" ON article_tags FOR DELETE
  USING (article_id IN (
    SELECT id FROM articles WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));

-- Article Notes: via article → blog ownership
CREATE POLICY "article_notes_select" ON article_notes FOR SELECT
  USING (article_id IN (
    SELECT id FROM articles WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));
CREATE POLICY "article_notes_insert" ON article_notes FOR INSERT
  WITH CHECK (article_id IN (
    SELECT id FROM articles WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));
CREATE POLICY "article_notes_update" ON article_notes FOR UPDATE
  USING (article_id IN (
    SELECT id FROM articles WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));
CREATE POLICY "article_notes_delete" ON article_notes FOR DELETE
  USING (article_id IN (
    SELECT id FROM articles WHERE blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid())
  ));

-- Cron Jobs: via blog ownership
CREATE POLICY "cron_jobs_select" ON cron_jobs FOR SELECT
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "cron_jobs_insert" ON cron_jobs FOR INSERT
  WITH CHECK (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "cron_jobs_update" ON cron_jobs FOR UPDATE
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));
CREATE POLICY "cron_jobs_delete" ON cron_jobs FOR DELETE
  USING (blog_id IN (SELECT id FROM blogs WHERE user_id = auth.uid()));

-- ========== TRIGGERS ==========

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blogs_updated_at BEFORE UPDATE ON blogs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER articles_updated_at BEFORE UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER ideas_updated_at BEFORE UPDATE ON ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER prompts_updated_at BEFORE UPDATE ON prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER article_notes_updated_at BEFORE UPDATE ON article_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER cron_jobs_updated_at BEFORE UPDATE ON cron_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
