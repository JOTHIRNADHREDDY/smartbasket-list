-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own and shared lists" ON grocery_lists;
DROP POLICY IF EXISTS "Users can view items from their own and shared lists" ON grocery_items;
DROP POLICY IF EXISTS "Users can create items in their own and editable shared lists" ON grocery_items;
DROP POLICY IF EXISTS "Users can update items in their own and editable shared lists" ON grocery_items;
DROP POLICY IF EXISTS "Users can delete items from their own and editable shared lists" ON grocery_items;
DROP POLICY IF EXISTS "Users can view shares for their lists" ON list_shares;

-- Create security definer function to get current user email
CREATE OR REPLACE FUNCTION public.get_user_email(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM auth.users WHERE id = _user_id;
$$;

-- Fix grocery_lists SELECT policy
CREATE POLICY "Users can view their own and shared lists"
ON grocery_lists
FOR SELECT
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM list_shares
    WHERE list_shares.list_id = grocery_lists.id
    AND list_shares.shared_with_email = public.get_user_email(auth.uid())
  )
);

-- Fix grocery_items SELECT policy
CREATE POLICY "Users can view items from their own and shared lists"
ON grocery_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE grocery_lists.id = grocery_items.list_id
    AND (
      grocery_lists.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM list_shares
        WHERE list_shares.list_id = grocery_lists.id
        AND list_shares.shared_with_email = public.get_user_email(auth.uid())
      )
    )
  )
);

-- Fix grocery_items INSERT policy
CREATE POLICY "Users can create items in their own and editable shared lists"
ON grocery_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE grocery_lists.id = grocery_items.list_id
    AND (
      grocery_lists.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM list_shares
        WHERE list_shares.list_id = grocery_lists.id
        AND list_shares.shared_with_email = public.get_user_email(auth.uid())
        AND list_shares.permission = 'edit'
      )
    )
  )
);

-- Fix grocery_items UPDATE policy
CREATE POLICY "Users can update items in their own and editable shared lists"
ON grocery_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE grocery_lists.id = grocery_items.list_id
    AND (
      grocery_lists.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM list_shares
        WHERE list_shares.list_id = grocery_lists.id
        AND list_shares.shared_with_email = public.get_user_email(auth.uid())
        AND list_shares.permission = 'edit'
      )
    )
  )
);

-- Fix grocery_items DELETE policy
CREATE POLICY "Users can delete items from their own and editable shared lists"
ON grocery_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM grocery_lists
    WHERE grocery_lists.id = grocery_items.list_id
    AND (
      grocery_lists.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM list_shares
        WHERE list_shares.list_id = grocery_lists.id
        AND list_shares.shared_with_email = public.get_user_email(auth.uid())
        AND list_shares.permission = 'edit'
      )
    )
  )
);

-- Fix list_shares SELECT policy
CREATE POLICY "Users can view shares for their lists"
ON list_shares
FOR SELECT
USING (
  shared_by = auth.uid()
  OR shared_with_email = public.get_user_email(auth.uid())
);