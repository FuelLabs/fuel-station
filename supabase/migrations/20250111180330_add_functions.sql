CREATE OR REPLACE FUNCTION get_random_next_record()
RETURNS TABLE (LIKE accounts) AS $$
 SELECT * FROM accounts 
 WHERE (is_locked = false)
 AND needs_funding = false;
$$ LANGUAGE sql;