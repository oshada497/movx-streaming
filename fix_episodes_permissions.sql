-- Enable RLS (if not already)
alter table episodes enable row level security;

-- Create policy to allow public read access
create policy "Public episodes are viewable by everyone"
  on episodes for select
  using ( true );

-- Create policy to allow insert/update/delete (Adjust if you have auth)
-- For this simple app without auth, we might need to allow anon write or just disable RLS
-- Safer option for this specific user scenario (assuming they control the DB) is often to disable RLS if they don't have Auth setup.

-- Option A: Disable RLS (Easiest for single-user/demo apps)
alter table episodes disable row level security;
