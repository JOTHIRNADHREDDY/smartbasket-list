-- Create list_shares table for family sharing
CREATE TABLE public.list_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  shared_with_email TEXT NOT NULL,
  shared_by UUID NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view', -- 'view' or 'edit'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(list_id, shared_with_email)
);

-- Enable RLS
ALTER TABLE public.list_shares ENABLE ROW LEVEL SECURITY;

-- Policies for list_shares
CREATE POLICY "Users can view shares for their lists"
ON public.list_shares
FOR SELECT
USING (
  shared_by = auth.uid() OR 
  shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

CREATE POLICY "Users can create shares for their lists"
ON public.list_shares
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM grocery_lists 
    WHERE id = list_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete shares they created"
ON public.list_shares
FOR DELETE
USING (shared_by = auth.uid());

-- Update grocery_lists policies to include shared lists
DROP POLICY IF EXISTS "Users can view their own lists" ON public.grocery_lists;
CREATE POLICY "Users can view their own and shared lists"
ON public.grocery_lists
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM list_shares 
    WHERE list_id = id AND shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Update grocery_items policies to include shared lists
DROP POLICY IF EXISTS "Users can view items from their lists" ON public.grocery_items;
CREATE POLICY "Users can view items from their own and shared lists"
ON public.grocery_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM grocery_lists 
    WHERE id = list_id AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM list_shares 
        WHERE list_id = grocery_lists.id AND shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
      )
    )
  )
);

-- Allow editing items in shared lists with edit permission
DROP POLICY IF EXISTS "Users can update items in their lists" ON public.grocery_items;
CREATE POLICY "Users can update items in their own and editable shared lists"
ON public.grocery_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM grocery_lists 
    WHERE id = list_id AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM list_shares 
        WHERE list_id = grocery_lists.id 
        AND shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND permission = 'edit'
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can create items in their lists" ON public.grocery_items;
CREATE POLICY "Users can create items in their own and editable shared lists"
ON public.grocery_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM grocery_lists 
    WHERE id = list_id AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM list_shares 
        WHERE list_id = grocery_lists.id 
        AND shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND permission = 'edit'
      )
    )
  )
);

DROP POLICY IF EXISTS "Users can delete items from their lists" ON public.grocery_items;
CREATE POLICY "Users can delete items from their own and editable shared lists"
ON public.grocery_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM grocery_lists 
    WHERE id = list_id AND (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM list_shares 
        WHERE list_id = grocery_lists.id 
        AND shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND permission = 'edit'
      )
    )
  )
);