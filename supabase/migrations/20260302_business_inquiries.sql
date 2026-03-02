-- Business inquiries table for B2B enterprise landing page
CREATE TABLE IF NOT EXISTS business_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  employee_count TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'contracted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for admin queries
CREATE INDEX IF NOT EXISTS business_inquiries_status_idx ON business_inquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS business_inquiries_email_idx ON business_inquiries (email);

-- RLS: public can insert, only admin can read
ALTER TABLE business_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry (public page, no auth)
CREATE POLICY "Anyone can submit business inquiry"
  ON business_inquiries
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Only authenticated users with admin role can read/update inquiries
CREATE POLICY "Admins can manage business inquiries"
  ON business_inquiries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
