-- =============================================================
-- NYLAIA — Supabase Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor → Run
-- =============================================================


-- =============================================================
-- PROFILES
-- One row per user, auto-created by trigger on sign-up.
-- Stores display name, cycle settings, and onboarding status.
-- =============================================================
create table public.profiles (
  id               uuid references auth.users(id) on delete cascade primary key,
  name             text        not null default '',
  cycle_start_date date        not null default current_date,
  cycle_length     int         not null default 35 check (cycle_length between 14 and 60),
  onboarded        boolean     not null default false,
  created_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: own read/write"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger: auto-insert a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================================
-- CHECK-INS
-- One row per user per day. Stores all 6 symptom scores,
-- period flag, and free-text notes.
-- =============================================================
create table public.check_ins (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references public.profiles(id) on delete cascade not null,
  date        date        not null,
  energy      int         not null check (energy between 1 and 5),
  mood        int         not null check (mood between 1 and 5),
  cravings    int         not null check (cravings between 1 and 5),
  bloating    int         not null check (bloating between 1 and 5),
  stress      int         not null check (stress between 1 and 5),
  acne        int         not null check (acne between 1 and 5),
  has_period  boolean     not null default false,
  notes       text        not null default '',
  created_at  timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.check_ins enable row level security;

create policy "check_ins: own read/write"
  on public.check_ins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast per-user date-ordered queries (used on every app load)
create index check_ins_user_date_idx on public.check_ins (user_id, date desc);


-- =============================================================
-- POSTS
-- Community posts. Anyone can read; only the author can write/delete.
-- =============================================================
create table public.posts (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references public.profiles(id) on delete cascade not null,
  author_name text        not null default 'Anonymous',
  title       text        not null default '',
  body        text        not null,
  category    text        not null default 'Nutrition',
  image_url   text,
  created_at  timestamptz not null default now()
);

alter table public.posts enable row level security;

create policy "posts: public read"
  on public.posts for select using (true);

create policy "posts: own insert"
  on public.posts for insert
  with check (auth.uid() = user_id);

create policy "posts: own delete"
  on public.posts for delete
  using (auth.uid() = user_id);

-- Index for the community feed (newest first)
create index posts_created_at_idx on public.posts (created_at desc);


-- =============================================================
-- LIKES
-- One row per (user, post) pair. Public read so like counts
-- are visible to all; only the owner can add/remove their like.
-- =============================================================
create table public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id)    on delete cascade,
  primary key (user_id, post_id)
);

alter table public.likes enable row level security;

create policy "likes: public read"
  on public.likes for select using (true);

create policy "likes: own insert"
  on public.likes for insert
  with check (auth.uid() = user_id);

create policy "likes: own delete"
  on public.likes for delete
  using (auth.uid() = user_id);

-- Index for counting likes per post efficiently
create index likes_post_id_idx on public.likes (post_id);


-- =============================================================
-- SAVES (bookmarks)
-- Same pattern as likes. Private — only the owner can see
-- their own saves, so no public read policy.
-- =============================================================
create table public.saves (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id)    on delete cascade,
  primary key (user_id, post_id)
);

alter table public.saves enable row level security;

create policy "saves: own read/write"
  on public.saves for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- =============================================================
-- PRODUCTS
-- Admin-managed catalogue for the Wellness Shop.
-- Only active products are visible to users.
-- =============================================================
create table public.products (
  id        uuid           default gen_random_uuid() primary key,
  name      text           not null,
  brand     text           not null,
  price     text           not null,
  rating    numeric(3, 1)  not null default 0,
  category  text           not null default 'Supplements',
  image_url text,
  active    boolean        not null default true,
  created_at timestamptz   not null default now()
);

alter table public.products enable row level security;

create policy "products: public read (active only)"
  on public.products for select
  using (active = true);

-- Index for filtering by category in the shop screen
create index products_category_idx on public.products (category);


-- =============================================================
-- SEED DATA — Starter products
-- =============================================================
insert into public.products (name, brand, price, rating, category) values
  ('Ovasitol Elite',    'Theralogix',       '$75', 4.9, 'Supplements'),
  ('Magnesium Complex', 'Protocol',         '$24', 4.8, 'Supplements'),
  ('Spearmint Ritual',  'Nylaia Essentials','$18', 5.0, 'Rituals');
