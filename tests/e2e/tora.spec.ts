import path from "node:path";

import { expect, type Locator, type Page, test } from "@playwright/test";

import { readFile } from "node:fs/promises";

import { TEST_USER } from "./local-supabase";
import { totp } from "./totp";

// One realistic journey through every feature, in order, sharing one session.
// Runs against a fresh user on the local Supabase stack (see global-setup.ts).

test.describe.configure({ mode: "serial" });

let page: Page;
const errors: string[] = [];

// "Rp 1.250.000" with a normal or non-breaking space.
const rp = (amount: string) => new RegExp(`Rp\\s?${amount.replace(/\./g, "\\.")}`);

async function choose(scope: Page | Locator, label: string | RegExp, option: string | RegExp) {
  await scope.getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: typeof option === "string" }).click();
}

async function addAccount(name: string, type: string, balance: string, currency?: string) {
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Add account" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill(name);
  await choose(dialog, "Type", type);
  if (currency) await choose(dialog, "Currency", new RegExp(`^${currency} ·`));
  await dialog.getByLabel(/Starting balance|Amount owed at start/).fill(balance);
  await dialog.getByRole("button", { name: "Add account" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
}

async function quickAdd(t: {
  mode: "expense" | "income" | "transfer";
  amount: string;
  account: string;
  to?: string;
  category?: string;
  description?: string;
  refund?: boolean;
}) {
  await page.locator("header").getByRole("button", { name: "Add transaction" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: t.mode }).click();
  await dialog.getByLabel(/^Amount/).fill(t.amount);
  if (t.mode === "transfer") {
    await choose(dialog, "From", t.account);
    await choose(dialog, "To", t.to!);
  } else {
    await choose(dialog, "Account", t.account);
    if (t.category) await choose(dialog, "Category", t.category);
  }
  if (t.refund) await dialog.getByLabel("This is a refund").check();
  if (t.description) await dialog.getByLabel("Description").fill(t.description);
  await dialog.getByRole("button", { name: "Add transaction" }).click();
  await expect(dialog).toBeHidden();
}

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Failed to load resource.*(401|404)/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
});

test.afterAll(async () => {
  await page.close();
});

test("signed-out visitors land on the login page", async () => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/budgets");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/register");
  await expect(page.getByText("Tora is invite-only")).toBeVisible();
});

test("login shows errors, toggles password visibility, then signs in", async () => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_USER.email);
  await page.getByLabel("Password", { exact: true }).fill("wrong-password-1");
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill(TEST_USER.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Welcome to Tora")).toBeVisible();
  await expect(page.getByText(TEST_USER.email)).toBeVisible();
});

test("accounts: add asset, debt and foreign-currency accounts", async () => {
  await addAccount("BCA", "Bank account", "10.000.000");
  await addAccount("Visa", "Credit card", "500.000");
  await addAccount("Wise USD", "Bank account", "100", "USD");

  await expect(page.getByText("Debts", { exact: true })).toBeVisible();
  // Net worth in IDR = 10M - 500k; USD not converted yet.
  await expect(page.getByText(rp("9.500.000")).first()).toBeVisible();
  await expect(page.getByText(/USD amounts aren.t included yet/)).toBeVisible();
});

test("settings: an exchange rate converts the USD account", async () => {
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Exchange rates" }).click();
  await page.getByLabel("IDR per USD").fill("16000");
  await page.getByRole("button", { name: "Save rates" }).click();
  await expect(page.getByText("Rates saved.")).toBeVisible();

  await page.goto("/accounts");
  // 9.5M + 100 × 16,000
  await expect(page.getByText(rp("11.100.000")).first()).toBeVisible();
});

test("settings: custom account type and category", async () => {
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Account types" }).click();
  const investments = page.locator("div.rounded-xl", { hasText: "Investments & property" }).first();
  await investments.getByRole("button", { name: "Add type" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Deposito");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Deposito")).toBeVisible();

  await page.getByRole("tab", { name: "Categories" }).click();
  const food = page.locator("div.rounded-xl", { hasText: "Food & Drinks" }).first();
  await food.getByRole("button", { name: "Add category" }).click();
  await page.getByRole("dialog").getByLabel("Name").fill("Snacks at work");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Snacks at work")).toBeVisible();
});

test("transactions: expense, income, refund and transfer update totals and balances", async () => {
  await page.goto("/transactions");
  await quickAdd({ mode: "expense", amount: "45.000", account: "BCA", category: "Eating out", description: "Lunch at warung" });
  await quickAdd({ mode: "income", amount: "5.000.000", account: "BCA", category: "Salary", description: "November salary" });
  await quickAdd({ mode: "expense", amount: "10.000", account: "BCA", category: "Groceries", description: "Returned item", refund: true });
  await quickAdd({ mode: "transfer", amount: "300.000", account: "BCA", to: "Visa" });

  await page.goto("/transactions");
  await expect(page.getByRole("button", { name: /Lunch at warung/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Transfer to Visa/ })).toBeVisible();
  // Income 5M; spending 45k - 10k refund = 35k.
  const summary = page.locator("div.grid-cols-3").first();
  await expect(summary).toContainText(rp("5.000.000"));
  await expect(summary).toContainText(rp("35.000"));

  await page.goto("/accounts");
  // BCA: 10M - 45k + 5M + 10k - 300k = 14.665.000 ; Visa: -500k + 300k = -200k
  await expect(page.getByRole("listitem").filter({ hasText: "BCA" })).toContainText(rp("14.665.000"));
  await expect(page.getByRole("listitem").filter({ hasText: "Visa" })).toContainText(/-Rp\s?200\.000/);
});

test("transactions: edit, filter, search and delete", async () => {
  await page.goto("/transactions");
  await page.getByRole("button", { name: /Lunch at warung/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^Amount/).fill("50.000");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("button", { name: /Lunch at warung/ })).toContainText(/-Rp\s?50\.000/);

  await page.getByLabel("Search transactions").fill("salary");
  await page.getByLabel("Search transactions").press("Enter");
  await expect(page).toHaveURL(/q=salary/);
  await expect(page.getByRole("button", { name: /November salary/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Lunch at warung/ })).toBeHidden();
  await page.getByRole("button", { name: "Clear" }).click();

  await page.getByRole("button", { name: /Returned item/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete transaction" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("button", { name: /Returned item/ })).toBeHidden();
});

test("accounts: update balance records an adjustment", async () => {
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Options for Wise USD" }).click();
  await page.getByRole("menuitem", { name: "Update balance" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Balance now").fill("120");
  await dialog.getByRole("button", { name: "Update balance" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("listitem").filter({ hasText: "Wise USD" })).toContainText(/US\$\s?120,00/);
});

test("budgets: set a group budget and see progress", async () => {
  await page.goto("/budgets");
  await page.getByRole("button", { name: "Set budget for 🍜 Food & Drinks" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Monthly budget (IDR)").fill("1.000.000");
  await dialog.getByRole("button", { name: "Save budget" }).click();
  await expect(dialog).toBeHidden();
  const food = page.getByRole("region", { name: "Food & Drinks" });
  await expect(food).toContainText(rp("50.000"));
  await expect(food).toContainText(rp("950.000"));
  await expect(food).toContainText("left");
});

test("recurring: add a bill and mark it paid", async () => {
  await page.goto("/recurring");
  await page.getByRole("button", { name: "Add recurring" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Internet");
  await dialog.getByLabel(/^Amount/).fill("350.000");
  await choose(dialog, "Account", "BCA");
  await choose(dialog, "Category", "Internet & phone");
  await dialog.getByRole("button", { name: "Add recurring item" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Due today")).toBeVisible();
  await expect(page.getByText(rp("350.000")).first()).toBeVisible();

  await page.getByRole("button", { name: "Paid" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByText("Due today")).toBeHidden();

  await page.goto("/transactions");
  await expect(page.getByText("Internet", { exact: true })).toBeVisible();
});

test("goals: manual and account-linked goals", async () => {
  await page.goto("/goals");
  await page.getByRole("button", { name: "New goal" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("New laptop");
  await dialog.getByLabel("Target amount").fill("10.000.000");
  await dialog.getByLabel("Saved so far").fill("1.000.000");
  await dialog.getByRole("button", { name: "Create goal" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Add money" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount").fill("500.000");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(rp("1.500.000"))).toBeVisible();

  await page.getByRole("button", { name: "New goal" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("Emergency fund");
  await dialog.getByLabel("Target amount").fill("30.000.000");
  await choose(dialog, "Track progress with", "Balance of BCA");
  await dialog.getByRole("button", { name: "Create goal" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("From BCA")).toBeVisible();
});

test("CSV import: map, preview, import, review and undo", async () => {
  await page.goto("/transactions/import");
  await choose(page, "Import into", "BCA");
  await page.locator("#csv-file").setInputFiles(path.join(__dirname, "fixtures/bank-statement.csv"));
  await expect(page.getByText(/5 rows/)).toBeVisible();
  await page.getByRole("button", { name: /Preview \d+ rows/ }).click();
  await expect(page.getByText("3 to import")).toBeVisible();
  await expect(page.getByText(/2 unreadable/)).toBeVisible();
  await page.getByRole("button", { name: "Import 3 transactions" }).click();
  await expect(page.getByText(/Imported 3 transactions into BCA/)).toBeVisible();

  await page.getByRole("link", { name: "Review them" }).click();
  await expect(page.getByText(/Reviewing 3 imported transactions/)).toBeVisible();
  await expect(page.getByRole("button", { name: /INDOMARET POINT/ })).toBeVisible();
  const reviewUrl = page.url();

  // Importing the same file again flags everything as duplicates.
  await page.goto("/transactions/import");
  await choose(page, "Import into", "BCA");
  await page.locator("#csv-file").setInputFiles(path.join(__dirname, "fixtures/bank-statement.csv"));
  await page.getByRole("button", { name: /Preview \d+ rows/ }).click();
  await expect(page.getByText("0 to import")).toBeVisible();
  await expect(page.getByText("3 duplicates skipped")).toBeVisible();

  // Undo from the review screen.
  await page.goto(reviewUrl);
  await page.getByRole("button", { name: "Undo import" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Undo import" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole("button", { name: /INDOMARET POINT/ })).toBeHidden();
});

test("cash flow, reports and dashboard show the numbers", async () => {
  await page.goto("/cash-flow");
  await expect(page.getByText("Last 12 months")).toBeVisible();
  await expect(page.getByText("Spending by category")).toBeVisible();
  await expect(page.locator(".recharts-surface").first()).toBeVisible();

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Net worth" }).or(page.getByText("Net worth", { exact: true })).first()).toBeVisible();
  await page.getByRole("radio", { name: "12 months" }).click();
  await expect(page).toHaveURL(/months=12/);
  await expect(page.getByText("Month by month")).toBeVisible();

  await page.goto("/dashboard");
  await expect(page.getByText("Net worth", { exact: true })).toBeVisible();
  await expect(page.getByText("Lunch at warung")).toBeVisible();
  await expect(page.getByText("New laptop")).toBeVisible();
  await expect(page.getByText(/Food & Drinks/).first()).toBeVisible();
});

test("sidebar is grouped into sections", async () => {
  await page.goto("/dashboard");
  const nav = page.locator("[data-sidebar=sidebar]");
  for (const label of ["Overview", "Money", "Planning", "Insights"]) await expect(nav.getByText(label, { exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Calendar" })).toBeVisible();
});

test("calendar: month, week and day views with totals and upcoming bills", async () => {
  await page.goto("/calendar");
  await expect(page.getByRole("radio", { name: "month" })).toHaveAttribute("aria-checked", "true");
  // Today's cell carries today's spending (lunch 50k + internet 350k = 400k).
  const todayCell = page.getByRole("link", { name: /spent Rp\s?400\.000/ });
  await expect(todayCell).toBeVisible();

  // The internet bill was marked paid, so it's due again next month.
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByRole("link", { name: /1 due/ }).first()).toBeVisible();
  await expect(page.getByText("Internet").first()).toBeVisible();
  await page.getByRole("button", { name: "Today" }).click();

  await page.getByRole("radio", { name: "week" }).click();
  await expect(page).toHaveURL(/view=week/);
  await expect(page.getByText("Lunch at warung")).toBeVisible();

  await page.getByRole("radio", { name: "day" }).click();
  await expect(page).toHaveURL(/view=day/);
  await expect(page.getByRole("button", { name: /Lunch at warung/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add on this day" })).toBeVisible();
});

test("transactions: summary panel, day totals and CSV export", async () => {
  await page.goto("/transactions");
  const summary = page.getByRole("region", { name: "Summary" });
  await expect(summary).toContainText("Largest expense");
  await expect(summary).toContainText(rp("350.000"));

  const [download] = await Promise.all([page.waitForEvent("download"), summary.getByRole("link", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^tora-transactions-\d{4}-\d{2}\.csv$/);
  const csv = await readFile(await download.path(), "utf8");
  expect(csv).toContain("Date,Time,Account,Currency,Type,Group,Category,Description,Notes,Amount");
  expect(csv).toContain("Lunch at warung");
  expect(csv).toContain(",-50000");
});

test("settings: export everything as JSON", async () => {
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Data" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Download" }).nth(1).click(),
  ]);
  const data = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(data.app).toBe("Tora");
  expect(data.accounts.map((a: { name: string }) => a.name).sort()).toEqual(["BCA", "Visa", "Wise USD"]);
  expect(data.transactions.length).toBeGreaterThan(3);
});

test("accounts: net worth overview with trend and section totals", async () => {
  await page.goto("/accounts");
  const overview = page.getByRole("region", { name: "Net worth" });
  await expect(overview).toContainText("over 6 months");
  await expect(overview.getByRole("img", { name: "What you own versus what you owe" })).toBeVisible();
  await overview.getByRole("radio", { name: "12 months" }).click();
  await expect(page).toHaveURL(/months=12/);
  await expect(page.getByText("over 12 months")).toBeVisible();
});

test("two-factor login: set up, required at login, then removed", async () => {
  test.setTimeout(120_000);
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Security" }).click();
  await page.getByRole("button", { name: "Set up authenticator app" }).click();
  const secret = (await page.getByTestId("totp-secret").innerText()).trim();
  const setupWindow = Math.floor(Date.now() / 30_000);
  await page.getByLabel(/Enter the 6-digit code/).fill(totp(secret));
  await page.getByRole("button", { name: "Turn on" }).click();
  await expect(page.getByText(/^On\./)).toBeVisible();

  // Log out and back in: the password alone isn't enough any more.
  await page.getByRole("button", { name: "Log out" }).click();
  await page.getByLabel("Email").fill(TEST_USER.email);
  await page.getByLabel("Password", { exact: true }).fill(TEST_USER.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/two-factor$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/two-factor$/); // can't skip the code
  await page.getByLabel("Code").fill("000000");
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByText(/code didn.t work/)).toBeVisible();
  // Use a code from a later 30-second window than the setup code, in case reuse is refused.
  const wait = (setupWindow + 1) * 30_000 - Date.now();
  if (wait > 0) await page.waitForTimeout(wait + 500);
  await page.getByLabel("Code").fill(totp(secret));
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Turn it off again for the remaining steps.
  await page.goto("/settings");
  await page.getByRole("tab", { name: "Security" }).click();
  await page.getByRole("button", { name: /Remove Authenticator/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText(/^Off\./)).toBeVisible();
});

test("PWA manifest is public", async () => {
  const res = await page.request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  expect((await res.json()).name).toBe("Tora");
});

test("log out", async () => {
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("no browser errors along the way", async () => {
  expect(errors).toEqual([]);
});
