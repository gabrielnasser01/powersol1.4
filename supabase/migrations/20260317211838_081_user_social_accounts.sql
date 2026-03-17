/*
  # User Social Accounts

  1. New Tables
    - `user_social_accounts`
      - `id` (uuid, primary key)
      - `wallet_address` (text, not null) - links to user wallet
      - `platform` (text, not null) - discord, youtube, tiktok
      - `platform_user_id` (text, not null) - the user's ID on that platform
      - `platform_username` (text) - display name on that platform
      - `platform_avatar_url` (text) - avatar from that platform
      - `linked_at` (timestamptz) - when the account was linked
      - `updated_at` (timestamptz)
    - Unique constraint on (wallet_address, platform) so each wallet can only link one account per platform

  2. Security
    - Enable RLS on `user_social_accounts` table
    - Users can read their own linked accounts
    - Users can insert their own linked accounts
    - Users can update their own linked accounts
    - Users can delete their own linked accounts
*/

CREATE TABLE IF NOT EXISTS user_social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('discord', 'youtube', 'tiktok')),
  platform_user_id text NOT NULL,
  platform_username text DEFAULT '',
  platform_avatar_url text DEFAULT '',
  linked_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_wallet_platform UNIQUE (wallet_address, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_accounts_wallet ON user_social_accounts(wallet_address);
CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON user_social_accounts(platform);

ALTER TABLE user_social_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own social accounts"
  ON user_social_accounts
  FOR SELECT
  TO authenticated
  USING (wallet_address = (
    SELECT wallet_address FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert own social accounts"
  ON user_social_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (wallet_address = (
    SELECT wallet_address FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update own social accounts"
  ON user_social_accounts
  FOR UPDATE
  TO authenticated
  USING (wallet_address = (
    SELECT wallet_address FROM users WHERE id = auth.uid()
  ))
  WITH CHECK (wallet_address = (
    SELECT wallet_address FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete own social accounts"
  ON user_social_accounts
  FOR DELETE
  TO authenticated
  USING (wallet_address = (
    SELECT wallet_address FROM users WHERE id = auth.uid()
  ));

-- Service-role RPC to link/unlink social accounts (bypasses RLS for wallet-based auth)
CREATE OR REPLACE FUNCTION link_social_account(
  p_wallet_address text,
  p_platform text,
  p_platform_user_id text,
  p_platform_username text DEFAULT '',
  p_platform_avatar_url text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  IF p_platform NOT IN ('discord', 'youtube', 'tiktok') THEN
    RETURN json_build_object('error', 'Invalid platform');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE wallet_address = p_wallet_address) THEN
    RETURN json_build_object('error', 'User not found');
  END IF;

  INSERT INTO user_social_accounts (wallet_address, platform, platform_user_id, platform_username, platform_avatar_url)
  VALUES (p_wallet_address, p_platform, p_platform_user_id, p_platform_username, p_platform_avatar_url)
  ON CONFLICT (wallet_address, platform)
  DO UPDATE SET
    platform_user_id = EXCLUDED.platform_user_id,
    platform_username = EXCLUDED.platform_username,
    platform_avatar_url = EXCLUDED.platform_avatar_url,
    updated_at = now()
  RETURNING to_json(user_social_accounts.*) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION unlink_social_account(
  p_wallet_address text,
  p_platform text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_social_accounts
    WHERE wallet_address = p_wallet_address AND platform = p_platform
  ) THEN
    RETURN json_build_object('error', 'Account not linked');
  END IF;

  DELETE FROM user_social_accounts
  WHERE wallet_address = p_wallet_address AND platform = p_platform;

  RETURN json_build_object('success', true, 'platform', p_platform);
END;
$$;

CREATE OR REPLACE FUNCTION get_user_social_accounts(p_wallet_address text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_agg(row_to_json(sa))
  INTO v_result
  FROM user_social_accounts sa
  WHERE sa.wallet_address = p_wallet_address;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;
