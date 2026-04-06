/*
  # Fix constraints and restore missing functions

  1. Constraint Fixes
    - `ticket_purchases.lottery_type`: Add 'special_event' to allowed values
    - `prizes.lottery_type`: Add 'special-event' to allowed values

  2. Restored Functions
    - `get_ticket_price_lamports` - Returns ticket price in lamports for each lottery type

  3. Notes
    - Constraints still keep old values (xmas, halloween) for backward compatibility
      with any existing data, but add the new standard values
    - The edge functions and frontend use 'special_event' / 'special-event' format
*/

-- Fix ticket_purchases lottery_type constraint to include special_event
ALTER TABLE ticket_purchases DROP CONSTRAINT IF EXISTS ticket_purchases_lottery_type_check;
ALTER TABLE ticket_purchases ADD CONSTRAINT ticket_purchases_lottery_type_check
  CHECK (lottery_type = ANY (ARRAY[
    'tri_daily', 'jackpot', 'xmas', 'grand_prize', 'special_event'
  ]));

-- Fix prizes lottery_type constraint to include special-event
ALTER TABLE prizes DROP CONSTRAINT IF EXISTS prizes_lottery_type_check;
ALTER TABLE prizes ADD CONSTRAINT prizes_lottery_type_check
  CHECK (lottery_type = ANY (ARRAY[
    'tri-daily', 'halloween', 'jackpot', 'grand-prize', 'special-event'
  ]));

-- Restore get_ticket_price_lamports
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
