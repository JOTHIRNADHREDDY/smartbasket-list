-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create grocery_lists table
CREATE TABLE public.grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  budget DECIMAL(10, 2) DEFAULT 0,
  shopping_date DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;

-- Grocery lists policies
CREATE POLICY "Users can view their own lists"
  ON public.grocery_lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lists"
  ON public.grocery_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists"
  ON public.grocery_lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
  ON public.grocery_lists FOR DELETE
  USING (auth.uid() = user_id);

-- Create grocery_items table
CREATE TABLE public.grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES public.grocery_lists(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1 NOT NULL,
  price_per_unit DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  category TEXT,
  completed BOOLEAN DEFAULT false NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;

-- Grocery items policies
CREATE POLICY "Users can view items from their lists"
  ON public.grocery_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.grocery_lists
    WHERE grocery_lists.id = grocery_items.list_id
    AND grocery_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users can create items in their lists"
  ON public.grocery_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.grocery_lists
    WHERE grocery_lists.id = grocery_items.list_id
    AND grocery_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users can update items in their lists"
  ON public.grocery_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.grocery_lists
    WHERE grocery_lists.id = grocery_items.list_id
    AND grocery_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their lists"
  ON public.grocery_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.grocery_lists
    WHERE grocery_lists.id = grocery_items.list_id
    AND grocery_lists.user_id = auth.uid()
  ));

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grocery_lists_updated_at
  BEFORE UPDATE ON public.grocery_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grocery_items_updated_at
  BEFORE UPDATE ON public.grocery_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();