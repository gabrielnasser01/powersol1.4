/*
  # Revert all mission names and descriptions to English

  1. Changes
    - Updates all active missions with English names and descriptions
    - Covers daily, weekly, social, and activity mission types

  2. No structural changes
    - No table modifications
    - No RLS changes
    - Points values unchanged
*/

UPDATE missions SET name = 'Daily Login', description = 'Log in to PowerSOL every day to earn points' WHERE mission_key = 'daily_login';
UPDATE missions SET name = 'Daily Ticket', description = 'Buy at least 1 lottery ticket today' WHERE mission_key = 'daily_buy_ticket';
UPDATE missions SET name = 'Support the Project', description = 'Make a donation to support development (min 0.05 SOL)' WHERE mission_key = 'daily_donation';
UPDATE missions SET name = 'Daily Visit', description = 'Visit the platform and explore features' WHERE mission_key = 'daily_visit';

UPDATE missions SET name = 'Twitter Repost', description = 'Repost our tweet' WHERE mission_key = 'weekly_twitter_repost';
UPDATE missions SET name = 'Twitter Comment', description = 'Comment on our tweet' WHERE mission_key = 'weekly_twitter_comment';
UPDATE missions SET name = 'Twitter Like', description = 'Like our tweet' WHERE mission_key = 'weekly_twitter_like';
UPDATE missions SET name = 'Buy 2 Different Lotteries', description = 'Buy tickets from 2 different lotteries' WHERE mission_key = 'weekly_buy_2_different';
UPDATE missions SET name = 'Weekly Buyer', description = 'Buy 5 or more tickets this week' WHERE mission_key = 'weekly_5_tickets';
UPDATE missions SET name = 'Streak Master', description = 'Log in for 7 consecutive days' WHERE mission_key = 'weekly_streak';
UPDATE missions SET name = 'Weekly Referrer', description = 'Refer someone who makes a purchase this week' WHERE mission_key = 'weekly_refer';

UPDATE missions SET name = 'Follow on Twitter', description = 'Follow our official Twitter account' WHERE mission_key = 'social_twitter_follow';
UPDATE missions SET name = 'Follow on TikTok', description = 'Follow our TikTok account' WHERE mission_key = 'social_tiktok_follow';
UPDATE missions SET name = 'Join Discord', description = 'Join our Discord server' WHERE mission_key = 'social_discord_join';
UPDATE missions SET name = '3 Validated Referrals', description = 'Invite 3 validated friends' WHERE mission_key = 'social_invite_3';
UPDATE missions SET name = '5 Validated Referrals', description = 'Invite 5 validated friends' WHERE mission_key = 'social_invite_5';
UPDATE missions SET name = '10 Validated Referrals', description = 'Invite 10 validated friends' WHERE mission_key = 'social_invite_10';
UPDATE missions SET name = '100 Validated Referrals', description = 'Invite 100 validated friends' WHERE mission_key = 'social_invite_100';
UPDATE missions SET name = '1000 Validated Referrals', description = 'Invite 1000 validated friends' WHERE mission_key = 'social_invite_1000';
UPDATE missions SET name = '5000 Validated Referrals', description = 'Invite 5000 validated friends' WHERE mission_key = 'social_invite_5000';
UPDATE missions SET name = 'Share on Social Media', description = 'Share PowerSOL on any social media' WHERE mission_key = 'social_share';

UPDATE missions SET name = 'Explore Transparency', description = 'Visit the Transparency page' WHERE mission_key = 'activity_explore_transparency';
UPDATE missions SET name = 'First Ticket', description = 'Buy your first lottery ticket' WHERE mission_key = 'activity_first_ticket';
UPDATE missions SET name = 'First Win', description = 'Win any lottery prize' WHERE mission_key = 'activity_first_win';
UPDATE missions SET name = 'Buy 10+ Tickets', description = 'Buy more than 10 tickets total' WHERE mission_key = 'activity_buy_10_tickets';
UPDATE missions SET name = 'Collector', description = 'Buy 50 tickets total' WHERE mission_key = 'activity_50_tickets';
UPDATE missions SET name = 'Dedicated Player', description = 'Buy 100 tickets total' WHERE mission_key = 'activity_100_tickets';
UPDATE missions SET name = 'Affiliate', description = 'Become an approved affiliate' WHERE mission_key = 'activity_become_affiliate';
UPDATE missions SET name = 'Buy All Lotteries', description = 'Buy at least 1 ticket from each lottery' WHERE mission_key = 'activity_buy_all_lotteries';
