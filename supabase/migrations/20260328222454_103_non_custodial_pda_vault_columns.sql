/*
  # Non-Custodial PDA Vault System - Database Updates

  This migration adds columns to support the new non-custodial PDA vault
  prize claim system where users sign their own claim transactions.

  1. Modified Tables
    - `prizes`
      - `claim_method` (text) - Indicates how the prize was claimed: 'on_chain' for new PDA vault claims, 'legacy' for old custodial claims
    - `solana_draws`
      - `vrf_register_signatures` (text[]) - Array of transaction signatures from registering winners on-chain after VRF draw

  2. Important Notes
    - No data is dropped or modified
    - Existing prizes default to 'legacy' claim method
    - New prizes created by the updated lottery-draw function will have 'on_chain' claim method
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prizes' AND column_name = 'claim_method'
  ) THEN
    ALTER TABLE prizes ADD COLUMN claim_method text DEFAULT 'legacy';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solana_draws' AND column_name = 'vrf_register_signatures'
  ) THEN
    ALTER TABLE solana_draws ADD COLUMN vrf_register_signatures text[] DEFAULT '{}';
  END IF;
END $$;
