# Design direction

The interface is a small team's illustrated web headquarters, informed by publishing sites and intranets from roughly 1995-1997.
The work should be easy to find and pleasant to return to.

## Visual conventions

- A yellow masthead carries the serif wordmark and a small original dimensional star.
- Purple navigation, sharp rectangular divisions, and pressed edges establish the page hierarchy.
- Georgia provides display lettering; Arial carries working text; Courier New is reserved for compact metadata.
- Pale task surfaces keep labels, owners, and titles readable against the brighter site identity.
- Underlines, borders, focus outlines, and text communicate interactions and state alongside color.
- Short, stepped animation belongs in decorative artwork; task content stays still.

The stylesheet tokens are in `app/styles/tokens.css`.
Shared page rules live in `workspace.css`, and task surfaces live in `tasks.css`.
Keep new components within those conventions instead of introducing a second visual system.

## Interaction conventions

Task titles open a dialog with a stable URL.
Every draggable task also has a Move control usable with a keyboard or pointer.
Ownership describes responsibility; helping describes voluntary participation.
The backlog uses the same tasks as the board and gives unstarted ideas their own space.

The board changes from four columns to two, then one as the viewport narrows.
Dialogs fit the viewport and scroll internally when needed.
Respect the operating system's reduced-motion preference and the page's animation checkbox.
Use original production artwork and real task counts.
