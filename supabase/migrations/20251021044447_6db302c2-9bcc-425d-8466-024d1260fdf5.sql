-- Enable realtime for list_shares table so users can see shared lists immediately
ALTER PUBLICATION supabase_realtime ADD TABLE list_shares;

-- Enable realtime for grocery_lists table to see list updates
ALTER PUBLICATION supabase_realtime ADD TABLE grocery_lists;