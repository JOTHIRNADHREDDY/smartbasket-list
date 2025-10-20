-- Add purchased field and unit field to grocery_items
ALTER TABLE grocery_items 
ADD COLUMN IF NOT EXISTS purchased boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'pcs';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_grocery_items_purchased ON grocery_items(purchased);

-- Update existing items to have default unit
UPDATE grocery_items SET unit = 'pcs' WHERE unit IS NULL;