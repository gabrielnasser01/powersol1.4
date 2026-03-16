/*
  # Auto-update referral mission progress when a referral is validated

  1. Problem
    - When a referred user makes their first purchase, the `referrals.is_validated` 
      flag is set to true by the affiliate commission trigger (migration 049).
    - However, no code updates the referrer's mission progress for referral missions
      (weekly_refer, social_invite_3/5/10/100/1000/5000).
    - This means referral missions are stuck on PENDING and never become claimable.

  2. Changes
    - Creates `update_referrer_mission_progress()` trigger function that:
      - Fires when `referrals.is_validated` changes from false to true
      - Looks up the referrer's wallet_address via affiliates -> users
      - Marks the `weekly_refer` weekly mission as eligible (if not already claimed this week)
      - Counts total validated referrals for this affiliate
      - Marks `social_invite_X` milestone missions as eligible based on count
    - Creates trigger `trg_referral_mission_on_validation` on `referrals` AFTER UPDATE

  3. Security
    - Function runs as SECURITY DEFINER to access all required tables
    - Only fires on UPDATE when is_validated changes from false to true
    - Idempotent: upserts mission progress, safe to run multiple times

  4. Important Notes
    - Uses the same wallet_address + mission_id unique index that the edge function uses
    - Only marks missions as eligible (progress.eligible = true), does NOT auto-claim
    - User still needs to manually claim from the Missions page to receive power points
    - Weekly missions respect the existing reset logic in the check_mission_reset trigger
*/

CREATE OR REPLACE FUNCTION update_referrer_mission_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_affiliate_user_id uuid;
  v_referrer_wallet text;
  v_mission_record record;
  v_existing_progress record;
  v_validated_count int;
  v_now timestamptz := now();
  v_hours_since_reset numeric;
BEGIN
  IF OLD.is_validated = true THEN
    RETURN NEW;
  END IF;

  IF NEW.is_validated <> true THEN
    RETURN NEW;
  END IF;

  SELECT a.user_id INTO v_affiliate_user_id
  FROM affiliates a
  WHERE a.id = NEW.referrer_affiliate_id;

  IF v_affiliate_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT u.wallet_address INTO v_referrer_wallet
  FROM users u
  WHERE u.id = v_affiliate_user_id;

  IF v_referrer_wallet IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT m.id, m.mission_type INTO v_mission_record
  FROM missions m
  WHERE m.mission_key = 'weekly_refer' AND m.is_active = true;

  IF v_mission_record.id IS NOT NULL THEN
    SELECT * INTO v_existing_progress
    FROM user_mission_progress
    WHERE wallet_address = v_referrer_wallet
    AND mission_id = v_mission_record.id;

    IF v_existing_progress IS NULL THEN
      INSERT INTO user_mission_progress (id, wallet_address, mission_id, completed, progress, last_reset)
      VALUES (gen_random_uuid(), v_referrer_wallet, v_mission_record.id, false, 
              jsonb_build_object('eligible', true, 'eligible_at', v_now::text), v_now)
      ON CONFLICT (wallet_address, mission_id) DO UPDATE
      SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text),
          completed = false;
    ELSIF v_existing_progress.completed = true THEN
      v_hours_since_reset := extract(epoch from (v_now - v_existing_progress.last_reset)) / 3600.0;
      IF v_hours_since_reset >= 168 THEN
        UPDATE user_mission_progress
        SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text),
            completed = false,
            last_reset = v_now
        WHERE id = v_existing_progress.id;
      END IF;
    ELSIF NOT COALESCE((v_existing_progress.progress->>'eligible')::boolean, false) THEN
      UPDATE user_mission_progress
      SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text)
      WHERE id = v_existing_progress.id;
    END IF;
  END IF;

  SELECT count(*) INTO v_validated_count
  FROM referrals r
  WHERE r.referrer_affiliate_id = NEW.referrer_affiliate_id
  AND r.is_validated = true;

  DECLARE
    v_threshold int;
    v_invite_key text;
    v_invite_mission_id uuid;
    v_invite_progress record;
    thresholds int[] := ARRAY[3, 5, 10, 100, 1000, 5000];
    keys text[] := ARRAY['social_invite_3', 'social_invite_5', 'social_invite_10', 'social_invite_100', 'social_invite_1000', 'social_invite_5000'];
  BEGIN
    FOR i IN 1..array_length(thresholds, 1) LOOP
      v_threshold := thresholds[i];
      v_invite_key := keys[i];

      IF v_validated_count >= v_threshold THEN
        SELECT m.id INTO v_invite_mission_id
        FROM missions m
        WHERE m.mission_key = v_invite_key AND m.is_active = true;

        IF v_invite_mission_id IS NOT NULL THEN
          SELECT * INTO v_invite_progress
          FROM user_mission_progress
          WHERE wallet_address = v_referrer_wallet
          AND mission_id = v_invite_mission_id;

          IF v_invite_progress IS NULL THEN
            INSERT INTO user_mission_progress (id, wallet_address, mission_id, completed, progress, last_reset)
            VALUES (gen_random_uuid(), v_referrer_wallet, v_invite_mission_id, false,
                    jsonb_build_object('eligible', true, 'eligible_at', v_now::text, 'validated_count', v_validated_count), v_now)
            ON CONFLICT (wallet_address, mission_id) DO UPDATE
            SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text, 'validated_count', v_validated_count),
                completed = false;
          ELSIF v_invite_progress.completed = false AND NOT COALESCE((v_invite_progress.progress->>'eligible')::boolean, false) THEN
            UPDATE user_mission_progress
            SET progress = jsonb_build_object('eligible', true, 'eligible_at', v_now::text, 'validated_count', v_validated_count)
            WHERE id = v_invite_progress.id;
          END IF;
        END IF;
      END IF;
    END LOOP;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_referral_mission_on_validation ON referrals;

CREATE TRIGGER trg_referral_mission_on_validation
  AFTER UPDATE ON referrals
  FOR EACH ROW
  WHEN (OLD.is_validated IS DISTINCT FROM NEW.is_validated AND NEW.is_validated = true)
  EXECUTE FUNCTION update_referrer_mission_progress();
