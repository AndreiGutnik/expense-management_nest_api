CREATE DATABASE license_db;

CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_licenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS licenses_updated_at_trigger ON licenses;

CREATE TRIGGER licenses_updated_at_trigger
BEFORE UPDATE ON licenses
FOR EACH ROW
EXECUTE FUNCTION update_licenses_updated_at();

INSERT INTO licenses (name, expires_at, is_active)
VALUES ('my_crm', now() + interval '30 days', true)
ON CONFLICT (name) DO UPDATE
SET
  expires_at = EXCLUDED.expires_at,
  is_active = EXCLUDED.is_active,
  updated_at = now();