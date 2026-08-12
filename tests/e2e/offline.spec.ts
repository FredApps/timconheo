import { expect, test, type Page } from "@playwright/test";

const user = {
  id: "e2e-user",
  username: "learner",
  isAdmin: false,
  disabled: false,
  createdAt: new Date(0).toISOString(),
};
const state = { words: [], progress: [], imports: [], tones: [], cards: [], syncCursor: 0 };

async function mockApi(page: Page) {
  await page.route("**/heo/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = path.endsWith("/session")
      ? { user, allowSignups: false }
      : path.endsWith("/sessions")
        ? { sessions: [] }
        : state;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

test("a previously signed-in learner can cold reload the core app offline", async ({ page, context }) => {
  await mockApi(page);
  await page.goto("/heo/");
  await expect(page.getByText("Tìm Con Heo").first()).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.unroute("**/heo/api/**");
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Tìm Con Heo").first()).toBeVisible();
  await expect(page.getByText(/offline/i)).toBeVisible();
});

test("privacy disclosure gates imports and account controls are discoverable", async ({ page }) => {
  await mockApi(page);
  await page.goto("/heo/#import");
  const save = page.getByRole("button", { name: /save/i });
  await page.getByLabel(/title/i).fill("Bài đọc");
  await page.locator("textarea").fill("Tôi đi chợ.");
  await expect(save).toBeDisabled();
  await page.getByRole("checkbox").check();
  await expect(save).toBeEnabled();
  await page.goto("/heo/#about");
  await expect(page.getByText(/data and privacy/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /export all data/i })).toBeVisible();
});
