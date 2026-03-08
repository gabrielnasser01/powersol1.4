/*
  # Cleanup and finalize missions

  1. Changes
    - Deactivate missions the user wants removed: activity_first_ticket, activity_buy_all_lotteries
    - Update power points: activity_become_affiliate from 250 to 25
    - Update power points: activity_100_tickets (Dedicated Player) from 500 to 250
    - Update power points: activity_50_tickets (Collector) from 300 to 100
    - Rename social_share to "Shorts on Social Media"
    - Ensure all desired missions are active
    - Deactivate all duplicate/unused missions

  2. Final active mission set (24 missions):
    Daily: daily_login (10pp), daily_buy_ticket (20pp), daily_donation (50pp tiered), daily_visit (5pp)
    Weekly: weekly_refer (200pp), weekly_streak (150pp), weekly_5_tickets (100pp), weekly_buy_2_different (30pp)
    Social: social_discord_join (25pp), social_invite_3 (20pp), social_invite_5 (30pp), social_invite_10 (50pp),
            social_invite_100 (100pp), social_invite_1000 (150pp), social_invite_5000 (200pp), social_share (25pp)
    Activity: activity_buy_10_tickets (100pp), activity_first_win (500pp), activity_explore_transparency (20pp),
             activity_become_affiliate (25pp), activity_50_tickets/Collector (100pp), activity_100_tickets/Dedicated Player (250pp)

  3. Important Notes
    - Deactivated missions keep their data for historical records
    - No data is deleted; only is_active flag changes
*/

UPDATE missions SET is_active = false WHERE mission_key = 'activity_first_ticket';

UPDATE missions SET is_active = false WHERE mission_key = 'activity_buy_all_lotteries';

UPDATE missions SET is_active = false WHERE mission_key = 'social_join_discord';
UPDATE missions SET is_active = false WHERE mission_key = 'social_twitter_follow';
UPDATE missions SET is_active = false WHERE mission_key = 'social_tiktok_follow';
UPDATE missions SET is_active = false WHERE mission_key = 'weekly_twitter_comment';
UPDATE missions SET is_active = false WHERE mission_key = 'weekly_twitter_like';
UPDATE missions SET is_active = false WHERE mission_key = 'weekly_twitter_repost';
UPDATE missions SET is_active = false WHERE mission_key = 'activity_10_tickets';

UPDATE missions
SET power_points = 25,
    description = 'Become an approved affiliate'
WHERE mission_key = 'activity_become_affiliate';

UPDATE missions
SET power_points = 250,
    name = 'Dedicated Player',
    description = 'Buy 100 tickets total'
WHERE mission_key = 'activity_100_tickets';

UPDATE missions
SET power_points = 100,
    name = 'Collector',
    description = 'Buy 50 tickets total'
WHERE mission_key = 'activity_50_tickets';

UPDATE missions
SET name = 'Shorts on Social Media',
    description = 'Share PowerSOL on social media (Shorts, Reels, TikTok, etc.)'
WHERE mission_key = 'social_share';

UPDATE missions SET is_active = true WHERE mission_key = 'daily_login';
UPDATE missions SET is_active = true WHERE mission_key = 'daily_buy_ticket';
UPDATE missions SET is_active = true WHERE mission_key = 'daily_donation';
UPDATE missions SET is_active = true WHERE mission_key = 'daily_visit';
UPDATE missions SET is_active = true WHERE mission_key = 'weekly_refer';
UPDATE missions SET is_active = true WHERE mission_key = 'weekly_streak';
UPDATE missions SET is_active = true WHERE mission_key = 'weekly_5_tickets';
UPDATE missions SET is_active = true WHERE mission_key = 'weekly_buy_2_different';
UPDATE missions SET is_active = true WHERE mission_key = 'social_discord_join';
UPDATE missions SET is_active = true WHERE mission_key = 'social_invite_3';
UPDATE missions SET is_active = true WHERE mission_key = 'social_invite_5';
UPDATE missions SET is_active = true WHERE mission_key = 'social_invite_10';
UPDATE missions SET is_active = true WHERE mission_key = 'social_invite_100';
UPDATE missions SET is_active = true WHERE mission_key = 'social_invite_1000';
UPDATE missions SET is_active = true WHERE mission_key = 'social_invite_5000';
UPDATE missions SET is_active = true WHERE mission_key = 'social_share';
UPDATE missions SET is_active = true WHERE mission_key = 'activity_buy_10_tickets';
UPDATE missions SET is_active = true WHERE mission_key = 'activity_first_win';
UPDATE missions SET is_active = true WHERE mission_key = 'activity_explore_transparency';
UPDATE missions SET is_active = true WHERE mission_key = 'activity_become_affiliate';
UPDATE missions SET is_active = true WHERE mission_key = 'activity_50_tickets';
UPDATE missions SET is_active = true WHERE mission_key = 'activity_100_tickets';
