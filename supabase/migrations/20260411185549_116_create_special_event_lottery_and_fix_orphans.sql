/*
  # Create new special-event lottery and fix orphan tickets

  1. New Data
    - New special-event lottery (id: 20260505) with same pricing as previous (0.2 SOL)
    - Draw date: May 5, 2026 23:59:59 UTC
    - Max tickets: 7500

  2. Fixes
    - Links 2 orphan ticket_purchases (NULL lottery_round_id) to the new lottery
    - Updates prize_pool to reflect the linked tickets

  3. Important Notes
    - Orphan tickets belong to wallets 8XFT... and E1qK...
    - Each paid 0.2 SOL for special-event tickets with no active round
    - After linking, prize_pool = 2 * 200_000_000 = 400_000_000 lamports (0.4 SOL)
*/

INSERT INTO blockchain_lotteries (
  lottery_type,
  lottery_id,
  ticket_price,
  max_tickets,
  draw_timestamp,
  prize_pool,
  is_drawn
)
SELECT
  'special-event',
  20260505,
  200000000,
  7500,
  EXTRACT(EPOCH FROM TIMESTAMP '2026-05-05 23:59:59 UTC')::bigint,
  0,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM blockchain_lotteries
  WHERE lottery_type = 'special-event' AND lottery_id = 20260505
);

UPDATE ticket_purchases
SET lottery_round_id = 20260505
WHERE lottery_type = 'special-event'
  AND lottery_round_id IS NULL;

UPDATE blockchain_lotteries
SET prize_pool = (
  SELECT COALESCE(SUM(quantity), 0) * 200000000
  FROM ticket_purchases
  WHERE lottery_type = 'special-event'
    AND lottery_round_id = 20260505
)
WHERE lottery_type = 'special-event'
  AND lottery_id = 20260505;
