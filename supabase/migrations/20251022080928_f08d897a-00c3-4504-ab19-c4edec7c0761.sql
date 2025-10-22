-- Update profiles RLS policy to allow viewing profiles of users who added items to shared lists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile and shared list contributors" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id 
  OR 
  EXISTS (
    SELECT 1 
    FROM grocery_items gi
    JOIN grocery_lists gl ON gl.id = gi.list_id
    JOIN list_shares ls ON ls.list_id = gl.id
    WHERE gi.added_by = profiles.id
    AND ls.shared_with_email = get_user_email(auth.uid())
  )
  OR
  EXISTS (
    SELECT 1
    FROM grocery_items gi
    JOIN grocery_lists gl ON gl.id = gi.list_id
    WHERE gi.added_by = profiles.id
    AND gl.user_id = auth.uid()
  )
);