-- Seed Categories
INSERT INTO categories (name, icon_name, base_price) VALUES
  ('Electrician', 'zap', 500),
  ('Plumber', 'droplet', 500),
  ('Carpenter', 'hammer', 600),
  ('Painter', 'paint-brush', 700),
  ('AC Technician', 'thermometer-snow', 800),
  ('House Cleaner', 'sparkles', 400),
  ('Appliance Repair', 'tool', 600),
  ('Mechanic', 'settings', 1000)
ON CONFLICT (name) DO NOTHING;

-- Note: We do not seed providers here automatically because providers are linked 
-- to auth.users (UUIDs) which don't exist yet in your fresh Supabase project. 
-- In Phase 3, we will use the app UI to create users and assign them provider roles!
