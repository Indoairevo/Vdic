# Run the VDIC ERP locally

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

3. Open the URL printed by Vite (typically http://localhost:5173).

Notes:
- This scaffold uses the Tailwind CDN in `index.html` for styling so you can iterate quickly.
- The `src/App.jsx` contains your ERP UI. Some very long repeated dashboard code was reduced to placeholders to keep the scaffold concise — paste back any missing detailed blocks into `src/App.jsx` as needed.
- The AI integration function expects an API key; set it in your env or update the code before using that feature.

Server (API) setup:

1. Change directory to the server folder and install dependencies:

```bash
cd server
npm install
```

2. Seed the database with initial users and data:

```bash
npm run seed
```

3. Start the server:

```bash
npm start
```

The API will run on port `4000` by default. Available endpoints (basic):
- `POST /auth/login` with JSON `{ "key": "your-token" }` to authenticate.
- `GET /api/me` (requires header `x-access-token: <key>` or `Authorization: Bearer <key>`)
- `GET /api/notices`, `POST /api/notices` (admin only)
- `GET /api/homeworks`, `POST /api/homeworks` (teacher only)
- `GET /api/users`, `POST /api/users` (admin only)
- `GET /api/finances` (admin only)

You can point the React frontend to this backend by changing fetch URLs to `http://localhost:4000`.

Docker & Postgres (quick start):

1. Build and start services with Docker Compose:

```bash
docker compose up --build -d
```

2. Run migrations (inside the server container or locally with `DATABASE_URL` env):

```bash
# from repo root (uses env in docker-compose)
docker compose exec server node migrate_pg.js
```

3. Seed the Postgres DB:

```bash
docker compose exec server node seed_pg.js
```

4. (Optional) View server logs:

```bash
docker compose logs -f server
```

Notes:
- The API now issues JWT tokens on `/auth/login`. Use `Authorization: Bearer <token>` for API requests.
- Set `JWT_SECRET` in env for production.

