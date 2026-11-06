# KrishnaDoors Inventory Management

Mobile-first inventory app (Next.js + Supabase). Each item can be stocked from several companies; the app tracks the quantity for each item–company pair.

## Setup

1. Create a project at https://supabase.com.
2. In **SQL Editor**, run `supabase/schema.sql`.
3. Copy `.env.local.example` to `.env.local` and fill in your Project URL and anon/publishable key (Project Settings → API).
4. `npm install` then `npm run dev` and open http://localhost:3000.

There is no login: anyone who can open the site can view and change stock. Keep the URL private.

## Using it

- **Items tab**: tap an item to see quantity per company. Use − / + to change by one, or tap the number to add, remove or set an exact amount.
- **+ Company** on an item links another company to it (pick an existing one or type a new one).
- **Companies tab**: add, rename or delete companies and see what each one supplies.
