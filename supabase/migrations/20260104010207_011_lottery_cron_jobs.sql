/*
  # Lottery Automatic Draw Cron Jobs

  1. Extensions Enabled
    - `pg_cron` - Job scheduler for PostgreSQL
    - `pg_net` - Async HTTP requests from PostgreSQL

  2. Cron Jobs Created
    - `lottery-draw-check` - Runs every 5 minutes to check for lotteries ready to draw
    - Calls the `lottery-draw` edge function automatically

  3. Logging Table
    - `lottery_cron_logs` - Stores execution history of cron jobs

  4. Security
    - RLS enabled on logs table
    - Only service role can insert logs
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

CREATE TABLE IF NOT EXISTS lottery_cron_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  executed_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'started',
  response_status int,
  response_body text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE lottery_cron_logs IS 'Audit log for lottery cron job executions';

ALTER TABLE lottery_cron_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lottery_cron_logs' AND policyname = 'Service role can manage cron logs'
  ) THEN
    CREATE POLICY "Service role can manage cron logs"
      ON lottery_cron_logs
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'lottery_cron_logs' AND policyname = 'Authenticated users can view cron logs'
  ) THEN
    CREATE POLICY "Authenticated users can view cron logs"
      ON lottery_cron_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lottery_cron_logs_executed_at 
  ON lottery_cron_logs(executed_at DESC);

CREATE INDEX IF NOT EXISTS idx_lottery_cron_logs_job_name 
  ON lottery_cron_logs(job_name);

CREATE OR REPLACE FUNCTION execute_lottery_draw()
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
  VALUES ('lottery-draw-check', 'started')
  RETURNING id INTO v_log_id;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/lottery-draw/execute',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) INTO v_request_id;

  UPDATE lottery_cron_logs
  SET status = 'completed',
      response_body = 'Request sent with ID: ' || COALESCE(v_request_id::text, 'null')
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
  'lottery-draw-check',
  '*/5 * * * *',
  $$SELECT execute_lottery_draw()$$
);

CREATE OR REPLACE FUNCTION manual_lottery_draw()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  PERFORM execute_lottery_draw();
  
  SELECT jsonb_build_object(
    'success', true,
    'message', 'Lottery draw triggered manually',
    'timestamp', now()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

INSERT INTO lottery_cron_logs (job_name, status, response_body)
VALUES ('system', 'completed', 'Cron job system initialized successfully');
