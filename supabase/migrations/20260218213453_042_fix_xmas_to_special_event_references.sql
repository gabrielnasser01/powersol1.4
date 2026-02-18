/*
  # Fix remaining 'xmas' references to 'special-event' / 'special_event'

  1. Data Changes
    - Update `missions` table: change 'xmas' to 'special_event' in the
      `activity_buy_all_lotteries` mission requirements JSON
  2. Function Changes
    - Replace `get_ticket_price_lamports` function: add 'special-event' case (0.2 SOL),
      remove legacy 'xmas' and 'halloween' cases
  3. Notes
    - The on-chain Anchor program still uses 'xmas' as a PDA seed internally,
      but all application-layer and database-layer references are now standardized
      to 'special-event' (hyphenated for DB/frontend) and 'special_event' / 'SPECIAL_EVENT'
      (underscored for backend enums and mission keys)
*/

UPDATE missions
SET requirements = jsonb_set(
  requirements,
  '{lottery_types}',
  '["tri_daily", "jackpot", "special_event", "grand_prize"]'::jsonb
)
WHERE mission_key = 'activity_buy_all_lotteries'
  AND requirements::text LIKE '%xmas%';

CREATE OR REPLACE FUNCTION get_ticket_price_lamports(p_lottery_type text)
RETURNS bigint
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_lottery_type
    WHEN 'tri-daily' THEN RETURN 100000000;
    WHEN 'jackpot' THEN RETURN 200000000;
    WHEN 'grand-prize' THEN RETURN 330000000;
    WHEN 'special-event' THEN RETURN 200000000;
    ELSE RETURN 100000000;
  END CASE;
END;
$$;