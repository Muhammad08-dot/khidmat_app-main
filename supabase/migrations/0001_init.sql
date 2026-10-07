-- Phase 2: Supabase Initialization for Khidmat App

-- 1. Create Enums
CREATE TYPE booking_status AS ENUM ('pending', 'matched', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled');
CREATE TYPE provider_tier AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum');
CREATE TYPE user_role AS ENUM ('customer', 'provider');

-- 2. Create Tables
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  role user_role NOT NULL DEFAULT 'customer',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon_name TEXT NOT NULL,
  base_price INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE providers (
  id UUID REFERENCES profiles(id) PRIMARY KEY,
  category TEXT REFERENCES categories(name),
  bio TEXT,
  base_price INTEGER DEFAULT 0,
  rating DOUBLE PRECISION DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  tier provider_tier DEFAULT 'Bronze',
  available BOOLEAN DEFAULT false,
  total_earnings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) NOT NULL,
  provider_id UUID REFERENCES providers(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status booking_status DEFAULT 'pending',
  urgency TEXT DEFAULT 'medium',
  estimated_price INTEGER,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE provider_locations (
  provider_id UUID REFERENCES providers(id) PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES profiles(id) NOT NULL,
  provider_id UUID REFERENCES providers(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE push_tokens (
  user_id UUID REFERENCES profiles(id) PRIMARY KEY,
  token TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Indexes for performance
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_provider ON bookings(provider_id);
CREATE INDEX idx_messages_booking_time ON messages(booking_id, created_at);
CREATE INDEX idx_providers_category ON providers(category);

-- 4. Set up Auto-profile creation on Signup (Trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, city, role, location_lat, location_lng)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'city',
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'customer'),
    (new.raw_user_meta_data->>'location_lat')::double precision,
    (new.raw_user_meta_data->>'location_lng')::double precision
  );

  -- If they signed up as a provider, create the provider row as well
  IF (new.raw_user_meta_data->>'role' = 'provider') THEN
    INSERT INTO public.providers (id, category, bio, base_price)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'category',
      new.raw_user_meta_data->>'bio',
      COALESCE((new.raw_user_meta_data->>'basePrice')::integer, 0)
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 5. Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone can read, only owner can update
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Categories: Read-only for public
CREATE POLICY "Categories are viewable by everyone." ON categories FOR SELECT USING (true);

-- Providers: Anyone can read, only owner can update
CREATE POLICY "Providers are viewable by everyone." ON providers FOR SELECT USING (true);
CREATE POLICY "Providers can update own profile." ON providers FOR UPDATE USING (auth.uid() = id);

-- Bookings: Customers and Assigned Providers can view/update
CREATE POLICY "View involved bookings" ON bookings FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = provider_id);
CREATE POLICY "Create own bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Update involved bookings" ON bookings FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = provider_id);

-- Messages: Only participants can view/insert
CREATE POLICY "View booking messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = messages.booking_id AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
  )
);
CREATE POLICY "Insert booking messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = messages.booking_id AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
  )
);

-- Provider Locations: Provider updates, customer reads
CREATE POLICY "Provider updates own location" ON provider_locations FOR ALL USING (auth.uid() = provider_id);
CREATE POLICY "Customer reads provider location" ON provider_locations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings b WHERE b.id = provider_locations.booking_id AND b.customer_id = auth.uid()
  )
);

-- Reviews: Anyone can read, author can insert
CREATE POLICY "Reviews viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Insert own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Push tokens: User manages own tokens
CREATE POLICY "Manage own push tokens" ON push_tokens FOR ALL USING (auth.uid() = user_id);

-- 6. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
