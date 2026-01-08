/*
  # Seed Initial Missions Data

  1. Daily Missions (reset every 24h)
    - daily_login: Login to the platform
    - daily_buy_ticket: Purchase at least 1 ticket
    - daily_donation: Make a donation (min 0.05 SOL)
    - daily_visit: Visit the site daily

  2. Weekly Missions (reset every 7 days)
    - weekly_5_tickets: Purchase 5 tickets in a week
    - weekly_streak: Maintain 7-day login streak
    - weekly_refer: Refer someone who makes a purchase

  3. Social Missions (one-time, EXCLUDING Twitter - to be added later)
    - social_join_discord: Join Discord community
    - social_share: Share on social media

  4. Activity Missions (one-time achievements)
    - activity_first_ticket: Purchase your first ticket
    - activity_first_win: Win your first lottery
    - activity_10_tickets: Purchase 10 tickets total
    - activity_50_tickets: Purchase 50 tickets total
    - activity_100_tickets: Purchase 100 tickets total
    - activity_become_affiliate: Become an affiliate

  Note: Twitter missions (follow, retweet, like) will be added when API is available
*/

INSERT INTO missions (mission_type, mission_key, name, description, power_points, icon, requirements, is_active) VALUES
-- Daily Missions
('daily', 'daily_login', 'Daily Login', 'Login to PowerSOL every day to earn points', 10, 'LogIn', '{"type": "login"}', true),
('daily', 'daily_buy_ticket', 'Daily Ticket', 'Purchase at least 1 lottery ticket today', 20, 'Ticket', '{"type": "purchase", "min_tickets": 1}', true),
('daily', 'daily_donation', 'Daily Support', 'Make a donation to support the project (min 0.05 SOL)', 50, 'Heart', '{"type": "donation", "min_amount": 0.05}', true),
('daily', 'daily_visit', 'Daily Visit', 'Visit the platform and explore', 5, 'Eye', '{"type": "visit"}', true),

-- Weekly Missions
('weekly', 'weekly_5_tickets', 'Weekly Buyer', 'Purchase 5 or more tickets this week', 100, 'ShoppingCart', '{"type": "purchase", "min_tickets": 5, "period": "week"}', true),
('weekly', 'weekly_streak', 'Streak Master', 'Login for 7 consecutive days', 150, 'Repeat', '{"type": "streak", "days": 7}', true),
('weekly', 'weekly_refer', 'Weekly Referrer', 'Refer someone who makes a purchase this week', 200, 'Users', '{"type": "referral", "period": "week"}', true),

-- Social Missions (WITHOUT Twitter - to be added later)
('social', 'social_join_discord', 'Join Discord', 'Join our Discord community', 30, 'MessageSquare', '{"type": "social", "platform": "discord"}', true),
('social', 'social_share', 'Social Share', 'Share PowerSOL on any social platform', 25, 'MessageCircle', '{"type": "social", "platform": "any"}', true),

-- Activity Missions (One-time achievements)
('activity', 'activity_first_ticket', 'First Ticket', 'Purchase your very first lottery ticket', 50, 'Trophy', '{"type": "achievement", "action": "first_purchase"}', true),
('activity', 'activity_first_win', 'First Victory', 'Win any lottery prize', 500, 'Trophy', '{"type": "achievement", "action": "first_win"}', true),
('activity', 'activity_10_tickets', 'Collector', 'Purchase 10 tickets in total', 100, 'ShoppingBag', '{"type": "milestone", "tickets": 10}', true),
('activity', 'activity_50_tickets', 'Enthusiast', 'Purchase 50 tickets in total', 300, 'ShoppingBag', '{"type": "milestone", "tickets": 50}', true),
('activity', 'activity_100_tickets', 'Dedicated Player', 'Purchase 100 tickets in total', 500, 'ShoppingBag', '{"type": "milestone", "tickets": 100}', true),
('activity', 'activity_become_affiliate', 'Affiliate', 'Become an approved affiliate', 250, 'Users', '{"type": "achievement", "action": "become_affiliate"}', true)

ON CONFLICT (mission_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  power_points = EXCLUDED.power_points,
  icon = EXCLUDED.icon,
  requirements = EXCLUDED.requirements,
  is_active = EXCLUDED.is_active;
