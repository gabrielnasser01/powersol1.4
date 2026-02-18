/*
  # Seed Special Event lottery in blockchain_lotteries

  1. New Data
    - Inserts a `special-event` lottery entry (Easter Special)
    - lottery_id: 20260405 (date-based ID matching April 5, 2026)
    - ticket_price: 200000000 lamports (0.2 SOL)
    - max_tickets: 7500
    - draw_timestamp: 1775679540 (April 5, 2026 at 23:59:00 UTC)
    - is_drawn: false (not yet drawn)

  2. Notes
    - This fills the gap where special-event was missing from the blockchain_lotteries table
    - The lottery_type 'special-event' is already accepted by the prizes table constraint
    - Uses IF NOT EXISTS pattern via ON CONFLICT to prevent duplicate inserts
*/

INSERT INTO blockchain_lotteries (lottery_id, lottery_type, ticket_price, max_tickets, draw_timestamp, is_drawn, prize_pool)
VALUES (
  20260405,
  'special-event',
  200000000,
  7500,
  EXTRACT(EPOCH FROM TIMESTAMP '2026-04-05 23:59:00 UTC')::bigint,
  false,
  0
)
ON CONFLICT DO NOTHING;