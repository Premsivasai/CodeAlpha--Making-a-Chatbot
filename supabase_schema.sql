-- Supabase database schema for AI Shopping Platform

-- 1. PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile." ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create a profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. USER PREFERENCES Table
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    preferred_brands TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    budget_range JSONB DEFAULT '{"min": null, "max": null}'::JSONB NOT NULL,
    favorite_categories TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own preferences." ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);


-- 3. SAVED PRODUCTS Table
CREATE TABLE IF NOT EXISTS public.saved_products (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for saved_products
ALTER TABLE public.saved_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own saved products." ON public.saved_products
    FOR ALL USING (auth.uid() = user_id);


-- 4. TRACKED PRODUCTS Table
CREATE TABLE IF NOT EXISTS public.tracked_products (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT NOT NULL,
    target_price NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for tracked_products
ALTER TABLE public.tracked_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tracked products." ON public.tracked_products
    FOR ALL USING (auth.uid() = user_id);


-- 5. SEARCH HISTORY Table
CREATE TABLE IF NOT EXISTS public.search_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    query TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for search_history
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own search history." ON public.search_history
    FOR ALL USING (auth.uid() = user_id);


-- 6. AI CONVERSATIONS Table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for ai_conversations
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own AI conversations." ON public.ai_conversations
    FOR ALL USING (auth.uid() = user_id);
