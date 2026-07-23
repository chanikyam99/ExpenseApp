# SplitHouse

SplitHouse is a dark-themed expense sharing app built with Next.js, Supabase, and Tailwind CSS. It helps roommates, travelers, and small groups track shared house expenses, split costs, record settlements, and review spending history.

## Key Features

- Passwordless login using email magic links or Google OAuth via Supabase Auth
- Group creation with invite code generation
- Add expenses with category, date, payer, and equal or custom split support
- View simplified balances to see who owes whom
- Record settle-up payments between group members
- Browse expense history by member and category
- Export expense data as CSV
- Detail view for each expense with split breakdown and activity log

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres backend
- Supabase SSR client for server-side data fetching
- `lucide-react` icons
- `clsx` + `tailwind-merge` for class utilities

## App Structure

- `app/page.tsx` — Login page with email magic link and Google sign-in
- `app/groups/page.tsx` — Group dashboard showing active and archived groups
- `app/groups/new/page.tsx` — Create a new group and join as a member
- `app/groups/[groupId]/page.tsx` — Group dashboard with balances, recent expenses, and quick actions
- `app/groups/[groupId]/expenses/new/page.tsx` — Add a new expense to a group
- `app/groups/[groupId]/expenses/[expId]/page.tsx` — Expense detail view with splits and history
- `app/groups/[groupId]/history/page.tsx` — Expense history with filters and CSV export
- `app/groups/[groupId]/settle/page.tsx` — Record settlement payments between members
- `app/auth/callback/route.ts` — Supabase auth callback route for session exchange

## Database Schema

The app expects a Supabase schema matching the TypeScript definitions in `types/database.ts`.

### Tables

- `groups`
  - `id`, `name`, `invite_code`, `status`, `created_by`, `created_at`
- `group_members`
  - `id`, `group_id`, `user_id`, `display_name`, `avatar_color`, `joined_at`
- `expenses`
  - `id`, `group_id`, `paid_by`, `title`, `amount`, `category`, `date`, `created_by`, `created_at`
- `expense_splits`
  - `id`, `expense_id`, `member_id`, `owed_amount`
- `settlements`
  - `id`, `group_id`, `paid_by`, `paid_to`, `amount`, `note`, `date`, `created_at`
- `activity_log`
  - `id`, `group_id`, `member_id`, `action`, `entity_id`, `description`, `created_at`

## Setup

1. Install dependencies:

```bash
npm install
```

2. Add environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

You can set these in a `.env.local` file at the project root.

3. Run the development server:

```bash
npm run dev
```

4. Open the app in your browser:

```text
http://localhost:3000
```

## Deployment

Build for production:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

## Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Build the app for production
- `npm run start` — Run the built app in production mode
- `npm run lint` — Run ESLint

## Environment Notes

- Supabase client configuration is split between browser and server:
  - `lib/supabase/client.ts` for client-side auth and inserts
  - `lib/supabase/server.ts` for server-side authenticated data fetching
- The app uses cookies and Supabase SSR session exchange in `app/auth/callback/route.ts`
- `next.config.mjs` is configured to ignore ESLint during build

## UX Details

- Currency and date formatting are tailored to Indian locale (`en-IN`)
- Expense categories include groceries, utilities, rent, dining, transport, entertainment, healthcare, and other
- Balances are simplified into minimal owed transactions using `lib/balance.ts`
- The app uses a dark UI with modern rounded cards and accessible controls

## Notes

- Authentication is required for all group and expense pages
- Group membership is determined by `group_members` records
- The app currently assumes a simple member lookup when linking auth users to group members

## License

This repository does not include a license file. Add one if you intend to share the project publicly.
