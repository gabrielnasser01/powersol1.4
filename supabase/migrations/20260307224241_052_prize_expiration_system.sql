/*
  # Prize Expiration System

  1. Changes
    - Add `expires_at` column to `prizes` table (timestamptz, nullable)
    - Add `expired` column to `prizes` table (boolean, default false)
    - When set, prizes that are not claimed before this deadline become expired
    - Expired prize amounts are accumulated back into the next lottery round's pool

  2. New Columns
    - `prizes.expires_at` (timestamptz, nullable) - deadline for claiming, set to the next draw date of same lottery type
    - `prizes.expired` (boolean, default false) - marks prize as expired after sweep

  3. New/Updated Functions
    - `sweep_expired_prizes(p_lottery_type text)` - marks unclaimed expired prizes and returns total swept amount
    - Updated `get_unclaimed_prizes` - now also returns expires_at and filters out expired prizes

  4. Important Notes
    - Existing prizes without expires_at are unaffected (no deadline)
    - Only new prizes created after this migration will have an expiration deadline
    - The sweep function is called during each lottery draw to reclaim expired amounts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prizes' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE prizes ADD COLUMN expires_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prizes' AND column_name = 'expired'
  ) THEN
    ALTER TABLE prizes ADD COLUMN expired boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_prizes_expires_at ON prizes (expires_at) WHERE expires_at IS NOT NULL AND claimed = false AND expired = false;

DROP FUNCTION IF EXISTS get_unclaimed_prizes(text);

CREATE FUNCTION get_unclaimed_prizes(p_wallet text)
RETURNS TABLE (
  prize_id uuid,
  lottery_type text,
  lottery_round bigint,
  tier smallint,
  amount_lamports bigint,
  won_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as prize_id,
    p.lottery_type,
    p.round as lottery_round,
    CASE
      WHEN p.prize_position = 'Tier 1' THEN 1::smallint
      WHEN p.prize_position = 'Tier 2' THEN 2::smallint
      WHEN p.prize_position = 'Tier 3' THEN 3::smallint
      WHEN p.prize_position = 'Tier 4' THEN 4::smallint
      WHEN p.prize_position = 'Tier 5' THEN 5::smallint
      ELSE 0::smallint
    END as tier,
    p.prize_amount_lamports as amount_lamports,
    p.created_at as won_at,
    p.expires_at
  FROM prizes p
  WHERE p.user_wallet = p_wallet
    AND p.claimed = false
    AND p.expired = false
    AND p.prize_amount_lamports > 0
    AND (p.expires_at IS NULL OR p.expires_at > now());
END;
$$;

CREATE OR REPLACE FUNCTION sweep_expired_prizes(p_lottery_type text)
RETURNS TABLE (
  swept_count int,
  total_swept_lamports bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_swept_count int := 0;
  v_total_lamports bigint := 0;
BEGIN
  WITH expired_prizes AS (
    UPDATE prizes
    SET expired = true,
        updated_at = now()
    WHERE claimed = false
      AND expired = false
      AND expires_at IS NOT NULL
      AND expires_at <= now()
      AND lottery_type = p_lottery_type
    RETURNING prize_amount_lamports
  )
  SELECT
    count(*)::int,
    coalesce(sum(prize_amount_lamports), 0)::bigint
  INTO v_swept_count, v_total_lamports
  FROM expired_prizes;

  RETURN QUERY SELECT v_swept_count, v_total_lamports;
END;
$$;
