/*
  # Fix Power Points Transaction Types

  1. Changes
    - Drop old constraint on transaction_type
    - Add new constraint with all valid transaction types:
      - daily_login (daily login points)
      - mission_complete (completing missions)
      - mission (legacy)
      - donation
      - purchase (ticket purchases)
      - login_streak (legacy)
      - streak_bonus (streak bonuses)
      - admin_adjustment
      - referral_bonus
      - bonus (generic bonus)
      - penalty
      - special_event

  2. Notes
    - This fixes the error when claiming daily login points
*/

-- Drop old constraint
ALTER TABLE power_points_ledger 
DROP CONSTRAINT IF EXISTS power_points_ledger_transaction_type_check;

-- Add new constraint with all types
ALTER TABLE power_points_ledger 
ADD CONSTRAINT power_points_ledger_transaction_type_check 
CHECK (transaction_type = ANY (ARRAY[
  'daily_login'::text,
  'mission_complete'::text,
  'mission'::text,
  'donation'::text,
  'purchase'::text,
  'ticket_purchase'::text,
  'login_streak'::text,
  'streak_bonus'::text,
  'admin_adjustment'::text,
  'referral_bonus'::text,
  'bonus'::text,
  'penalty'::text,
  'special_event'::text
]));
