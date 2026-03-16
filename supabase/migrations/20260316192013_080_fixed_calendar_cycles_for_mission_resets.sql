/*
  # Switch mission resets to fixed calendar cycles (GMT)

  1. Changes
    - Updates the `update_referrer_mission_progress()` trigger function
    - Daily missions: cycle runs from Monday 00:00:01 GMT to Sunday 23:59:59 GMT
      (daily reset at 00:00:01 GMT each day)
    - Weekly missions: cycle runs from Monday 00:00:01 GMT to Sunday 23:59:59 GMT
    - Replaces the old rolling 168-hour window with a fixed Monday-to-Sunday check
    - Uses `completed_at` (or `last_reset` fallback) to determine if mission 
      was already completed in the current cycle

  2. Important Notes
    - All times are in GMT/UTC
    - Weekly cycle: Monday 00:00:01 GMT through Sunday 23:59:59 GMT
    - Daily cycle: 00:00:01 GMT through 23:59:59 GMT each day
    - Existing mission progress data is unchanged; only the reset logic changes
    - The edge function (missions/index.ts) has been updated with matching logic
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
  v_week_start timestamptz;
  v_claimed_at timestamptz;
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

  v_week_start := date_trunc('week', v_now AT TIME ZONE 'UTC') + interval '1 second';

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
      v_claimed_at := COALESCE(v_existing_progress.completed_at, v_existing_progress.last_reset);
      IF v_claimed_at < v_week_start THEN
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
