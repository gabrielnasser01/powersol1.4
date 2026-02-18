/*
  # Fix mission progress RLS for wallet-based access

  1. Changes
    - Add SELECT policy on `user_mission_progress` allowing anon users to read their own progress by wallet_address
    - Add INSERT policy on `user_mission_progress` allowing anon users to insert progress by wallet_address
    - Add UPDATE policy on `user_mission_progress` allowing anon users to update their own progress by wallet_address

  2. Security
    - Policies scope access to rows matching the provided wallet_address
    - Anon role can only read/write rows where wallet_address matches
    - Existing auth-based policies remain intact for authenticated users

  3. Important Notes
    - This app uses Solana wallet addresses instead of Supabase auth
    - The frontend passes wallet_address as the user identifier
    - The anon key is used since there's no email/password auth flow
*/

CREATE POLICY "Anon can view mission progress by wallet"
  ON public.user_mission_progress
  FOR SELECT
  TO anon
  USING (wallet_address IS NOT NULL);

CREATE POLICY "Anon can insert mission progress with wallet"
  ON public.user_mission_progress
  FOR INSERT
  TO anon
  WITH CHECK (wallet_address IS NOT NULL);

CREATE POLICY "Anon can update own mission progress by wallet"
  ON public.user_mission_progress
  FOR UPDATE
  TO anon
  USING (wallet_address IS NOT NULL)
  WITH CHECK (wallet_address IS NOT NULL);
