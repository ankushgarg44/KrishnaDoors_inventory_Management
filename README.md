# KrishnaDoors Inventory Management

Mobile-first inventory app (Next.js + Supabase). Each item can be stocked from several companies; the app tracks the quantity for each item–company pair.

## Setup

1. Create a project at https://supabase.com.
2. In **SQL Editor**, run `supabase/schema.sql`.
3. Copy `.env.local.example` to `.env.local` and fill in your Project URL and anon/publishable key (Project Settings → API).
4. `npm install` then `npm run dev` and open http://localhost:3000.

There is no login: anyone who can open the site can view and change stock. Keep the URL private.

## Using it

- Each item card lists every company it comes from with its quantity. Use − / + to change by one, or tap the number to add, remove or set an exact amount.
- **+ Add company** on a card adds another company; the + button adds a new item with several companies at once.
