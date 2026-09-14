# Application architecture

everyonelockin is a modular monolith: one React Router application, one PostgreSQL database, and explicit boundaries between the interface, task rules, and infrastructure.
The board, backlog, personal work, and activity read the same workspace data.
Workspace reads use a repeatable-read transaction so tasks, helpers, and labels come from one database snapshot.

## Boundaries

| Location | Responsibility |
| --- | --- |
| `app/routes` | HTTP requests, loaders, route composition, and redirects |
| `app/modules/tasks/model.ts` | Shared task types, statuses, filtering, and ordering |
| `app/modules/tasks/commands.ts` | Validated command contracts |
| `app/modules/tasks/service.server.ts` | Authoritative task changes and transaction rules |
| `app/modules/tasks/repository.server.ts` | Workspace reads and browser-safe snapshots |
| `app/modules/workspace` | Workspace presentation and client interaction state |
| `app/platform/db` | Database schema, pool, and server-only persistence setup |

Server-only modules use the `.server.ts` suffix and stay out of client bundles.
Views send intent to the server instead of writing database-shaped objects directly.
The optimistic projection is temporary; successful requests revalidate the authoritative snapshot.

## Write protocol

1. Validate the development host, same-origin request, and command payload.
2. Begin a transaction and lock the board row before changing any task or ordering position.
3. Check workspace membership and any prior receipt for this actor and mutation ID.
4. Validate referenced owners and labels within the workspace.
5. For existing tasks, compare the submitted version with the stored version.
6. Apply the change, record activity, and save the receipt in the same transaction.
7. Return the result or redirect to the saved task, then refresh the workspace snapshot.

A stale version returns HTTP 409 instead of silently overwriting newer work.
An identical request with the same mutation ID returns its previous result without applying it again.
Reusing that ID for a different payload is rejected.
The client preserves an unsaved edit when a command fails.

Ordering uses integer positions assigned by the server.
Moving a task places it before an identified sibling or appends it to the destination column.
When gaps become too small, the same board lock protects a rank rebalance.
The lock serializes writes within one board and can be revisited if measured contention warrants finer locking.

## Data model

Workspaces contain boards, members, labels, tasks, and activity.
A task has one optional owner, multiple labels, and multiple helpers.
Ownership and volunteering are separate relationships.
Composite foreign keys keep task relationships within their workspace.
Archiving removes a task from active views while retaining its history.

The first phase loads a complete small workspace and up to the latest hundred activity entries.
Visible board and list views refresh every fifteen seconds and when the window regains focus.
Automatic refresh pauses inside task dialogs to keep a draft stable.
This is polling, and other browsers may need a refresh to see a recent change.
Server-sent change notifications, pagination, and background notification jobs can be added behind the existing module boundaries.

## Development boundary

The current actor is a fixed fictional member in one demo workspace.
Both the app and database use loopback bindings, and demo requests require `DEMO_MODE=true` and a localhost URL.
Those development checks do not provide production authentication or tenant authorization.

The next phase should introduce authenticated sessions, workspace invitations, roles, and authorization tests before any hosted team usage.
It should also define the production deployment, database backups, migrations, monitoring, and recovery process.
