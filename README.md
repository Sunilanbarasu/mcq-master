# MCQ Master Online
Vercel + Supabase version. Questions and test results sync online after sign-in; local storage remains as an offline fallback.

## 1. Supabase
1. Create a project at Supabase.
2. Open SQL Editor and run `supabase.sql`.
3. In Project > Connect, copy the Project URL and Publishable Key.
4. Copy `.env.example` to `.env.local` and fill in both values.
5. Authentication > Providers: keep Email enabled. For easiest testing you may configure email confirmation as desired.

Never put a Supabase secret/service-role key in this frontend. Use only the publishable key; access is protected by RLS.

## 2. Local run
```bash
npm install
npm run dev
```

## 3. Vercel 24/7 deployment
Push this folder to GitHub and import it in Vercel. In Project Settings > Environment Variables add:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Apply them to Production (and Preview if wanted), then redeploy.

## What is online
- User sign-up/sign-in
- Private per-user question bank
- Unit data and MCQs
- Test-result history
- Same account works across phone/laptop

The static Vercel frontend does not require your laptop to stay on.
