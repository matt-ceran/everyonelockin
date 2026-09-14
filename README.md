# everyonelockin

A little corner of the internet for getting things done together.
everyonelockin brings a shared task board, a backlog, ownership, labels, and helping hands into one workspace.
Its visual language draws from illustrated websites of the mid-1990s: bold mastheads, rectangular navigation, pressed edges, small graphics, and readable pages.

## Phase one

- Create, edit, prioritize, and archive tasks.
- Assign one owner and let people volunteer to help separately.
- Move tasks through Backlog, Up next, In progress, In review, and Done.
- Drag cards between columns or use their keyboard-accessible Move controls.
- Filter by label, owner, or search; switch between the board, backlog, personal work, and activity.
- Save changes to PostgreSQL with version checks, request deduplication, and transactional activity records.
- Use the same interface on desktop and phone, with a reduced-motion option.

This first phase is a local development workspace with fictional teammates and a shared demo identity.
Authentication, invitations, permissions, comments, attachments, and production hosting are future phases.
The development server and database bind to localhost.

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
npm run db:seed
npm run dev
```

Open **http://127.0.0.1:5187**.
The sample credentials in `.env.example` are for a local development database only.
To choose your own password, update both `POSTGRES_PASSWORD` and `DATABASE_URL` in `.env` before the first `db:up`.
Existing PostgreSQL volumes retain the password used when they were initialized.

The seed adds fourteen sample tasks and four fictional members.
Running it again preserves existing tasks.
Changes survive a browser refresh or application restart because PostgreSQL stores them in the `everyonelockin-data` Docker volume.
Stop the database with `docker stop everyonelockin-db`; start it again with `npm run db:up`.

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
The preview still uses the development identity and localhost restriction.
