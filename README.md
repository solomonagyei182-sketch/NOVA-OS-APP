# NOVA OS

Business management platform — sales, inventory, customers, calculations, and reports for a retail business, with role-based access for Managers and Counter staff.

## Stack

- **Backend:** NestJS + Prisma + SQLite, JWT auth (httpOnly cookie), Socket.IO for live sync
- **Frontend:** React + Vite + TypeScript + Tailwind CSS, TanStack Query, React Router, React Hook Form + Zod, Recharts

## Local development

Two terminals, run from the repo root:

```bash
cd backend && npm install && npm run prisma:migrate && npm run db:seed && npm run start:dev
```

```bash
cd frontend && npm install && npm run dev
```

Frontend runs at `http://localhost:5173` (proxies `/api` and `/socket.io` to the backend on port 4000).

Seeded accounts (password for both: `password123`):
- `manager@nova-os.local` — Manager role
- `counter@nova-os.local` — Counter role

## Environment variables

See `backend/.env.example`. Copy to `backend/.env` and set a real `JWT_SECRET` before deploying.

## Deploying

The backend is a standard Node/NestJS app (see `backend/Dockerfile`) that serves the SQLite database from a file — mount a persistent volume at `backend/prisma/dev.db`'s directory so data survives redeploys. Point `DATABASE_URL` and `FRONTEND_URL` at your production values. To move to PostgreSQL later, change the `datasource.provider` in `backend/prisma/schema.prisma` and the `DATABASE_URL` — the rest of the app is unaffected.

The frontend builds to static files (`npm run build` in `frontend/`) that can be served from any static host, with `/api` and `/socket.io` proxied or CORS-configured to point at the deployed backend.
