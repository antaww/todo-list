/*
  # Create todos and lists tables

  1. New Tables
    - `lists`
      - `id` (text, primary key)
      - `title` (text)
      - `created_at` (timestamp)
    - `todos`
      - `id` (uuid, primary key)
      - `title` (text)
      - `completed` (boolean)
      - `order` (integer)
      - `list_id` (text, references lists)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on both tables
    - Add policy for public access (since this is a demo)
*/

-- Create lists table
CREATE TABLE IF NOT EXISTS lists (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT 'Untitled List',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- Allow public access for lists
CREATE POLICY "Allow public access on lists"
  ON lists
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  completed boolean DEFAULT false,
  "order" integer NOT NULL,
  list_id text NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- Allow public access for todos
CREATE POLICY "Allow public access on todos"
  ON todos
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);