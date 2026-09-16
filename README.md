# everyonelockin

A little corner of the internet for getting things done together.
everyonelockin brings a shared task board, a backlog, ownership, labels, and helping hands into one workspace.
Its visual language draws from illustrated websites of the mid-1990s: bold mastheads, rectangular navigation, pressed edges, small graphics, and readable pages.

## What it does

- Create a lock-in with an invite code, share the link, and have teammates join.
- Each member picks a per-lock-in username, password, and gamer icon.
- Create, edit, prioritize, archive, restore, and permanently delete tasks.
- Define your own label categories with colors; rename them anytime.
- Assign one owner and let people volunteer to help separately.
- Move tasks through Backlog, Up next, In progress, In review, and Done.
- Drag cards between columns or use their keyboard-accessible Move controls.
- Filter by label, owner, or search; switch between the board, backlog, personal work, and activity.
- Save changes to PostgreSQL with version checks, request deduplication, and transactional activity records.
- Use the same interface on desktop and phone, with a reduced-motion option.

Roles are labels for now and carry no permissions. Comments, attachments, and notifications are future work.

## Run locally

Use Node.js 24 LTS and a running Docker engine.
The database script uses the Docker CLI directly; Docker Compose is not required.

```sh
git clone https://github.com/matt-ceran/everyonelockin.git
cd everyonelockin
cp .env.example .env
npm ci
npm run db:up
npm run db:migrate
npm run dev
```

Open **http://127.0.0.1:5187** and create a lock-in to get started.
The sample credentials in `.env.example` are for a local development database only.
To choose your own password, update both `POSTGRES_PASSWORD` and `DATABASE_URL` in `.env` before the first `db:up`.
Existing PostgreSQL volumes retain the password used when they were initialized.

Changes survive a browser refresh or application restart because PostgreSQL stores them in the `everyonelockin-data` Docker volume.
Stop the database with `docker stop everyonelockin-db`; start it again with `npm run db:up`.

Gamer icons live in `public/gamer-icons/` and are git-ignored. Drop square images there and they show up in the picker automatically.

## Project structure

```text
app/
  components/          Shared visual primitives
  modules/
    tasks/             Task rules, commands, persistence, and views
    workspace/         Workspace context, navigation, and sample content
  platform/
    db/                Database schema and connection lifecycle
  routes/              Page loaders, route composition, and HTTP actions
  styles/              Design tokens and component styles
db/migrations/         Generated, versioned SQL migrations
docs/                  Architecture and design conventions
public/                Original artwork and static assets
scripts/               Database lifecycle and seed commands
tests/app/             Domain tests and browser workflows
```

The application uses TypeScript, React, React Router Framework Mode, Drizzle, and PostgreSQL.
See [the architecture guide](docs/architecture.md) for module boundaries and data flow, and [the design guide](docs/design.md) for visual conventions.

## Development checks

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

`check` runs formatting, type checking, linting, unit tests, and a production build.
Browser tests create a temporary PostgreSQL database, apply migrations, seed it, and launch a separate production-build server on port 5188.
The test database is removed when the run finishes, keeping the development workspace unchanged.
They require a running local database and a database user allowed to create databases, as provided by `npm run db:up`.
To use an installed Google Chrome locally, run `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`.
GitHub Actions runs the checks against an isolated PostgreSQL service.

Run `npm run format` to format source files.
After changing the database schema, run `npm run db:generate`, review the generated migration, and apply it with `npm run db:migrate`.
Keep generated migrations intact once applied.

For a local production-build preview, stop the development server, run `npm run build`, then `npm start`.

## Deploy to Fly.io

The app ships with a `Dockerfile` and `fly.toml`. The cheapest path is a free Neon Postgres database plus a Fly app.

```sh
fly auth signup
```

Create a free project at https://neon.tech (US West region) and copy the pooled connection string. Then:

```sh
fly secrets set DATABASE_URL="postgres://..." --app everyonelockin
fly deploy
```

Migrations run automatically on each deploy through the release command.
Point your domain at the app, then issue certificates:

```sh
fly certs add everyonelockin.com
fly certs add www.everyonelockin.com
```

Add the DNS records Fly shows you in Namecheap (Advanced DNS), wait for the certificates to validate, and the site is live.
Deploy from the machine that holds your `public/gamer-icons/` images so they ship inside the image.
