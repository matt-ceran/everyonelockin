import { Link, NavLink } from "react-router";
import { useState, type ReactNode } from "react";
import { Avatar } from "../../components/avatar";
import { Icon, type IconName } from "../../components/icon";
import { useWorkspace } from "./context";

const links: { to: string; title: string; icon: IconName }[] = [
  { to: "/", title: "The board", icon: "board" },
  { to: "/backlog", title: "Backlog", icon: "backlog" },
  { to: "/my-tasks", title: "My work", icon: "person" },
  { to: "/activity", title: "What's new", icon: "activity" },
];

export function Shell({ children }: { children: ReactNode }) {
  const { workspace, busy, result, refresh } = useWorkspace();
  const [motion, setMotion] = useState(true);
  const complete = workspace.tasks.filter((t) => t.status === "done").length;
  return (
    <div className={`site-frame ${motion ? "motion-on" : "motion-off"}`}>
      <a className="skip-link" href="#main">
        Skip to the work
      </a>
      <div className="utility-strip">
        <span>YOUR LITTLE CORNER OF THE INTERNET</span>
        <span className="local-label">
          LOCAL DEMO <span aria-hidden="true">/</span> Saved on this computer
        </span>
      </div>
      <header className="masthead">
        <Link to="/" className="wordmark" aria-label="everyonelockin home">
          everyone<span>lockin</span>
          <b>.com</b>
        </Link>
        <div className="masthead-aside">
          <img
            className="brand-star"
            src="/art/star.png"
            width="92"
            height="92"
            alt=""
          />
          <div>
            <strong>All together now.</strong>
            <span>{workspace.members.length} people. One place.</span>
          </div>
        </div>
      </header>
      <div className="navigation-row">
        <nav aria-label="Workspace navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              className={({ isActive }) =>
                `nav-button ${isActive ? "is-active" : ""}`
              }
            >
              <Icon name={link.icon} />
              <span>{link.title}</span>
            </NavLink>
          ))}
        </nav>
        <Link to="/my-tasks" className="profile-link">
          <Avatar
            member={workspace.members.find(
              (m) => m.id === workspace.currentMemberId,
            )}
            small
          />
          <span>My corner</span>
        </Link>
      </div>
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="footer-progress">
          <span className="tiny-stamp">E.L.I.</span>
          <span>
            {complete} of {workspace.tasks.length} tasks done
          </span>
          <span className="progress-track" aria-hidden="true">
            <span
              style={{
                width: `${workspace.tasks.length ? (complete / workspace.tasks.length) * 100 : 0}%`,
              }}
            />
          </span>
        </div>
        <div className="footer-controls">
          <button
            type="button"
            className="text-button"
            onClick={refresh}
            disabled={busy}
          >
            <Icon name="refresh" size={14} />
            Refresh
          </button>
          <label>
            <input
              type="checkbox"
              checked={motion}
              onChange={(e) => setMotion(e.target.checked)}
            />{" "}
            Little animations
          </label>
        </div>
      </footer>
      <div
        className={`save-status ${result && !result.ok ? "has-error" : ""}`}
        role={result && !result.ok ? "alert" : "status"}
        aria-live="polite"
      >
        {busy
          ? "Saving your changes..."
          : (result?.message ??
            "A place for the work. And the people behind it.")}
        {result && !result.ok && result.conflict && (
          <button type="button" className="text-button" onClick={refresh}>
            Refresh latest tasks
          </button>
        )}
      </div>
    </div>
  );
}
