-- ============================================
-- i9 Wise Content — Schema Inicial
-- ============================================
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABELAS
-- ============================================

-- Tabela: profiles (extensão do auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: blogs
CREATE TABLE public.blogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  niche TEXT NOT NULL,
  target_audience TEXT,
  tone TEXT DEFAULT 'professional',
  language TEXT DEFAULT 'pt-BR',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: articles
CREATE TABLE public.articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  slug TEXT,
  subtitle TEXT,
  summary TEXT,
  content TEXT,
  meta_description TEXT,
  keywords TEXT[],
  status TEXT DEFAULT 'draft' CHECK (status IN ('idea', 'draft', 'reviewing', 'approved', 'published', 'archived')),
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,
  seo_score INTEGER,
  ai_model_used TEXT,
  generation_metadata JSONB DEFAULT '{}',
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: editorial_calendar
CREATE TABLE public.editorial_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID REFERENCES public.blogs(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  planned_date DATE NOT NULL,
  topic TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: ai_tasks (rastreamento de tarefas dos agentes)
CREATE TABLE public.ai_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('planner', 'researcher', 'writer', 'reviewer')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  input JSONB,
  output JSONB,
  tokens_used INTEGER DEFAULT 0,
  model_used TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX idx_blogs_user_id ON public.blogs(user_id);
CREATE INDEX idx_articles_blog_id ON public.articles(blog_id);
CREATE INDEX idx_articles_user_id ON public.articles(user_id);
CREATE INDEX idx_articles_status ON public.articles(status);
CREATE INDEX idx_editorial_calendar_blog_id ON public.editorial_calendar(blog_id);
CREATE INDEX idx_editorial_calendar_planned_date ON public.editorial_calendar(planned_date);
CREATE INDEX idx_ai_tasks_user_id ON public.ai_tasks(user_id);
CREATE INDEX idx_ai_tasks_status ON public.ai_tasks(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: profiles
-- ============================================
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- POLICIES: blogs
-- ============================================
CREATE POLICY "Users can view own blogs"
  ON public.blogs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own blogs"
  ON public.blogs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blogs"
  ON public.blogs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blogs"
  ON public.blogs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: articles
-- ============================================
CREATE POLICY "Users can view own articles"
  ON public.articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own articles"
  ON public.articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own articles"
  ON public.articles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own articles"
  ON public.articles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLICIES: editorial_calendar
-- ============================================
CREATE POLICY "Users can manage own calendar"
  ON public.editorial_calendar FOR ALL
  USING (
    blog_id IN (SELECT id FROM public.blogs WHERE user_id = auth.uid())
  );

-- ============================================
-- POLICIES: ai_tasks
-- ============================================
CREATE POLICY "Users can view own AI tasks"
  ON public.ai_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI tasks"
  ON public.ai_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_blogs_updated_at
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_articles_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('user-uploads', 'user-uploads', false);

-- Policies para blog-images (público para leitura)
CREATE POLICY "Public read access for blog images" ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY "Authenticated users can upload blog images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'blog-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update own blog images" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'blog-images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own blog images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'blog-images'
    AND auth.role() = 'authenticated'
  );

-- Policies para user-uploads (privado por usuário)
CREATE POLICY "Users can manage own uploads" ON storage.objects
  FOR ALL USING (
    bucket_id = 'user-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
