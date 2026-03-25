/*
  # Backfill Dev Treasury Transfers

  1. Changes
    - Populates dev_treasury_transfers from all existing ticket_purchases
    - Calculates 30% of each ticket's total_sol as lamports
    - Only inserts for ticket_purchases not already in dev_treasury_transfers

  2. Important Notes
    - Safe to run multiple times (skips already-backfilled records)
    - Preserves original created_at timestamps from ticket_purchases
*/

INSERT INTO dev_treasury_transfers (
  ticket_purchase_id,
  wallet_address,
  lottery_type,
  amount_lamports,
  transaction_signature,
  created_at
)
SELECT
  tp.id,
  tp.wallet_address,
  tp.lottery_type,
  floor(tp.total_sol * 1000000000 * 0.30)::bigint,
  tp.transaction_signature,
  tp.created_at
FROM ticket_purchases tp
WHERE NOT EXISTS (
  SELECT 1 FROM dev_treasury_transfers dtt
  WHERE dtt.ticket_purchase_id = tp.id
)
AND tp.total_sol > 0;
