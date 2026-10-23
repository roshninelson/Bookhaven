-- BookHaven PostgreSQL schema for Supabase. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id text primary key,
  title text not null,
  author text not null,
  category text not null,
  price integer not null check (price >= 0),
  old_price integer check (old_price is null or old_price >= price),
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  cover_url text,
  description text not null default '',
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  payment_status text not null default 'test_pending' check (payment_status in ('test_pending','pending','paid','failed','refunded')),
  subtotal integer not null check (subtotal >= 0),
  shipping integer not null default 0 check (shipping >= 0),
  total integer not null check (total >= 0),
  shipping_address jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  book_id text references public.books(id) on delete set null,
  title_snapshot text not null,
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  book_id text not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  unique (book_id, user_id)
);

create table if not exists public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id text not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index if not exists books_category_active_idx on public.books(category, is_active);
create index if not exists books_title_search_idx on public.books using gin (to_tsvector('english', title || ' ' || author));
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.books enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.wishlist_items enable row level security;

-- Public read-only catalog access. No anonymous writes to inventory or prices.
drop policy if exists "Anyone can read active books" on public.books;
create policy "Anyone can read active books" on public.books for select to anon, authenticated using (is_active = true);
drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories" on public.categories for select to anon, authenticated using (true);

-- Signed-in users can read/update only their own profile.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Orders/items are private. Creation should be implemented through a trusted server function
-- that verifies prices and inventory, rather than trusting client-submitted totals.
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders" on public.orders for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users read own order items" on public.order_items;
create policy "Users read own order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews" on public.reviews for select to anon, authenticated using (true);
drop policy if exists "Users manage own reviews" on public.reviews;
create policy "Users manage own reviews" on public.reviews for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own wishlist" on public.wishlist_items;
create policy "Users manage own wishlist" on public.wishlist_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into public.categories(name, slug) values
('Fiction','fiction'),('Personal Growth','personal-growth'),('Productivity','productivity'),('Finance','finance'),('Sci-Fi','sci-fi'),('Memoir','memoir'),('Creativity','creativity')
on conflict (slug) do nothing;

insert into public.books(id,title,author,category,price,old_price,rating,review_count,cover_url,description,stock,featured) values
('b1','Atomic Habits','James Clear','Personal Growth',399,499,4.8,2841,'https://images-na.ssl-images-amazon.com/images/I/81wgcld4wxL.jpg','Tiny changes, remarkable results. Build better habits and break the ones that hold you back.',24,true),
('b2','The Midnight Library','Matt Haig','Fiction',349,450,4.6,1620,'https://images-na.ssl-images-amazon.com/images/I/81tCtHFtOgL.jpg','Between life and death there is a library, and within that library, the shelves go on forever.',12,true),
('b3','Deep Work','Cal Newport','Productivity',429,550,4.7,987,'https://images-na.ssl-images-amazon.com/images/I/81JJ7fyyKyS.jpg','Rules for focused success in a distracted world.',18,true),
('b4','Ikigai','Héctor García & Francesc Miralles','Personal Growth',299,399,4.5,1204,'https://images-na.ssl-images-amazon.com/images/I/71tbalAHYCL.jpg','Discover the Japanese secret to a long and happy life.',31,false),
('b5','The Psychology of Money','Morgan Housel','Finance',379,499,4.8,1923,'https://images-na.ssl-images-amazon.com/images/I/71g2ednj0JL.jpg','Timeless lessons on wealth, greed, and happiness.',9,false),
('b6','Dune','Frank Herbert','Sci-Fi',499,650,4.7,2311,'https://images-na.ssl-images-amazon.com/images/I/81ym3QUd3KL.jpg','A landmark science-fiction epic set on the desert planet Arrakis.',14,false),
('b7','Educated','Tara Westover','Memoir',389,499,4.6,842,'https://images-na.ssl-images-amazon.com/images/I/81WojUbbb7L.jpg','A memoir about education, family, and the struggle for self-invention.',7,false),
('b8','The Creative Act','Rick Rubin','Creativity',599,799,4.9,734,'https://images-na.ssl-images-amazon.com/images/I/71pWzhdJNwL.jpg','A beautiful meditation on the creative process and making art.',16,false)
on conflict (id) do nothing;
