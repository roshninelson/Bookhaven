-- ============================================================================
-- BookHaven Supabase Migration & 22-Book Seed Script
-- Run this in your Supabase Project -> SQL Editor -> Click 'Run'
-- Idempotent: safe to run multiple times without duplicate records or errors
-- ============================================================================

-- 1. Ensure required extensions exist
create extension if not exists pgcrypto;

-- 2. Ensure public.books table exists with all expected columns
create table if not exists public.books (
  id text primary key,
  title text not null,
  author text not null,
  category text not null,
  price integer not null check (price >= 0),
  old_price integer check (old_price is null or old_price >= price),
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count integer not null default 0 check (review_count >= 0),
  isbn text,
  cover_url text,
  description text not null default '',
  stock integer not null default 0 check (stock >= 0),
  featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure isbn column exists if table was created previously without it
alter table public.books add column if not exists isbn text;

-- 3. Ensure categories table exists
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- 4. Enable Row Level Security (RLS) safely on public.books
alter table public.books enable row level security;
alter table public.categories enable row level security;

-- 5. Policies: Allow public anonymous and authenticated read access to active books
drop policy if exists "Anyone can read active books" on public.books;
create policy "Anyone can read active books"
  on public.books
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories"
  on public.categories
  for select
  to anon, authenticated
  using (true);

-- 6. Grant select permissions to anon and authenticated roles
grant usage on schema public to anon, authenticated;
grant select on public.books to anon, authenticated;
grant select on public.categories to anon, authenticated;

-- 7. Seed all 21 categories matching the 22-book catalogue
insert into public.categories (name, slug) values
  ('Personal Growth', 'personal-growth'),
  ('Fiction', 'fiction'),
  ('Productivity', 'productivity'),
  ('Finance', 'finance'),
  ('Sci-Fi', 'sci-fi'),
  ('Memoir', 'memoir'),
  ('Creativity', 'creativity'),
  ('Fantasy', 'fantasy'),
  ('Science Fiction', 'science-fiction'),
  ('Mystery', 'mystery'),
  ('Thriller', 'thriller'),
  ('Romance', 'romance'),
  ('Historical Fiction', 'historical-fiction'),
  ('Horror', 'horror'),
  ('Biography/Memoir', 'biography-memoir'),
  ('Self-Help', 'self-help'),
  ('Business', 'business'),
  ('Psychology', 'psychology'),
  ('Philosophy', 'philosophy'),
  ('Classic Literature', 'classic-literature'),
  ('Travel/Adventure', 'travel-adventure')
on conflict (slug) do update set name = excluded.name;

-- 8. Seed / Upsert all 22 BookHaven catalogue books (avoids duplicates on re-runs)
insert into public.books (
  id, title, author, category, price, old_price, rating, review_count, isbn, cover_url, description, stock, featured, is_active
) values
  ('b1', 'Atomic Habits', 'James Clear', 'Personal Growth', 399, 499, 4.8, 2841, '978-0735211292', 'https://images-na.ssl-images-amazon.com/images/I/81wgcld4wxL.jpg', 'Tiny changes, remarkable results. An easy and proven way to build good habits and break bad ones. Learn how small changes in behaviour can lead to remarkable results in your life.', 24, true, true),
  ('b2', 'The Midnight Library', 'Matt Haig', 'Fiction', 349, 450, 4.6, 1620, '978-0525559474', 'https://images-na.ssl-images-amazon.com/images/I/81tCtHFtOgL.jpg', 'Between life and death there is a library, and within that library, the shelves go on forever. Every book provides a chance to try another life you could have lived.', 12, true, true),
  ('b3', 'Deep Work', 'Cal Newport', 'Productivity', 429, 550, 4.7, 987, '978-1455586691', 'https://images-na.ssl-images-amazon.com/images/I/81JJ7fyyKyS.jpg', 'Rules for focused success in a distracted world. Deep work is the ability to focus without distraction on a cognitively demanding task.', 18, true, true),
  ('b4', 'Ikigai', 'Héctor García & Francesc Miralles', 'Personal Growth', 299, 399, 4.5, 1204, '978-0143130727', 'https://images-na.ssl-images-amazon.com/images/I/71tbalAHYCL.jpg', 'Discover the Japanese secret to a long and happy life. Ikigai reveals the secrets of the centenarians of Okinawa.', 31, false, true),
  ('b5', 'The Psychology of Money', 'Morgan Housel', 'Finance', 379, 499, 4.8, 1923, '978-0857197689', 'https://images-na.ssl-images-amazon.com/images/I/71g2ednj0JL.jpg', 'Timeless lessons on wealth, greed, and happiness. Doing well with money has little to do with how smart you are and a lot to do with how you behave.', 9, false, true),
  ('b6', 'Dune', 'Frank Herbert', 'Sci-Fi', 499, 650, 4.7, 2311, '978-0441172719', 'https://images-na.ssl-images-amazon.com/images/I/81ym3QUd3KL.jpg', 'A landmark science-fiction epic set on the desert planet Arrakis. It is the saga of a young hero navigating political intrigue, religious zealotry, and ecology.', 14, false, true),
  ('b7', 'Educated', 'Tara Westover', 'Memoir', 389, 499, 4.6, 842, '978-0399590504', 'https://images-na.ssl-images-amazon.com/images/I/81WojUbbb7L.jpg', 'A memoir about education, family, and the struggle for self-invention. A coming-of-age story about the power of knowledge.', 7, false, true),
  ('b8', 'The Creative Act', 'Rick Rubin', 'Creativity', 599, 799, 4.9, 734, '978-0593652886', 'https://images-na.ssl-images-amazon.com/images/I/71pWzhdJNwL.jpg', 'A beautiful meditation on the creative process and making art. A way of being that illuminates your world.', 16, false, true),
  ('b9', 'The Hobbit', 'J. R. R. Tolkien', 'Fantasy', 399, 499, 4.8, 4210, '978-0547928227', 'https://images-na.ssl-images-amazon.com/images/I/710+5dpZ+hL.jpg', 'A glorious adventure set in Middle-earth. Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, until Gandalf and a company of dwarves arrive on his doorstep.', 20, true, true),
  ('b10', 'Project Hail Mary', 'Andy Weir', 'Science Fiction', 479, 599, 4.9, 3120, '978-0593135204', 'https://images-na.ssl-images-amazon.com/images/I/91dS2rbhGfL.jpg', 'Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he fails, humanity and the earth itself are doomed.', 15, true, true),
  ('b11', 'The Thursday Murder Club', 'Richard Osman', 'Mystery', 399, 499, 4.5, 1845, '978-0241988268', 'https://images-na.ssl-images-amazon.com/images/I/81Pj0rX86OL.jpg', 'In a peaceful retirement village, four unlikely friends meet weekly in the Jigsaw Room to investigate unsolved crimes. When a local property developer is found dead, the club finds itself in the middle of its first live case.', 18, false, true),
  ('b12', 'The Silent Patient', 'Alex Michaelides', 'Thriller', 359, 499, 4.6, 3510, '978-1250301696', 'https://images-na.ssl-images-amazon.com/images/I/81JyAfLRxUL.jpg', 'Alicia Berenson’s life is seemingly perfect. One evening she shoots her husband five times in the face and never speaks another word. Theo Faber is a criminal psychotherapist determined to unravel her motive.', 14, false, true),
  ('b13', 'The Love Hypothesis', 'Ali Hazelwood', 'Romance', 349, 450, 4.4, 2210, '978-0593336823', 'https://images-na.ssl-images-amazon.com/images/I/71u9s8Jg5sL.jpg', 'When a fake-relationship between scientists meets the irresistible force of attraction, it throws one woman’s carefully calculated theories on love into chaos.', 22, false, true),
  ('b14', 'The Book Thief', 'Markus Zusak', 'Historical Fiction', 399, 550, 4.8, 4890, '978-0375842207', 'https://images-na.ssl-images-amazon.com/images/I/91p530yc27L.jpg', 'Set in Germany in 1939, Liesel Meminger is a foster girl living outside of Munich who scratches out an existence for herself by stealing when she encounters something she cannot resist–books. Narrated by Death.', 16, true, true),
  ('b15', 'Mexican Gothic', 'Silvia Moreno-Garcia', 'Horror', 429, 550, 4.3, 1320, '978-0525620785', 'https://images-na.ssl-images-amazon.com/images/I/81tCtHFtOgL.jpg', 'An isolated mansion. A chillingly charismatic aristocrat. And a brave socialite drawn to uncover the treacherous secrets lurking in the dark halls of High Place.', 12, false, true),
  ('b16', 'Becoming', 'Michelle Obama', 'Biography/Memoir', 549, 699, 4.8, 5120, '978-1524763138', 'https://images-na.ssl-images-amazon.com/images/I/81h2gWPTY6L.jpg', 'In a life filled with meaning and accomplishment, Michelle Obama has emerged as one of the most iconic and compelling women of our era.', 25, true, true),
  ('b17', 'The Power of Habit', 'Charles Duhigg', 'Self-Help', 379, 499, 4.6, 3200, '978-0812981605', 'https://images-na.ssl-images-amazon.com/images/I/71ONrOzq4qL.jpg', 'A fascinating exploration of why habits exist and how they can be changed. Transforming habit loops unlocks business agility, personal health, and creative success.', 19, false, true),
  ('b18', 'The Lean Startup', 'Eric Ries', 'Business', 489, 650, 4.5, 2450, '978-0307887894', 'https://images-na.ssl-images-amazon.com/images/I/81-QB7nDh4L.jpg', 'Most startups fail. But many of those failures are preventable. The Lean Startup approach fosters companies that are both more capital efficient and leverage human creativity more effectively.', 17, false, true),
  ('b19', 'Thinking, Fast and Slow', 'Daniel Kahneman', 'Psychology', 469, 599, 4.7, 3890, '978-0374533557', 'https://images-na.ssl-images-amazon.com/images/I/71wvKXWfcML.jpg', 'In this international bestseller, Daniel Kahneman takes us on a groundbreaking tour of the mind, explaining the two systems that drive the way we think: System 1 (fast, intuitive) and System 2 (slow, deliberative).', 18, true, true),
  ('b20', 'Meditations', 'Marcus Aurelius', 'Philosophy', 299, 399, 4.8, 4620, '978-0140449334', 'https://images-na.ssl-images-amazon.com/images/I/81bsw6fnUiL.jpg', 'The personal writings of the Roman Emperor Marcus Aurelius, setting forth Stoic philosophy as a practical tool for self-discipline, ethical clarity, and serenity amid chaos.', 24, true, true),
  ('b21', 'Pride and Prejudice', 'Jane Austen', 'Classic Literature', 249, 350, 4.7, 6100, '978-0141439518', 'https://images-na.ssl-images-amazon.com/images/I/71Q1tPupKjL.jpg', 'The romantic clash between the opinionated Elizabeth Bennet and her proud aristocratic beau, Mr. Darcy, remains one of the greatest masterpieces of English literature.', 30, false, true),
  ('b22', 'Into the Wild', 'Jon Krakauer', 'Travel/Adventure', 389, 499, 4.6, 2150, '978-0385486804', 'https://images-na.ssl-images-amazon.com/images/I/81NwYZ6VZTL.jpg', 'In April 1992 a young man from a well-to-do family hitchhiked to Alaska and walked alone into the wilderness north of Mt. McKinley. An unforgettable journey of human longing and wilderness truth.', 13, false, true)
on conflict (id) do update set
  title = excluded.title,
  author = excluded.author,
  category = excluded.category,
  price = excluded.price,
  old_price = excluded.old_price,
  rating = excluded.rating,
  review_count = excluded.review_count,
  isbn = excluded.isbn,
  cover_url = excluded.cover_url,
  description = excluded.description,
  stock = excluded.stock,
  featured = excluded.featured,
  is_active = excluded.is_active,
  updated_at = now();
