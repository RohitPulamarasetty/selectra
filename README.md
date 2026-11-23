# Selectra

An admissions workspace for applications, independent reviews, and shortlists. The demo includes eight fictional applications.

## Run locally

With Node.js 22.12 or newer, run `npm run demo` and open **http://localhost:3000**. The terminal prints paths to the generated sign-ins under `.selectra-data`.

## Load demo data into Neon

1. Open **Connect** in Neon. Select the branch and database your Vercel app will use, then copy the pooled connection string.
2. Set that string as `DATABASE_URL` in `.env.local` and in Vercel.
3. Run `npm ci`, then `npm run setup -- --hosted` from the project folder. This creates the tables, eight applications, and demo accounts. The terminal prints where to find their passwords.
4. Check **Tables → public → applications** in Neon. Use the new hosted credentials to sign in on Vercel.

Start with a fresh Neon database for the demo. Running setup again keeps the existing records and accounts.
