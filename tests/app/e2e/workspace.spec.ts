import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

async function createTask(page: Page, title: string) {
  await page.goto("/tasks/new?status=ready");
  await page.getByLabel("Task title", { exact: true }).fill(title);
  await page
    .getByLabel("A little context")
    .fill("A task created to verify the whole workflow.");
  await page
    .getByRole("combobox", { name: "Owner", exact: true })
    .selectOption("you");
  await page
    .getByRole("checkbox", { name: "Engineering", exact: true })
    .check();
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(title);
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").at(-1)!;
  await page.getByRole("button", { name: "Close task", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:5188/");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  return id;
}
async function archiveTask(page: Page, id: string) {
  await page.goto(`/tasks/${id}`);
  await page.getByRole("button", { name: "Archive task", exact: true }).click();
  await page
    .getByRole("button", { name: "Yes, archive task", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("create, edit, help, move, and reopen a saved task", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const title = `Workflow ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, title);
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
  await archiveTask(page, id);
  expect(errors).toEqual([]);
});

test("board search, backlog, and personal views remain connected", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Find a task" })
    .fill("WELCOME EMAIL");
  await expect(page.locator(".task-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Backlog", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The backlog.",
  );
  await expect(page.locator(".task-row")).not.toHaveCount(0);
  await page.getByRole("link", { name: "My work", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("My work.");
  await expect(
    page.getByText("Owning it", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "What's new", exact: true }).click();
  await expect(page.locator(".activity-row").first()).toBeVisible();
});

test("two browsers see saved moves and stale writes cannot overwrite them", async ({
  page,
  browser,
}) => {
  const title = `Concurrent ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, title);
  const other = await browser.newPage();
  try {
    await other.goto("http://127.0.0.1:5188/");
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
    const first = await page.request.post("/resources/tasks", options);
    expect(first.status()).toBe(200);
    const repeated = await page.request.post("/resources/tasks", options);
    expect(repeated.status()).toBe(200);
    const stale = await other.request.post(
      "http://127.0.0.1:5188/resources/tasks",
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
    const denied = await page.request.post("/resources/tasks", {
      form: {
        command: JSON.stringify({ ...command, mutationId: randomUUID() }),
      },
      headers: { Origin: "https://unrelated.example" },
    });
    expect(denied.status()).toBe(403);
  } finally {
    await other.close();
    await archiveTask(page, id);
  }
});

test("dragging moves a card between columns", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1600 });
  const title = `Drag ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, title);
  const card = page.locator(`[data-task-id="${id}"]`);
  await expect(card).toHaveAttribute("draggable", "true");
  await card.scrollIntoViewIfNeeded();
  const source = await card.locator(".drag-handle").boundingBox();
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
  await archiveTask(page, id);
});

test("phone layout and reduced motion keep task creation usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
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
  const id = await createTask(page, `Phone ${randomUUID().slice(0, 8)}`);
  await page.goto(`/tasks/${id}`);
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(
    await page
      .getByRole("dialog")
      .evaluate((el) => el.getBoundingClientRect().right <= window.innerWidth),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await archiveTask(page, id);
});

test("keyboard moves preserve focus on the moved task", async ({ page }) => {
  const title = `Keyboard ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, title);
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
    await archiveTask(page, id);
  }
});

test("a conflicting edit preserves the draft and offers the latest task", async ({
  page,
}) => {
  const title = `Conflict ${randomUUID().slice(0, 8)}`;
  const id = await createTask(page, title);
  try {
    const version = Number(
      await page
        .locator(`[data-task-id="${id}"]`)
        .getAttribute("data-task-version"),
    );
    await page.goto(`/tasks/${id}?edit=1`);
    await page
      .getByLabel("Task title", { exact: true })
      .fill(`${title} unsaved draft`);
    const moved = await page.request.post("/resources/tasks", {
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
    await archiveTask(page, id);
  }
});
