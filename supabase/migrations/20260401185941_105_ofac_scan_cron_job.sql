/*
  # Automated OFAC Scan Cron Job (30-day cycle)

  1. New Function
    - `execute_ofac_scan()` - Calls the ofac-scan edge function via pg_net
    - Logs execution to lottery_cron_logs for audit trail

  2. Cron Job
    - `ofac-scan-30d` - Runs on the 1st of every month at 03:00 UTC
    - Scans all registered users against OFAC SDN sanctions list
    - Flagged wallets get automatic critical warnings

  3. Notes
    - Uses existing lottery_cron_logs table for execution logging
    - Edge function handles batch processing and deduplication of warnings
*/

CREATE OR REPLACE FUNCTION execute_ofac_scan()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url text := 'https://xdcfwggwoutumhkcpkej.supabase.co';
  v_request_id bigint;
  v_log_id uuid;
BEGIN
  INSERT INTO lottery_cron_logs (job_name, status)
  VALUES ('ofac-scan-30d', 'started')
  RETURNING id INTO v_log_id;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/ofac-scan',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) INTO v_request_id;

  UPDATE lottery_cron_logs
  SET status = 'completed',
      response_body = 'OFAC scan request sent with ID: ' || COALESCE(v_request_id::text, 'null')
  WHERE id = v_log_id;

EXCEPTION WHEN OTHERS THEN
  IF v_log_id IS NOT NULL THEN
    UPDATE lottery_cron_logs
    SET status = 'error',
        error_message = SQLERRM
    WHERE id = v_log_id;
  END IF;
END;
$$;

SELECT cron.schedule(
  'ofac-scan-30d',
  '0 3 1 * *',
  $$SELECT execute_ofac_scan()$$
);

INSERT INTO lottery_cron_logs (job_name, status, response_body)
VALUES ('ofac-scan-30d', 'completed', 'OFAC scan cron job initialized - runs 1st of every month at 03:00 UTC');
