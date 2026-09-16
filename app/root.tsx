import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import type { ReactNode } from "react";
import "./styles/app.css";

export const meta = () => [
  { title: "everyonelockin - The team workspace" },
  {
    name: "description",
    content:
      "A shared home for your team's tasks, ideas, and work in progress.",
  },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="error-page">
      <p className="eyebrow">EVERYONELOCKIN</p>
      <h1>
        {missing ? "Nothing here just yet." : "We couldn't open the workspace."}
      </h1>
      <p>
        {missing
          ? "That task or page could not be found."
          : "Check that the local database is running, then try again."}
      </p>
      <a className="button button-primary" href="/">
        Back to start
      </a>
    </main>
  );
}
