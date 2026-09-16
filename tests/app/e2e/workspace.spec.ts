import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function setupLockin(page: Page) {
  const suffix = randomUUID().slice(0, 8);
  const username = `Tester ${suffix}`;
  await page.goto("/");
  await page
    .getByLabel("Name your lock-in", { exact: true })
    .fill(`E2E ${suffix}`);
  await page
    .getByRole("button", { name: "+ Create a new lock-in", exact: true })
    .click();
  await expect(page).toHaveURL(/\/w\/.+\/welcome$/);
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page
    .getByLabel("Password", { exact: true })
    .fill(`signal-strong-${suffix}`);
  await page
    .getByLabel("Repeat password", { exact: true })
    .fill(`signal-strong-${suffix}`);
  await page.getByRole("button", { name: "Lock me in →", exact: true }).click();
  await expect(page).toHaveURL(/\/w\/.+\/pick-icon$/);
  await page.locator(".gamer").first().click();
  await page
    .getByRole("button", { name: "Enter the board →", exact: true })
    .click();
  await expect(page).toHaveURL(/\/w\/[^/]+\/?$/);
  const base = new URL(page.url()).pathname.replace(/\/$/, "");
  return { base, username };
}

async function createTask(
  page: Page,
  base: string,
  title: string,
  username: string,
) {
  await page.goto(`${base}/tasks/new?status=ready`);
  await page.getByLabel("Task title", { exact: true }).fill(title);
  await page
    .getByLabel("A little context")
    .fill("A task created to verify the whole workflow.");
  await page
    .getByRole("combobox", { name: "Owner", exact: true })
    .selectOption({ label: username });
  await page
    .getByRole("checkbox", { name: "Engineering", exact: true })
    .check();
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(title);
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").at(-1)!;
  await page.getByRole("button", { name: "Close task", exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:5188${base}`);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  return id;
}
async function archiveTask(page: Page, base: string, id: string) {
  await page.goto(`${base}/tasks/${id}`);
  await page.getByRole("button", { name: "Archive task", exact: true }).click();
  await page
    .getByRole("button", { name: "Yes, archive task", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("invite link brings a second member into the same lock-in", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const { base } = await setupLockin(page);
  const code = (await page.locator(".share-code").textContent())?.trim();
  expect(code).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{5}$/);
  await page.context().grantPermissions(["clipboard-write", "clipboard-read"]);
  await page.getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(page.getByText("Copied", { exact: true })).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain(`/join/${code}`);
  const other = await browser.newPage();
  try {
    await other.goto(`/join/${code}`);
    await expect(other).toHaveURL(/\/w\/.+\/welcome$/);
    const suffix = randomUUID().slice(0, 8);
    await other
      .getByLabel("Username", { exact: true })
      .fill(`Teammate ${suffix}`);
    await other
      .getByLabel("Password", { exact: true })
      .fill(`signal-strong-${suffix}`);
    await other
      .getByLabel("Repeat password", { exact: true })
      .fill(`signal-strong-${suffix}`);
    await other
      .getByRole("button", { name: "Lock me in →", exact: true })
      .click();
    await expect(other).toHaveURL(/\/w\/.+\/pick-icon$/);
    await other.locator(".gamer").first().click();
    await other
      .getByRole("button", { name: "Enter the board →", exact: true })
      .click();
    await expect(other).toHaveURL(`http://127.0.0.1:5188${base}`);
    await other.reload();
    await expect(other.locator(".share-code")).toHaveText(code!);
  } finally {
    await other.close();
  }
  await page.reload();
  await expect(page.getByText("2 people. One place.")).toBeVisible();
  expect(errors).toEqual([]);
});

test("invite signup and icon flow lead into a working board", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const { base, username } = await setupLockin(page);
  await expect(page.getByRole("link", { name: "My corner" })).toBeVisible();
  const inviteLink = await page
    .getByRole("button", { name: "Refresh", exact: true })
    .isVisible();
  expect(inviteLink).toBe(true);
  expect(username).toContain("Tester");
  expect(base).toMatch(/^\/w\/.+/);
  expect(errors).toEqual([]);
});

test("create, edit, help, move, and reopen a saved task", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const { base, username } = await setupLockin(page);
  const title = `Workflow ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, base, title, username);
  const card = page.locator(`[data-task-id="${id}"]`);
  await card
    .getByRole("button", { name: `Help with ${title}`, exact: true })
    .click();
  await expect(
    card.getByRole("button", {
      name: `Stop helping with ${title}`,
      exact: true,
    }),
  ).toBeEnabled();
  await card.locator("summary").click();
  await card
    .getByRole("button", { name: "To In progress", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "In progress", exact: true })
      .locator(`[data-task-id="${id}"]`),
  ).toBeVisible();
  await expect(page.locator(".save-status")).toContainText("Saved. Moved");
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "In progress", exact: true })
      .locator(`[data-task-id="${id}"]`),
  ).toBeVisible();
  await card.getByRole("link", { name: title, exact: true }).click();
  await page.getByRole("link", { name: "Edit task", exact: true }).click();
  await page.getByLabel("Task title", { exact: true }).fill(`${title} revised`);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(`${title} revised`);
  await expect(
    page.getByRole("link", { name: "Edit task", exact: true }),
  ).toBeVisible();
  await archiveTask(page, base, id);
  expect(errors).toEqual([]);
});

test("board search, backlog, and personal views remain connected", async ({
  page,
}) => {
  const { base, username } = await setupLockin(page);
  const title = `Connected ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, base, title, username);
  await page.goto(base);
  await page
    .getByRole("searchbox", { name: "Find a task" })
    .fill(title.toUpperCase());
  await expect(page.locator(".task-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Backlog", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The backlog",
  );
  await page.getByRole("link", { name: "My work", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My work");
  await expect(
    page.getByText("Owning it", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "What's new", exact: true }).click();
  await expect(page.locator(".activity-row").first()).toBeVisible();
  await archiveTask(page, base, id);
});

test("closing a task returns to the view it was opened from", async ({
  page,
}) => {
  const { base, username } = await setupLockin(page);
  const title = `Return ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, base, title, username);
  const card = page.locator(`[data-task-id="${id}"]`);
  await card.locator("summary").click();
  await card.getByRole("button", { name: "To Backlog", exact: true }).click();
  await expect(page.locator(".save-status")).toContainText("Saved. Moved");

  await page.getByRole("link", { name: "Backlog", exact: true }).click();
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page).toHaveURL(
    `http://127.0.0.1:5188${base}/tasks/${id}?from=backlog`,
  );
  await expect(page.getByRole("dialog")).toContainText(title);
  await page.getByRole("button", { name: "Close task", exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:5188${base}/backlog`);

  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(title);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`http://127.0.0.1:5188${base}/backlog`);

  await page.getByRole("link", { name: "My work", exact: true }).click();
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(title);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`http://127.0.0.1:5188${base}/my-tasks`);

  await page.getByRole("link", { name: "Backlog", exact: true }).click();
  await page.getByRole("link", { name: "New task", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("link", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:5188${base}/backlog`);

  await archiveTask(page, base, id);
});

test("labels can be added, renamed, assigned, and removed", async ({
  page,
}) => {
  const { base, username } = await setupLockin(page);
  const labelName = `Zany ${randomUUID().slice(0, 8)}`;
  const renamed = `${labelName} crew`;
  await page.goto(base);
  await page.getByRole("button", { name: "Edit labels", exact: true }).click();
  await page.getByLabel("New label name", { exact: true }).fill(labelName);
  await page
    .locator(".label-new")
    .getByRole("button", { name: "green", exact: true })
    .click();
  await page.getByRole("button", { name: "Add label", exact: true }).click();
  await expect(page.getByLabel("New label name", { exact: true })).toHaveValue(
    "",
  );
  await page.getByLabel(`Name for ${labelName}`, { exact: true }).fill(renamed);
  const renameRow = page
    .locator(".label-row")
    .filter({ has: page.getByLabel(`Name for ${labelName}`) });
  await renameRow.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByLabel(`Name for ${renamed}`, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: renamed, exact: true }),
  ).toBeVisible();
  const title = `Labeled ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, base, title, username);
  await page.goto(`${base}/tasks/${id}?edit=1`);
  await page.getByRole("checkbox", { name: renamed, exact: true }).check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:5188${base}/tasks/${id}`);
  await expect(page.getByRole("dialog")).toContainText(renamed);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Edit labels", exact: true }).click();
  const deleteRow = page
    .locator(".label-row")
    .filter({ has: page.getByLabel(`Name for ${renamed}`) });
  await deleteRow.getByRole("button", { name: "Delete", exact: true }).click();
  await deleteRow.getByRole("button", { name: "Sure?", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: renamed, exact: true }),
  ).toHaveCount(0);
  await page.goto(`${base}/tasks/${id}`);
  await expect(page.getByRole("dialog")).not.toContainText(renamed);
  await page.keyboard.press("Escape");
  await archiveTask(page, base, id);
});

test("archived tasks can be brought back or deleted forever", async ({
  page,
}) => {
  const { base, username } = await setupLockin(page);
  const title = `Transient ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, base, title, username);
  await page.goto(`${base}/tasks/${id}`);
  await page.getByRole("button", { name: "Archive task", exact: true }).click();
  await page
    .getByRole("button", { name: "Yes, archive task", exact: true })
    .click();
  await expect(page).toHaveURL(`http://127.0.0.1:5188${base}`);
  await page.getByRole("link", { name: "Backlog", exact: true }).click();
  await page.locator(".archived-section > summary").click();
  const row = page.locator(".archived-row", { hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Bring back", exact: true }).click();
  await expect(page).toHaveURL(
    `http://127.0.0.1:5188${base}/tasks/${id}?from=backlog`,
  );
  await expect(page.getByRole("dialog")).toContainText(title);
  await page
    .getByRole("button", { name: "Delete forever", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Yes, delete forever", exact: true })
    .click();
  await expect(page).toHaveURL(`http://127.0.0.1:5188${base}/backlog`);
  await page.getByRole("link", { name: "Backlog", exact: true }).click();
  await expect(page.locator(".archived-section")).toHaveCount(0);
  await page.goto(`${base}/tasks/${id}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Nothing here",
  );
  const second = `Gone ${randomUUID().slice(0, 8)}`;
  const secondId = await createTask(page, base, second, username);
  await page.goto(`${base}/tasks/${secondId}`);
  await page.getByRole("button", { name: "Archive task", exact: true }).click();
  await page
    .getByRole("button", { name: "Yes, archive task", exact: true })
    .click();
  await page.getByRole("link", { name: "Backlog", exact: true }).click();
  await page.locator(".archived-section > summary").click();
  const secondRow = page.locator(".archived-row", { hasText: second });
  await secondRow
    .getByRole("button", { name: "Delete forever", exact: true })
    .click();
  await secondRow.getByRole("button", { name: "Sure?", exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:5188${base}/backlog`);
  await expect(secondRow).toHaveCount(0);
});

test("two browsers see saved moves and stale writes cannot overwrite them", async ({
  page,
}) => {
  const { base, username } = await setupLockin(page);
  const title = `Concurrent ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, base, title, username);
  const other = await page.context().newPage();
  try {
    await other.goto(`http://127.0.0.1:5188${base}/`);
    const card = page.locator(`[data-task-id="${id}"]`);
    const version = Number(await card.getAttribute("data-task-version"));
    const command = {
      intent: "move",
      taskId: id,
      version,
      status: "review",
      beforeId: null,
      mutationId: randomUUID(),
    };
    const options = {
      form: { command: JSON.stringify(command) },
      headers: { Origin: "http://127.0.0.1:5188" },
    };
    const first = await page.request.post(`${base}/resources/tasks`, options);
    expect(first.status()).toBe(200);
    const repeated = await page.request.post(
      `${base}/resources/tasks`,
      options,
    );
    expect(repeated.status()).toBe(200);
    const stale = await other.request.post(
      `http://127.0.0.1:5188${base}/resources/tasks`,
      {
        form: {
          command: JSON.stringify({
            ...command,
            mutationId: randomUUID(),
            status: "done",
          }),
        },
        headers: { Origin: "http://127.0.0.1:5188" },
      },
    );
    expect(stale.status()).toBe(409);
    await other.reload();
    await expect(
      other
        .getByRole("region", { name: "In review", exact: true })
        .locator(`[data-task-id="${id}"]`),
    ).toBeVisible();
    await page.reload();
    expect(Number(await card.getAttribute("data-task-version"))).toBe(
      version + 1,
    );
    const denied = await page.request.post(`${base}/resources/tasks`, {
      form: {
        command: JSON.stringify({ ...command, mutationId: randomUUID() }),
      },
      headers: { Origin: "https://unrelated.example" },
    });
    expect(denied.status()).toBe(403);
  } finally {
    await other.close();
    await archiveTask(page, base, id);
  }
});

test("dragging moves a card between columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1600 });
  const { base, username } = await setupLockin(page);
  const title = `Drag ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, base, title, username);
  const card = page.locator(`[data-task-id="${id}"]`);
  await expect(card).toHaveAttribute("draggable", "true");
  await card.scrollIntoViewIfNeeded();
  const source = await card.locator(".task-number").boundingBox();
  const destination = await page
    .getByRole("region", { name: "In review", exact: true })
    .locator(".column-heading")
    .boundingBox();
  expect(source).not.toBeNull();
  expect(destination).not.toBeNull();
  const x = source!.x + source!.width / 2;
  const y = source!.y + source!.height / 2;
  const targetX = destination!.x + destination!.width / 2;
  const targetY = destination!.y + destination!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 15, y, { steps: 5 });
  await page.mouse.move(targetX, targetY, { steps: 15 });
  await page.mouse.move(targetX + 2, targetY + 2);
  await page.mouse.up();
  await expect(
    page
      .getByRole("region", { name: "In review", exact: true })
      .locator(`[data-task-id="${id}"]`),
  ).toBeVisible();
  await expect(page.locator(".save-status")).toContainText("Saved. Moved");
  await page.reload();
  await expect(
    page
      .getByRole("region", { name: "In review", exact: true })
      .locator(`[data-task-id="${id}"]`),
  ).toBeVisible();
  await archiveTask(page, base, id);
});

test("phone layout and reduced motion keep task creation usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { base, username } = await setupLockin(page);
  await page.goto(base);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".brand-star")).toHaveCSS("animation-name", "none");
  const id = await createTask(
    page,
    base,
    `Phone ${randomUUID().slice(0, 8)}`,
    username,
  );
  await page.goto(`${base}/tasks/${id}`);
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.getBoundingClientRect().right <= window.innerWidth),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await archiveTask(page, base, id);
});

test("keyboard moves preserve focus on the moved task", async ({ page }) => {
  const { base, username } = await setupLockin(page);
  const title = `Keyboard ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, base, title, username);
  try {
    const card = page.locator(`[data-task-id="${id}"]`);
    await card.locator("summary").focus();
    await expect(card.locator("summary")).toBeFocused();
    await page.keyboard.press("Enter");
    await card
      .getByRole("button", { name: "To In progress", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page
        .getByRole("region", { name: "In progress", exact: true })
        .locator(`[data-task-id="${id}"]`),
    ).toBeVisible();
    await expect(
      card.getByRole("link", { name: title, exact: true }),
    ).toBeFocused();
    await expect(page.locator(".save-status")).toContainText("Saved. Moved");
  } finally {
    await archiveTask(page, base, id);
  }
});

test("a conflicting edit preserves the draft and offers the latest task", async ({
  page,
}) => {
  const { base, username } = await setupLockin(page);
  const title = `Conflict ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, base, title, username);
  try {
    const version = Number(
      await page
        .locator(`[data-task-id="${id}"]`)
        .getAttribute("data-task-version"),
    );
    await page.goto(`${base}/tasks/${id}?edit=1`);
    await page
      .getByLabel("Task title", { exact: true })
      .fill(`${title} unsaved draft`);
    const moved = await page.request.post(`${base}/resources/tasks`, {
      form: {
        command: JSON.stringify({
          intent: "move",
          taskId: id,
          version,
          status: "review",
          beforeId: null,
          mutationId: randomUUID(),
        }),
      },
      headers: { Origin: "http://127.0.0.1:5188" },
    });
    expect(moved.status()).toBe(200);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
    await expect(page.getByLabel("Task title", { exact: true })).toHaveValue(
      `${title} unsaved draft`,
    );
    await page
      .getByRole("link", { name: "Review latest task", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Task status", exact: true }),
    ).toHaveValue("review");
    await page.getByRole("link", { name: "Edit task", exact: true }).click();
    await page
      .getByLabel("Task title", { exact: true })
      .fill(`${title} revised`);
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByRole("link", { name: "Edit task", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(`${title} revised`);
  } finally {
    await archiveTask(page, base, id);
  }
});
