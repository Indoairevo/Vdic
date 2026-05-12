# Run the VDIC ERP locally

1. Install dependencies:

```bash
npm install
```

2. (Optional) Seed the local SQLite DB:

```bash
node server/seed.js
```

3. Start the full-stack dev server (Express API + Vite UI):

```bash
npm run dev
```

4. Open http://localhost:3000.

Notes:
- The UI and API are served together from the same origin. Set `VITE_API_BASE` only if you are pointing the UI to a separate API host.
- The `src/App.jsx` contains your ERP UI. Some very long repeated dashboard code was reduced to placeholders to keep the scaffold concise — paste back any missing detailed blocks into `src/App.jsx` as needed.
- The AI integration function expects an API key; set `GEMINI_API_KEY` in your env or update the code before using that feature.
- Set `JWT_SECRET` in env for production.

API basics:
- `POST /auth/login` with JSON `{ "userId": "admin", "key": "admin123" }` to authenticate.
- `GET /api/me` (requires header `x-access-token: <token>` or `Authorization: Bearer <token>`)
- `GET /api/notices`, `POST /api/notices` (admin only)
- `GET /api/homeworks`, `POST /api/homeworks` (teacher only)
- `GET /api/users`, `POST /api/users` (admin only)
- `GET /api/finances` (admin only)

Docker & Postgres (quick start):

1. Build and start services with Docker Compose:

```bash
docker compose up --build -d
```

2. Run migrations (inside the server container or locally with `DATABASE_URL` env):

```bash
# from repo root (uses env in docker-compose)
docker compose exec server node migrate_pg.cjs
```

3. Seed the Postgres DB:

```bash
docker compose exec server node seed_pg.cjs
```

4. (Optional) View server logs:

```bash
docker compose logs -f server
```

Notes:
- The API issues JWT tokens on `/auth/login`. Use `Authorization: Bearer <token>` for API requests.
