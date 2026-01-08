/*
  # Public Access to Missions

  ## Changes
  1. Allow public (anon) users to view missions
  2. Keep progress tracking for authenticated users only
  
  ## Security
  - Missions are read-only for public
  - User progress remains private
*/

-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view active missions" ON missions;

-- Create new public read policy
CREATE POLICY "Public can view active missions"
  ON missions FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
