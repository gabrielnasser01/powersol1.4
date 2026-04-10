/*
  # Add Twitter/X platform support to social accounts

  1. Changes
    - Update CHECK constraint on `user_social_accounts` table to include 'twitter'
    - Update `link_social_account` RPC function to accept 'twitter' as valid platform

  2. Why
    - The original schema only allowed discord, youtube, tiktok
    - Twitter/X OAuth flow works but saving fails because both the constraint and the RPC reject 'twitter'
*/

ALTER TABLE user_social_accounts
  DROP CONSTRAINT IF EXISTS user_social_accounts_platform_check;

ALTER TABLE user_social_accounts
  ADD CONSTRAINT user_social_accounts_platform_check
  CHECK (platform = ANY (ARRAY['discord'::text, 'youtube'::text, 'tiktok'::text, 'twitter'::text]));

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
AS $$
DECLARE
  v_result json;
BEGIN
  IF p_platform NOT IN ('discord', 'youtube', 'tiktok', 'twitter') THEN
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
