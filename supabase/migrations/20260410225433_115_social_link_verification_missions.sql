/*
  # Social Link Verification Missions

  1. New Missions (inserted into `missions` table)
    - `social_link_discord` - Link Discord account (100 POWER, one-time)
    - `social_link_twitter` - Link X/Twitter account (100 POWER, one-time)
    - `social_link_youtube` - Link YouTube account (100 POWER, one-time)
    - `social_link_all` - Link all 3 social accounts (300 POWER, one-time)

  2. Notes
    - All missions are social type, active, one-time completion
    - Verification checks user_social_accounts table for linked platforms
    - The "link all" mission requires discord, twitter, and youtube all linked
*/

INSERT INTO missions (mission_key, mission_type, name, description, power_points, icon, requirements, is_active)
VALUES
  ('social_link_discord', 'social', 'Link Discord', 'Link your Discord account in your Profile', 100, 'MessageSquare', '{"action": "link_account", "platform": "discord"}'::jsonb, true),
  ('social_link_twitter', 'social', 'Link X Account', 'Link your X (Twitter) account in your Profile', 100, 'Twitter', '{"action": "link_account", "platform": "twitter"}'::jsonb, true),
  ('social_link_youtube', 'social', 'Link YouTube', 'Link your YouTube account in your Profile', 100, 'Music', '{"action": "link_account", "platform": "youtube"}'::jsonb, true),
  ('social_link_all', 'social', 'All Socials Linked', 'Link Discord, X, and YouTube accounts in your Profile', 300, 'Users', '{"action": "link_all_accounts", "platforms": ["discord", "twitter", "youtube"]}'::jsonb, true)
ON CONFLICT (mission_key) DO NOTHING;