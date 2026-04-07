-- Add is_free flag to pantry_items for items received as gifts
ALTER TABLE pantry_items ADD COLUMN is_free BOOLEAN DEFAULT FALSE;
