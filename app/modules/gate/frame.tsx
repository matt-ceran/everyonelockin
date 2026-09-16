import { Link } from "react-router";
import type { ReactNode } from "react";

export function GateFrame({
  asideTitle,
  asideNote,
  children,
  footerNote,
}: {
  asideTitle: string;
  asideNote: string;
  children: ReactNode;
  footerNote: string;
}) {
  return (
    <div className="site-frame motion-on">
      <a className="skip-link" href="#main">
        Skip to the content
      </a>
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
            <strong>{asideTitle}</strong>
            <span>{asideNote}</span>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="gate-main">
        {children}
      </main>
      <footer className="site-footer">
        <span>{footerNote}</span>
        <span>E.L.I.</span>
      </footer>
    </div>
  );
}
