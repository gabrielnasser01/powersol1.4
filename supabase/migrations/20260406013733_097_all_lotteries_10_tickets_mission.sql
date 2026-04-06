/*
  # Add "All-Rounder" mission

  1. New Mission
    - `activity_10_each_lottery` (activity type)
    - Buy 10 tickets from each of the 4 lotteries (Tri-Daily, Jackpot, Special Event, Grand Prize)
    - Rewards 200 Power Points
    - Icon: ShoppingBag (matches existing ticket milestone missions)

  2. Details
    - mission_type: activity (one-time milestone)
    - Requirements specify 10 tickets per lottery type
    - Active immediately
*/

INSERT INTO missions (mission_type, mission_key, name, description, power_points, icon, requirements, is_active)
VALUES (
  'activity',
  'activity_10_each_lottery',
  'All-Rounder',
  'Buy 10 tickets from each of the 4 lotteries',
  200,
  'ShoppingBag',
  '{"type": "milestone", "tickets_per_lottery": 10, "lottery_types": ["tri_daily", "jackpot", "special_event", "grand_prize"]}'::jsonb,
  true
)
ON CONFLICT DO NOTHING;