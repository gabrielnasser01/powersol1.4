/*
  # Add Weekly Lottery-Specific Missions

  1. New Missions
    - `weekly_buy_special_event` - Buy at least 1 Special Event ticket this week (30 POWER)
    - `weekly_buy_jackpot` - Buy at least 1 Jackpot ticket this week (30 POWER)
    - `weekly_buy_grand_prize` - Buy at least 1 Grand Prize ticket this week (30 POWER)

  2. Details
    - All three are weekly missions that reset each week
    - Each awards 30 power points (same as weekly_buy_2_different)
    - Icon: ShoppingCart (matching existing purchase missions)
    - These missions are triggered when the user buys a ticket of the corresponding lottery type
*/

INSERT INTO missions (mission_type, mission_key, name, description, power_points, icon, requirements, is_active)
VALUES
  ('weekly', 'weekly_buy_special_event', 'Special Event Ticket', 'Buy at least 1 Special Event lottery ticket this week', 30, 'ShoppingCart', '{}', true),
  ('weekly', 'weekly_buy_jackpot', 'Jackpot Ticket', 'Buy at least 1 Jackpot lottery ticket this week', 30, 'ShoppingCart', '{}', true),
  ('weekly', 'weekly_buy_grand_prize', 'Grand Prize Ticket', 'Buy at least 1 Grand Prize lottery ticket this week', 30, 'ShoppingCart', '{}', true)
ON CONFLICT (mission_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  power_points = EXCLUDED.power_points,
  icon = EXCLUDED.icon,
  is_active = true;
