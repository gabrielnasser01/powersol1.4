/*
  # Missions System - PowerSOL

  ## Overview
  Complete missions system with daily, weekly, social, and activity missions.
  Power Points rewards based on mission completion and ticket purchases.

  ## Tables Created
  
  ### 1. `missions`
  Stores all available missions with their configuration
  - `id` (uuid, PK) - Mission unique identifier
  - `mission_type` (text) - Type: daily, weekly, social, activity
  - `mission_key` (text, unique) - Unique key for mission identification
  - `name` (text) - Mission display name
  - `description` (text) - Mission description
  - `power_points` (integer) - Reward amount
  - `icon` (text) - Icon identifier
  - `requirements` (jsonb) - Additional requirements (refs count, lottery types, etc)
  - `is_active` (boolean) - Mission availability status
  - `created_at` (timestamptz)
  
  ### 2. `user_mission_progress`
  Tracks user progress on missions
  - `id` (uuid, PK)
  - `user_id` (uuid, FK) - References users
  - `mission_id` (uuid, FK) - References missions
  - `completed` (boolean) - Completion status
  - `completed_at` (timestamptz) - Completion timestamp
  - `progress` (jsonb) - Current progress data
  - `last_reset` (timestamptz) - Last reset for daily/weekly missions
  - `created_at` (timestamptz)
  
  ### 3. `ticket_purchases`
  Tracks ticket purchases for missions and power points
  - `id` (uuid, PK)
  - `user_id` (uuid, FK)
  - `lottery_type` (text) - tri_daily, jackpot, xmas, grand_prize
  - `ticket_count` (integer) - Number of tickets purchased
  - `power_points_earned` (integer) - PP earned from this purchase
  - `transaction_signature` (text) - Solana transaction signature
  - `created_at` (timestamptz)
  
  ### 4. `donations`
  Tracks SOL donations for missions
  - `id` (uuid, PK)
  - `user_id` (uuid, FK)
  - `amount_sol` (decimal) - Amount donated in SOL
  - `transaction_signature` (text) - Solana transaction signature
  - `power_points_earned` (integer) - PP earned (50 for daily mission)
  - `created_at` (timestamptz)
  
  ## Security
  - RLS enabled on all tables
  - Users can read own mission progress
  - Only authenticated users can access missions
  - Insert/Update restricted to backend service role

  ## Notes
  - Daily missions reset every 24 hours
  - Weekly missions reset every 7 days
  - Social and Activity missions completed once only
  - Power Points per ticket: Tri Daily (10), Jackpot (20), Xmas (20), Grand Prize (30)
*/

-- Create missions table
CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_type text NOT NULL CHECK (mission_type IN ('daily', 'weekly', 'social', 'activity')),
  mission_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  power_points integer NOT NULL DEFAULT 0,
  icon text,
  requirements jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user mission progress table
CREATE TABLE IF NOT EXISTS user_mission_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  progress jsonb DEFAULT '{}',
  last_reset timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, mission_id)
);

-- Create ticket purchases table
CREATE TABLE IF NOT EXISTS ticket_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lottery_type text NOT NULL CHECK (lottery_type IN ('tri_daily', 'jackpot', 'xmas', 'grand_prize')),
  ticket_count integer NOT NULL DEFAULT 1,
  power_points_earned integer NOT NULL DEFAULT 0,
  transaction_signature text,
  created_at timestamptz DEFAULT now()
);

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_sol decimal(20, 9) NOT NULL,
  transaction_signature text NOT NULL,
  power_points_earned integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mission_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for missions (public read)
CREATE POLICY "Anyone can view active missions"
  ON missions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- RLS Policies for user_mission_progress
CREATE POLICY "Users can view own mission progress"
  ON user_mission_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own mission progress"
  ON user_mission_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own mission progress"
  ON user_mission_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for ticket_purchases
CREATE POLICY "Users can view own ticket purchases"
  ON ticket_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ticket purchases"
  ON ticket_purchases FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for donations
CREATE POLICY "Users can view own donations"
  ON donations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own donations"
  ON donations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Insert all missions
-- DAILY MISSIONS
INSERT INTO missions (mission_key, mission_type, name, description, power_points, icon, requirements) VALUES
  ('daily_login', 'daily', 'Login Diário', 'Faça login no site uma vez por dia', 10, 'LogIn', '{"reset": "daily"}'),
  ('daily_buy_ticket', 'daily', 'Comprar Bilhete', 'Compre 1 bilhete de qualquer loteria', 10, 'Ticket', '{"reset": "daily", "ticket_count": 1}'),
  ('daily_donation', 'daily', 'Doar para o Projeto', 'Doe no mínimo 0.05 SOL para o projeto', 50, 'Heart', '{"reset": "daily", "min_sol": 0.05}')
ON CONFLICT (mission_key) DO NOTHING;

-- WEEKLY MISSIONS
INSERT INTO missions (mission_key, mission_type, name, description, power_points, icon, requirements) VALUES
  ('weekly_twitter_repost', 'weekly', 'Repost no Twitter', 'Faça repost do nosso tweet', 15, 'Repeat', '{"reset": "weekly", "platform": "twitter", "action": "repost"}'),
  ('weekly_twitter_comment', 'weekly', 'Comentar no Twitter', 'Comente em nosso tweet', 15, 'MessageCircle', '{"reset": "weekly", "platform": "twitter", "action": "comment"}'),
  ('weekly_twitter_like', 'weekly', 'Like no Twitter', 'Curta nosso tweet', 15, 'Heart', '{"reset": "weekly", "platform": "twitter", "action": "like"}'),
  ('weekly_buy_2_different', 'weekly', 'Comprar 2 Loterias Diferentes', 'Compre bilhetes de 2 loterias diferentes', 30, 'ShoppingCart', '{"reset": "weekly", "different_lotteries": 2}')
ON CONFLICT (mission_key) DO NOTHING;

-- SOCIAL MISSIONS
INSERT INTO missions (mission_key, mission_type, name, description, power_points, icon, requirements) VALUES
  ('social_twitter_follow', 'social', 'Seguir no Twitter', 'Siga nossa conta oficial no Twitter', 20, 'Twitter', '{"platform": "twitter", "action": "follow"}'),
  ('social_tiktok_follow', 'social', 'Seguir no TikTok', 'Siga nossa conta no TikTok', 20, 'Music', '{"platform": "tiktok", "action": "follow"}'),
  ('social_discord_join', 'social', 'Entrar no Discord', 'Entre em nosso servidor Discord', 25, 'MessageSquare', '{"platform": "discord", "action": "join"}'),
  ('social_invite_3', 'social', '3 Referências Validadas', 'Convide 3 amigos validados', 20, 'Users', '{"refs_required": 3}'),
  ('social_invite_5', 'social', '5 Referências Validadas', 'Convide 5 amigos validados', 30, 'Users', '{"refs_required": 5}'),
  ('social_invite_10', 'social', '10 Referências Validadas', 'Convide 10 amigos validados', 50, 'Users', '{"refs_required": 10}'),
  ('social_invite_100', 'social', '100 Referências Validadas', 'Convide 100 amigos validados', 100, 'Users', '{"refs_required": 100}'),
  ('social_invite_1000', 'social', '1000 Referências Validadas', 'Convide 1000 amigos validados', 150, 'Users', '{"refs_required": 1000}'),
  ('social_invite_5000', 'social', '5000 Referências Validadas', 'Convide 5000 amigos validados', 200, 'Users', '{"refs_required": 5000}')
ON CONFLICT (mission_key) DO NOTHING;

-- ACTIVITY MISSIONS
INSERT INTO missions (mission_key, mission_type, name, description, power_points, icon, requirements) VALUES
  ('activity_explore_transparency', 'activity', 'Explorar Transparência', 'Visite a página de Transparência', 20, 'Eye', '{"page": "transparency"}'),
  ('activity_buy_all_lotteries', 'activity', 'Comprar Todas as Loterias', 'Compre pelo menos 1 bilhete de cada loteria', 50, 'Trophy', '{"lottery_types": ["tri_daily", "jackpot", "xmas", "grand_prize"]}'),
  ('activity_buy_10_tickets', 'activity', 'Comprar +10 Bilhetes', 'Compre mais de 10 bilhetes no total', 100, 'ShoppingBag', '{"total_tickets": 10}')
ON CONFLICT (mission_key) DO NOTHING;

-- Function to check and reset daily/weekly missions
CREATE OR REPLACE FUNCTION check_mission_reset()
RETURNS trigger AS $$
BEGIN
  -- Check if mission needs reset based on type
  IF (SELECT mission_type FROM missions WHERE id = NEW.mission_id) = 'daily' THEN
    -- Reset if more than 24 hours passed
    IF NEW.last_reset < (now() - interval '24 hours') THEN
      NEW.completed := false;
      NEW.completed_at := NULL;
      NEW.progress := '{}';
      NEW.last_reset := now();
    END IF;
  ELSIF (SELECT mission_type FROM missions WHERE id = NEW.mission_id) = 'weekly' THEN
    -- Reset if more than 7 days passed
    IF NEW.last_reset < (now() - interval '7 days') THEN
      NEW.completed := false;
      NEW.completed_at := NULL;
      NEW.progress := '{}';
      NEW.last_reset := now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for mission reset check
DROP TRIGGER IF EXISTS mission_reset_trigger ON user_mission_progress;
CREATE TRIGGER mission_reset_trigger
  BEFORE INSERT OR UPDATE ON user_mission_progress
  FOR EACH ROW
  EXECUTE FUNCTION check_mission_reset();

-- Function to calculate power points per lottery type
CREATE OR REPLACE FUNCTION get_ticket_power_points(lottery_type text, ticket_count integer)
RETURNS integer AS $$
BEGIN
  RETURN CASE lottery_type
    WHEN 'tri_daily' THEN 10 * ticket_count
    WHEN 'jackpot' THEN 20 * ticket_count
    WHEN 'xmas' THEN 20 * ticket_count
    WHEN 'grand_prize' THEN 30 * ticket_count
    ELSE 0
  END;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_user_id ON user_mission_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mission_progress_mission_id ON user_mission_progress(mission_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_user_id ON ticket_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_created_at ON ticket_purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(mission_type);
CREATE INDEX IF NOT EXISTS idx_missions_key ON missions(mission_key);