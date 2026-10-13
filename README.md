# Ebb: the budget that moves with your money

Ebb is a budgeting app for people with irregular income, such as gig workers, casual staff and students who freelance. You enter your bills, log the money you earned and what you spent. Ebb gives you one number, your **safe-to-spend**, and a plain-English line explaining why it changed. If an expense would dip into your savings buffer, Ebb calmly pauses it.

BUS4012 Vibe Coding for Startups · Assignment 3 · Syed Faris Ahmed Razvi (22870902)

## Architecture

```
 Browser                      Vercel                                Supabase
┌──────────────┐  /api/...  ┌───────────────────────────┐  HTTPS   ┌──────────────────────┐
│ React + Vite │ ─────────► │ Python FastAPI            │ ───────► │ Auth (email+password)│
│ (frontend)   │ ◄───────── │ api/index.py              │ ◄─────── │ Postgres + RLS       │
│ no keys here │   JSON     │ keys in env variables     │          │ budgets, check_ins   │
└──────────────┘            └───────────────────────────┘          └──────────────────────┘
```

- **Frontend (React 19, TypeScript, Tailwind v4).** It holds the screens and calls only our own `/api/...` routes.
- **Backend (Python, FastAPI).** It handles sign-up and login through Supabase Auth, checks the login token on every request, calculates safe-to-spend on the server, and reads and writes the database.
- **Database (Supabase Postgres).** It has two tables, `budgets` and `check_ins`, both protected by Row Level Security.
- **Hosting (Vercel).** One project serves both the React build and the Python serverless function. `vercel.json` routes `/api/*` to the Python backend.

## Security

- **No keys in the frontend.** The Supabase URL and key are read from environment variables in `api/index.py`, and the React bundle contains neither.
- **Least privilege.** The backend uses the low-privilege anon/publishable key. The secret service-role key is never used.
- **Row Level Security.** Every database call carries the user's own login token, so Postgres itself only returns that user's rows.
- **Server-side validation.** Pydantic rejects negative amounts, unknown categories and invalid emails.
- **Minimal data.** Only the numbers the calculation needs are stored. There are no names and no bank details.
- **Passwords.** These are handled by Supabase Auth and never stored by Ebb.
- **Real deletion.** "Wipe my data" deletes every row the user owns and ends the session.
- **Ignored secrets.** `.env` is in `.gitignore`, and only `.env.example` (with no real values) is committed.

## Screens

1. **Log in / Create account.** Signing up requires consent.
2. **Set up your bills.** These are saved to `budgets` and loaded automatically next time.
3. **Log income.**
4. **Log expense.** "Calculate & save" sends the data to Python, which does the maths and saves a `check_ins` row.
5. **Result.** Either the safe-to-spend with an animated number and a "how is this calculated?" breakdown, or a calm "Hold on a moment". Both show a privacy receipt.
6. **History (new in A3).** All saved check-ins are loaded back from Supabase.

## Project structure

```
api/index.py          Python backend (FastAPI): all /api routes
supabase/schema.sql   Tables, Row Level Security policies, permissions
src/App.tsx           App state + which screen is showing
src/lib/api.ts        The only file that calls the backend
src/screens/          One file per screen (Login, Bills, Income, Expense, Result, History)
src/components/       Reusable UI: Button, InputField, ScreenCard, Notice, IconAction, WipeDataControl
src/components/ui/    21st.dev Number Ticker
vercel.json           Routes /api/* to Python, deploys to Sydney (syd1)
requirements.txt      Python packages for Vercel
.env.example          Names of the environment variables (no real values)
```

## Run it locally

```bash
# 1. Frontend packages
npm install

# 2. Backend packages
python -m venv .venv
.venv\Scripts\activate            # Windows   (macOS/Linux: source .venv/bin/activate)
pip install -r requirements-dev.txt

# 3. Secrets: copy .env.example to .env and fill in your Supabase values

# 4. Start both (two terminals)
uvicorn api.index:app --port 8000 --reload
npm run dev                        # open http://localhost:5173
```

## Deploy

1. In Supabase, open SQL Editor, run `supabase/schema.sql`, then go to **Authentication → Sign In / Providers → Email** and turn off **Confirm email**.
2. Push to GitHub, then import the repository in Vercel. It detects the framework as **Vite**.
3. In Vercel, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` under **Settings → Environment Variables**.
4. Deploy, then check `https://<your-app>.vercel.app/api/health`. It should show `"supabaseUrlSet": true`.
