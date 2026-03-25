/*
  # Dev Treasury Auto-Record Trigger

  1. New Function
    - `record_dev_treasury_on_purchase()` - SECURITY DEFINER trigger function
    - Fires AFTER INSERT on ticket_purchases
    - Calculates 30% of total_sol as dev treasury allocation
    - Inserts into dev_treasury_transfers

  2. Important Notes
    - Uses SECURITY DEFINER to bypass RLS for the insert
    - Only fires on new ticket purchases (AFTER INSERT)
    - Calculates: floor(total_sol * 1e9 * 0.30) lamports
*/

CREATE OR REPLACE FUNCTION record_dev_treasury_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_treasury_lamports bigint;
  v_lamports_per_sol constant bigint := 1000000000;
  v_treasury_rate constant numeric := 0.30;
BEGIN
  IF NEW.total_sol IS NULL OR NEW.total_sol <= 0 THEN
    RETURN NEW;
  END IF;

  v_treasury_lamports := floor(NEW.total_sol * v_lamports_per_sol * v_treasury_rate)::bigint;

  INSERT INTO dev_treasury_transfers (
    ticket_purchase_id,
    wallet_address,
    lottery_type,
    amount_lamports,
    transaction_signature,
    created_at
  ) VALUES (
    NEW.id,
    NEW.wallet_address,
    NEW.lottery_type,
    v_treasury_lamports,
    NEW.transaction_signature,
    NEW.created_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_dev_treasury ON ticket_purchases;

CREATE TRIGGER trg_record_dev_treasury
  AFTER INSERT ON ticket_purchases
  FOR EACH ROW
  EXECUTE FUNCTION record_dev_treasury_on_purchase();
