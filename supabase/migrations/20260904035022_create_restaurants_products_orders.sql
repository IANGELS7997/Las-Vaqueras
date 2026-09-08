CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  stripe_account_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price_base NUMERIC(10,2) NOT NULL,
  price_web NUMERIC(10,2) GENERATED ALWAYS AS (ROUND(price_base * 1.05, 2)) STORED,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX products_restaurant_id_idx ON products (restaurant_id);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  total_charged NUMERIC(10,2) NOT NULL,
  restaurant_payout NUMERIC(10,2) NOT NULL,
  platform_fee NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'preparing', 'in_transit', 'delivered', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX orders_restaurant_id_idx ON orders (restaurant_id);
CREATE INDEX orders_status_idx ON orders (status);

ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read available products"
  ON products
  FOR SELECT
  TO anon, authenticated
  USING (is_available = true);

ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
