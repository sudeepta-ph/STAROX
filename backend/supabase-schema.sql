-- CDX Product Intelligence Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Uploaded files table
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'pdf', 'image', 'analytics')),
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  parsed_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Website analyses table
CREATE TABLE IF NOT EXISTS public.website_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  dom_structure JSONB NOT NULL,
  screenshot_url TEXT,
  ocr_text TEXT,
  analysis_status TEXT DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suggestions table
CREATE TABLE IF NOT EXISTS public.suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id UUID NOT NULL REFERENCES public.website_analyses(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ux_issue', 'ui_improvement', 'feature_addon', 'copy_refinement')),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  why TEXT,
  recommendation TEXT,
  estimated_impact TEXT,
  complexity TEXT DEFAULT 'medium' CHECK (complexity IN ('low', 'medium', 'high')),
  priority_score INTEGER DEFAULT 50,
  element_selector TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prediction reports table
CREATE TABLE IF NOT EXISTS public.prediction_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.website_analyses(id) ON DELETE SET NULL,
  conversion_prediction DECIMAL(5,2),
  bounce_rate_prediction DECIMAL(5,2),
  session_duration_prediction DECIMAL(5,2),
  revenue_projection DECIMAL(5,2),
  confidence_score INTEGER DEFAULT 70,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  opportunities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics data table
CREATE TABLE IF NOT EXISTS public.analytics_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source TEXT DEFAULT 'uploaded' CHECK (source IN ('google_analytics', 'uploaded', 'manual')),
  date_range_start DATE,
  date_range_end DATE,
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review analyses table
CREATE TABLE IF NOT EXISTS public.review_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  total_reviews INTEGER DEFAULT 0,
  sentiment_summary JSONB,
  pain_points JSONB DEFAULT '[]'::jsonb,
  feature_requests JSONB DEFAULT '[]'::jsonb,
  sentiment_clusters JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_project_id ON public.uploaded_files(project_id);
CREATE INDEX IF NOT EXISTS idx_website_analyses_project_id ON public.website_analyses(project_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_analysis_id ON public.suggestions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_project_id ON public.suggestions(project_id);
CREATE INDEX IF NOT EXISTS idx_prediction_reports_project_id ON public.prediction_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_analytics_data_project_id ON public.analytics_data(project_id);

-- Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for other tables
CREATE POLICY "Users can view own uploaded files" ON public.uploaded_files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create uploaded files" ON public.uploaded_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploaded files" ON public.uploaded_files
  FOR DELETE USING (auth.uid() = user_id);

-- Website analyses policies
CREATE POLICY "Users can view own analyses" ON public.website_analyses
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create analyses" ON public.website_analyses
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Suggestions policies
CREATE POLICY "Users can view own suggestions" ON public.suggestions
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Prediction reports policies
CREATE POLICY "Users can view own reports" ON public.prediction_reports
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Analytics data policies
CREATE POLICY "Users can view own analytics" ON public.analytics_data
  FOR SELECT USING (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create analytics" ON public.analytics_data
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM public.projects WHERE user_id = auth.uid())
  );

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_website_analyses_updated_at
  BEFORE UPDATE ON public.website_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
