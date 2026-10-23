# BookHaven — Cloud Bookstore + DevOps Showcase

A polished starter project for a cloud-based online bookstore. It includes a React/Vite storefront, Express API, Supabase/PostgreSQL schema, Docker, GitHub Actions CI, security baseline, and easy-hosting instructions.

> **Deployment status:** Not deployed. This repository is a starter implementation. You must create your own hosting/database accounts, configure environment variables, and run the deployment steps below.

## Features in this starter
- Responsive editorial-style storefront with search, category filters, sort, featured hero, book cards, ratings, stock labels, and quick-add cart.
- Cart drawer with quantity updates, removal, subtotal, and simulated/test checkout (no real payment processing).
- Express REST API for health checks and book listing/search/filtering.
- Supabase/PostgreSQL schema for profiles, books, categories, orders, order items, reviews, and wishlist.
- Security middleware: Helmet, CORS allowlist, request rate limiting, request validation, environment-based secrets.
- Dockerfile and Docker Compose for local API development.
- GitHub Actions CI for frontend build, backend tests, and dependency audit.
- Deployment guide for Vercel (frontend) + Render (API) + Supabase (database), selected for low-friction setup. Free-tier availability/limits may change.

## Stack
- Frontend: React, Vite, TypeScript-free JavaScript, plain CSS
- API: Node.js, Express
- Database: Supabase PostgreSQL
- DevOps: Git, GitHub Actions, Docker, optional Trivy, environment variables
- Hosting: Vercel + Render + Supabase

## Prerequisites
Node.js 20+ and npm. For Docker-based local API runs, Docker Desktop.

## Run locally

### 1) Configure backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```
API runs at `http://localhost:4000`. Without Supabase credentials, the books route returns seeded demo books so the UI can be explored.

### 2) Run frontend
Open a second terminal:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```
Open the Vite URL printed in the terminal. By default, frontend calls `http://localhost:4000/api`.

### 3) Optional: run API in Docker
From the project root:
```bash
docker compose up --build
```

## Database setup
1. Create a Supabase project.
2. Open **SQL Editor** and run `infra/schema.sql`.
3. Copy the project URL and anon key from Supabase project settings.
4. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `backend/.env`.
5. Never expose a Supabase service-role key in the browser or commit secrets.

The starter API uses the Supabase anon key and relies on database RLS policies. For a production system, implement Supabase Auth/JWT verification and role-based admin authorization before enabling writes or order management.

## Easy deployment (Vercel + Render + Supabase)

### A. Database — Supabase
- Create a project and run `infra/schema.sql`.
- Keep the database password private.
- Confirm the `books` table has seeded records from the SQL script.

### B. API — Render
- Push this repository to GitHub.
- In Render, create a **Web Service** from the repository.
- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables:
  - `NODE_ENV=production`
  - `PORT=4000` (Render may inject its own PORT; app honors it)
  - `FRONTEND_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app`
  - `SUPABASE_URL=...`
  - `SUPABASE_ANON_KEY=...`
- Deploy and test `https://YOUR-RENDER-SERVICE.onrender.com/health`.

### C. Frontend — Vercel
- Import the same GitHub repository in Vercel.
- Set Root Directory to `frontend`.
- Build command: `npm run build`; output directory: `dist`.
- Set `VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api`.
- Deploy and test the storefront. Update `FRONTEND_ORIGIN` on Render to the actual Vercel URL.

### D. Verify
- `GET /health` returns `{ "status": "ok" }`.
- Search and category filters work.
- Cart add/remove/quantity actions work.
- Browser devtools show no CORS errors.
- Confirm Render's free service may sleep and cold-start; do not promise always-on production availability on a free tier.

## DevOps / CI
GitHub Actions runs on pushes and pull requests to `main`:
- install dependencies with lockfile when present
- build the frontend
- run backend tests
- run a non-blocking npm audit report

Recommended next improvements:
1. Add branch protection and require CI to pass before merging.
2. Add Trivy image scan and Docker image build/push if you move to container hosting.
3. Add deploy jobs only after setting GitHub environment secrets and environment approvals.
4. Add uptime monitoring and budget alerts.
5. Add a staging environment before production.

## Security checklist before real users
- [ ] Implement Supabase Auth and verify JWTs in API routes.
- [ ] Add admin role checks before catalog mutations.
- [ ] Persist carts/orders server-side and validate prices on the server.
- [ ] Integrate a payment provider's test mode; never store card data.
- [ ] Use database RLS policies and test them with anon/authenticated roles.
- [ ] Add CSRF protections if using cookie-based auth; keep token storage strategy deliberate.
- [ ] Add input validation, request-size limits, rate limiting, dependency updates, backups, and logs.
- [ ] Do not commit `.env` files or keys.

## Project structure
```text
bookhaven/
├── .github/workflows/ci.yml
├── backend/
│   ├── src/index.js
│   ├── src/lib/books.js
│   ├── src/routes/books.js
│   ├── tests/health.test.js
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/App.jsx
│   ├── src/main.jsx
│   ├── src/styles.css
│   └── package.json
├── infra/schema.sql
├── docker-compose.yml
└── README.md
```

## Important scope note
This is a working starter, not a fully production-ready commerce platform. The UI's checkout is explicitly simulated. Authentication, persistent order creation, real payment processing, email delivery, and admin write operations are not enabled until implemented and security-tested.
