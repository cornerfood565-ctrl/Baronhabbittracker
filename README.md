# Baron Habits

A responsive habit tracker built with Next.js 14, TypeScript, Tailwind CSS, Supabase and Lucide icons.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Supabase setup

1. Create a Supabase project.
2. Open **SQL Editor** in the Supabase dashboard and run the SQL in `supabase/schema.sql`.
3. Copy the project URL and **publishable key** from Project Settings → API Keys.
4. Put them in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

5. Add the same two variables in Vercel → Project → Settings → Environment Variables, then redeploy.
6. In Supabase Authentication → URL Configuration, add your local URL and deployed Vercel URL to the allowed redirect URLs.

Never put a database password, service-role key, or secret key in frontend code, GitHub, or a `NEXT_PUBLIC_` variable.

## Current features

- Daily habit dashboard and completion tracking
- Custom habits and categories
- Streak calculations, calendar history and weekly analytics
- Achievement milestones and challenge screens
- Responsive desktop and mobile navigation
- Local browser persistence when signed out
- Supabase email sign-up/sign-in
- Cloud storage of habits and completion logs for signed-in users
- Row Level Security policies in the supplied SQL schema

## Notes

The Supabase schema must be applied to your project before cloud habit storage can work. Email confirmation settings are controlled in Supabase Authentication. Social challenges, scheduled reminders, and Android widgets are not implemented yet.

## Deploy

Import this repository into Vercel. Framework preset: Next.js. Build command: `npm run build`.
