-- Add added_by column to track who added each item
ALTER TABLE public.grocery_items 
ADD COLUMN IF NOT EXISTS added_by uuid REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_grocery_items_added_by ON public.grocery_items(added_by);