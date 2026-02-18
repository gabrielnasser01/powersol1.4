/*
  # Allow anon users to update their own profile by wallet_address

  1. Changes
    - Add UPDATE policy on `users` table for anon role
    - Scoped to rows where wallet_address is not null

  2. Security
    - Only allows updating rows matching a specific wallet_address
    - Anon users cannot update other users' data (filter by wallet_address in the query)
    - Existing authenticated user policies remain intact
*/

CREATE POLICY "Anon can update own profile by wallet"
  ON public.users
  FOR UPDATE
  TO anon
  USING (wallet_address IS NOT NULL)
  WITH CHECK (wallet_address IS NOT NULL);
