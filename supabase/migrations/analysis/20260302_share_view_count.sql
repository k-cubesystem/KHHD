-- Add share_view_count column to analysis_history for view tracking
ALTER TABLE analysis_history
  ADD COLUMN IF NOT EXISTS share_view_count integer NOT NULL DEFAULT 0;

-- Update the RPC to also increment the view counter on each public fetch
CREATE OR REPLACE FUNCTION get_shared_analysis_record(token_input text)
RETURNS SETOF analysis_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment view counter (best-effort, non-blocking)
  UPDATE analysis_history
  SET share_view_count = share_view_count + 1
  WHERE share_token = token_input;

  RETURN QUERY
  SELECT *
  FROM analysis_history
  WHERE share_token = token_input
  LIMIT 1;
END;
$$;

-- Grant execution rights to all users (including anonymous for public sharing)
GRANT EXECUTE ON FUNCTION get_shared_analysis_record(text) TO anon, authenticated, service_role;
