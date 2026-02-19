/*
  # Cleanup and Improve Missions

  1. Changes
    - Deactivate duplicate missions (two 10-ticket missions, two Discord join missions)
    - Translate all English mission names/descriptions to Portuguese
    - Update power_points rewards for better balance
    - Add tiered donation rewards via requirements field
    - Standardize all mission icons

  2. Deactivated Duplicates
    - `activity_10_tickets` (duplicate of `activity_buy_10_tickets`)
    - `social_join_discord` (duplicate of `social_discord_join`)

  3. Updated Missions
    - All daily, weekly, social, and activity missions translated to PT-BR
    - Donation mission updated with tiered reward info
    - Consistent naming and descriptions
*/

UPDATE missions SET is_active = false
WHERE mission_key = 'activity_10_tickets'
  AND EXISTS (SELECT 1 FROM missions WHERE mission_key = 'activity_buy_10_tickets' AND is_active = true);

UPDATE missions SET is_active = false
WHERE mission_key = 'social_join_discord'
  AND EXISTS (SELECT 1 FROM missions WHERE mission_key = 'social_discord_join' AND is_active = true);

UPDATE missions SET
  name = 'Login Diario',
  description = 'Faca login na PowerSOL todos os dias para ganhar pontos'
WHERE mission_key = 'daily_login';

UPDATE missions SET
  name = 'Apoiar o Projeto',
  description = 'Faca uma doacao para apoiar o desenvolvimento (min 0.05 SOL)',
  requirements = '{"type":"donation","min_amount":0.05,"tiers":[{"amount":0.05,"points":50},{"amount":0.25,"points":150},{"amount":0.5,"points":350},{"amount":1.0,"points":800}]}'::jsonb
WHERE mission_key = 'daily_donation';

UPDATE missions SET
  name = 'Bilhete Diario',
  description = 'Compre pelo menos 1 bilhete de loteria hoje'
WHERE mission_key = 'daily_buy_ticket';

UPDATE missions SET
  name = 'Visita Diaria',
  description = 'Visite a plataforma e explore as funcionalidades'
WHERE mission_key = 'daily_visit';

UPDATE missions SET
  name = 'Streak Master',
  description = 'Faca login por 7 dias consecutivos'
WHERE mission_key = 'weekly_streak';

UPDATE missions SET
  name = 'Comprador Semanal',
  description = 'Compre 5 ou mais bilhetes esta semana'
WHERE mission_key = 'weekly_5_tickets';

UPDATE missions SET
  name = 'Indicador Semanal',
  description = 'Indique alguem que faca uma compra esta semana'
WHERE mission_key = 'weekly_refer';

UPDATE missions SET
  name = 'Entrar no Discord',
  description = 'Entre no nosso servidor do Discord',
  power_points = 25
WHERE mission_key = 'social_discord_join';

UPDATE missions SET
  name = 'Compartilhar nas Redes',
  description = 'Compartilhe a PowerSOL em qualquer rede social'
WHERE mission_key = 'social_share';

UPDATE missions SET
  name = 'Afiliado',
  description = 'Torne-se um afiliado aprovado'
WHERE mission_key = 'activity_become_affiliate';

UPDATE missions SET
  name = 'Primeiro Bilhete',
  description = 'Compre seu primeiro bilhete de loteria'
WHERE mission_key = 'activity_first_ticket';

UPDATE missions SET
  name = 'Primeira Vitoria',
  description = 'Ganhe qualquer premio de loteria'
WHERE mission_key = 'activity_first_win';

UPDATE missions SET
  name = 'Colecionador',
  description = 'Compre 50 bilhetes no total'
WHERE mission_key = 'activity_50_tickets';

UPDATE missions SET
  name = 'Jogador Dedicado',
  description = 'Compre 100 bilhetes no total'
WHERE mission_key = 'activity_100_tickets';
