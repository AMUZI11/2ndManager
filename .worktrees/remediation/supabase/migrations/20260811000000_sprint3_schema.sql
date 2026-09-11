-- Migration 20260811000000_sprint3_schema.sql

-- Add stock columns to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_stock integer DEFAULT 0;

-- Create stock_opname table
CREATE TABLE IF NOT EXISTS stock_opname (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id),
    status text NOT NULL,
    notes text
);

-- Create stock_opname_items table
CREATE TABLE IF NOT EXISTS stock_opname_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_opname_id uuid REFERENCES stock_opname(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id),
    expected_stock integer NOT NULL,
    actual_stock integer NOT NULL,
    difference integer NOT NULL,
    notes text
);

-- Profiles table
-- Ensure the profiles table has role and subscription_tier.
-- We create it if it doesn't exist to store 'role' (BOSS/CASHIER) and 'subscription_tier' (FREE/STARTER/PLUS/PRO).
-- (Alternatively, we could have used auth.users metadata to avoid an extra join, but having a profiles table provides explicit schema validation and easier querying/relationships).
CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text CHECK (role IN ('BOSS', 'CASHIER')),
    subscription_tier text CHECK (subscription_tier IN ('FREE', 'STARTER', 'PLUS', 'PRO'))
);
