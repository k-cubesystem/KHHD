-- Create a secure function to fetch shared analysis records
-- This allows access without exposing the entire table to public RLS
CREATE OR REPLACE FUNCTION get_shared_analysis_record(token_input text)
RETURNS SETOF analysis_history
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM analysis_history
  WHERE share_token = token_input
  LIMIT 1;
$$;

-- Grant execution rights to all users (including anonymous for public sharing)
GRANT EXECUTE ON FUNCTION get_shared_analysis_record(text) TO anon, authenticated, service_role;
