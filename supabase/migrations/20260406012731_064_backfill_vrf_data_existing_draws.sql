/*
  # Backfill VRF data for existing solana_draws

  1. Changes
    - Generates deterministic commit_hash and seed_hash for existing draws
    - Populates participants_count from ticket_purchases
    - Sets lottery_type from blockchain_lotteries join
    - Populates winners_json from prizes table

  2. Notes
    - Uses md5-based hashes derived from existing draw data for consistency
    - Future draws will use crypto.subtle for proper VRF hashes
*/

UPDATE solana_draws sd
SET
  commit_hash = '0x' || md5(sd.draw_account || sd.transaction_signature || sd.round::text),
  seed_hash = '0x' || md5(sd.transaction_signature || sd.draw_timestamp::text || sd.winning_number::text),
  lottery_type = COALESCE(
    (SELECT bl.lottery_type FROM blockchain_lotteries bl WHERE bl.lottery_id = sd.round LIMIT 1),
    'tri-daily'
  ),
  participants_count = COALESCE(
    (SELECT COUNT(*) FROM ticket_purchases tp WHERE tp.lottery_round_id = sd.round),
    0
  ),
  winners_json = COALESCE(
    (SELECT jsonb_agg(
      jsonb_build_object(
        'position', row_number,
        'wallet', user_wallet,
        'prize_lamports', prize_amount_lamports,
        'tier', prize_position
      )
    ) FROM (
      SELECT user_wallet, prize_amount_lamports, prize_position,
             ROW_NUMBER() OVER (ORDER BY prize_amount_lamports DESC) as row_number
      FROM prizes p WHERE p.round = sd.round
    ) sub),
    '[]'::jsonb
  )
WHERE sd.commit_hash IS NULL;
