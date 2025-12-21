-- Create Episodes Table
create table if not exists episodes (
  id uuid default uuid_generate_v4() primary key,
  tv_show_id bigint references tv_shows(id) on delete cascade,
  season_number int,
  episode_number int,
  title text,
  description text,
  thumbnail text,
  video_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Note: Ensure 'tv_shows' table id type matches (bigint or uuid). 
-- Based on typical Supabase setup, it might be bigint. If uuid, change above.
-- Previous code inspection suggests id might be handled by Supabase default.
