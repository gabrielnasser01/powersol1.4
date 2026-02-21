/*
  # Add lottery round tracking to ticket purchases

  1. Modified Tables
    - `ticket_purchases`
      - Add `lottery_round_id` (bigint, nullable) - references the lottery_id from blockchain_lotteries
      - Add `is_drawn` (boolean, default false) - denormalized flag indicating if this ticket's lottery has been drawn

  2. Changes
    - Links each ticket purchase to a specific lottery round
    - Allows the frontend to determine ticket status (active vs expired/drawn)
    - Backfills existing purchases by matching lottery_type and created_at to the closest lottery round

  3. Important Notes
    - Existing purchases will be backfilled with the best-matching lottery round
    - The is_drawn flag will be synced based on the blockchain_lotteries table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_purchases' AND column_name = 'lottery_round_id'
  ) THEN
    ALTER TABLE ticket_purchases ADD COLUMN lottery_round_id bigint;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_purchases' AND column_name = 'is_drawn'
  ) THEN
    ALTER TABLE ticket_purchases ADD COLUMN is_drawn boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ticket_purchases_lottery_round 
  ON ticket_purchases(lottery_round_id);

CREATE INDEX IF NOT EXISTS idx_ticket_purchases_is_drawn 
  ON ticket_purchases(is_drawn);

UPDATE ticket_purchases tp
SET lottery_round_id = (
  SELECT bl.lottery_id
  FROM blockchain_lotteries bl
  WHERE bl.lottery_type = tp.lottery_type
    AND bl.draw_timestamp >= EXTRACT(EPOCH FROM tp.created_at)
  ORDER BY bl.draw_timestamp ASC
  LIMIT 1
)
WHERE tp.lottery_round_id IS NULL;

UPDATE ticket_purchases tp
SET lottery_round_id = (
  SELECT bl.lottery_id
  FROM blockchain_lotteries bl
  WHERE bl.lottery_type = tp.lottery_type
  ORDER BY bl.draw_timestamp DESC
  LIMIT 1
)
WHERE tp.lottery_round_id IS NULL;

UPDATE ticket_purchases tp
SET is_drawn = true
FROM blockchain_lotteries bl
WHERE tp.lottery_round_id = bl.lottery_id
  AND tp.lottery_type = bl.lottery_type
  AND bl.is_drawn = true;

CREATE OR REPLACE FUNCTION sync_ticket_drawn_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_drawn = true AND (OLD.is_drawn = false OR OLD.is_drawn IS NULL) THEN
    UPDATE ticket_purchases
    SET is_drawn = true
    WHERE lottery_round_id = NEW.lottery_id
      AND lottery_type = NEW.lottery_type
      AND is_drawn = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ticket_drawn_status ON blockchain_lotteries;

CREATE TRIGGER trg_sync_ticket_drawn_status
  AFTER UPDATE OF is_drawn ON blockchain_lotteries
  FOR EACH ROW
  EXECUTE FUNCTION sync_ticket_drawn_status();
