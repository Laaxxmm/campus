/**
 * v4 Visual QA gate (docs/screens/CHECKLIST.md).
 * Captures every checklist screen at 360 / 768 / 1280 / 1440 and runs the automatable checklist items:
 * no horizontal scroll, tap targets ≥ 44px, exactly one primary CTA, header not cramped (≥ 32 below),
 * equal-height cards per grid row, exam-chrome items on one centre line, nothing under sticky chrome.
 * `VISUAL_QA_WRITE=1` also writes the PNGs + CHECKLIST.md into docs/screens/v4/.
 * Visual-regression snapshots (toHaveScreenshot, maxDiffPixelRatio 0.01) cover the deterministic screens.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { login } from "./helpers";

const WIDTHS = [360, 768, 1280, 1440] as const;
const HEIGHT: Record<number, number> = { 360: 740, 768: 1024, 1280: 800, 1440: 900 };
const WRITE = process.env.VISUAL_QA_WRITE === "1";
const OUT = join(__dirname, "..", "docs", "screens", "v4");
const STUDENT = "student040@demo.learncrew.in";

type Result = { screen: string; width: number; file: string; checks: Record<string, true | string> };
const results: Result[] = [];

// Run with --workers=1 (results are aggregated in-process for CHECKLIST.md); a failing width does not skip the others.

/** Runs in the page: returns a list of problems per automated check. */
async function audit(page: Page, opts: { primary: number | "any"; header: boolean }) {
  return page.evaluate((o) => {
    const out: Record<string, string[]> = { hscroll: [], tap: [], primary: [], header: [], rows: [], chrome: [] };
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 2 || r.height < 2 || cs.visibility === "hidden" || cs.display === "none") return false;
      if (el.closest("[aria-hidden='true'],[inert],.sr-only")) return false;
      return true;
    };
    const label = (el: Element) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40)}"`;
    // 1. horizontal scroll
    const sw = document.scrollingElement!.scrollWidth;
    if (sw > window.innerWidth + 1) out.hscroll.push(`page is ${sw}px wide in a ${window.innerWidth}px viewport`);
    // 2. tap targets ≥ 44 (inline text links and 40px palette cells with 8px spacing are exempt; see DESIGN.md)
    const modal = [...document.querySelectorAll("[role=dialog][aria-modal=true]")].find(vis) ?? null;
    const scope: ParentNode = modal ?? document;
    for (const el of scope.querySelectorAll("a[href],button,select,input:not([type=hidden]),textarea,[role=button],[role=tab]")) {
      if (!vis(el)) continue;
      if (el.closest("[data-gallery] section") && !el.closest("[data-tap-check]")) continue; // gallery shows sm sizes on purpose
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (el.tagName === "A" && cs.display === "inline") continue;
      if (el.matches("[data-state][aria-label^='Question ']")) continue; // palette cell 40×40 + 8 gap
      if (el.matches("input[type=checkbox],input[type=radio]")) {
        const lab = el.closest("label");
        if (lab && lab.getBoundingClientRect().height >= 44) continue;
      }
      if (el.matches("input[type=file]")) continue; // visually hidden; the labelled button is checked instead
      if (el.closest("table") && cs.height !== "auto" && r.height >= 36 && window.innerWidth >= 1024) continue; // sm buttons in dense desktop tables
      if (r.height < 43.5) out.tap.push(`${label(el)} is ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    // 3. primary CTA count (filled amber or ink buttons/links in main content)
    const filled = (el: Element) => {
      const bg = getComputedStyle(el).backgroundColor;
      return bg === "rgb(245, 158, 11)" || bg === "rgb(15, 27, 61)" || bg === "rgb(217, 119, 6)";
    };
    const ctas = [...scope.querySelectorAll("a[href],button")].filter(
      (el) => vis(el) && filled(el) && !el.closest("nav,[aria-label='Question palette'],[aria-label=Sections],[data-state]") && !el.matches("[data-state],[role=tab],[aria-current]"),
    );
    if (o.primary !== "any" && ctas.length !== o.primary) out.primary.push(`${ctas.length} filled CTAs: ${ctas.map(label).join(", ") || "none"}`);
    // 4. header not cramped: ≥ 32 below the page header
    if (o.header) {
      const h = document.querySelector("[data-page-header]");
      if (!h) out.header.push("no [data-page-header]");
      else {
        const mb = parseFloat(getComputedStyle(h).marginBottom);
        const next = h.nextElementSibling ?? h.parentElement?.nextElementSibling;
        const gap = next ? next.getBoundingClientRect().top - h.getBoundingClientRect().bottom : mb;
        if (Math.max(gap, mb) < 31.5) out.header.push(`only ${Math.round(Math.max(gap, mb))}px below header`);
      }
    }
    // 5. card grids: equal heights per row
    for (const g of document.querySelectorAll("*")) {
      if (getComputedStyle(g).display !== "grid" || !vis(g)) continue;
      const cards = [...g.children].filter((c) => {
        const cs = getComputedStyle(c);
        return vis(c) && parseFloat(cs.borderTopWidth) > 0 && parseFloat(cs.borderTopLeftRadius) >= 11.5 && cs.position !== "absolute";
      });
      const rows = new Map<number, DOMRect[]>();
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        const k = Math.round(r.top);
        rows.set(k, [...(rows.get(k) ?? []), r]);
      }
      for (const [top, rs] of rows) {
        if (rs.length < 2) continue;
        const hs = rs.map((r) => Math.round(r.height));
        if (Math.max(...hs) - Math.min(...hs) > 2) out.rows.push(`grid row at y=${top}: card heights ${hs.join("/")}`);
      }
    }
    // 6. sticky/fixed chrome: first content element must start below it at scroll 0
    const main = document.querySelector("main");
    if (main) {
      const first = [...main.querySelectorAll("h1,h2,p,article,[data-testid]")].find(vis);
      const chrome = [...document.querySelectorAll("header,nav,footer,form")].filter((el) => {
        const p = getComputedStyle(el).position;
        return (p === "sticky" || p === "fixed") && vis(el) && el.getBoundingClientRect().top < 2;
      });
      if (first) {
        const ft = first.getBoundingClientRect().top;
        for (const c of chrome) if (c.getBoundingClientRect().bottom > ft + 1 && !c.contains(first)) out.chrome.push(`${label(first)} starts under sticky ${c.tagName.toLowerCase()}`);
      }
    }
    return out;
  }, opts);
}

/** Exam chrome: test name, timer and submit share one centre line; tabs bar directly below. */
async function examChrome(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const bar = document.querySelector("header.sticky")!;
    const mid = (el: Element | null) => (el ? el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 : NaN);
    const timer = document.querySelector("[data-testid=mock-timer]");
    const submit = document.querySelector("[data-testid=mock-submit]");
    const barMid = mid(bar);
    for (const [n, el] of [["timer", timer], ["submit", submit]] as const) if (Math.abs(mid(el) - barMid) > 6) out.push(`${n} off the bar centre line by ${Math.round(mid(el) - barMid)}px`);
    const h = bar.getBoundingClientRect().height;
    if (Math.abs(h - 65) > 2) out.push(`top bar is ${h}px (spec 64 + 1px border)`);
    const tabs = document.querySelector("nav[aria-label=Sections]")!.getBoundingClientRect();
    if (Math.abs(tabs.height - 49) > 2) out.push(`section tabs are ${tabs.height}px (spec 48 + border)`);
    const foot = document.querySelector("footer")!.getBoundingClientRect();
    if (Math.abs(foot.height - 73) > 2) out.push(`bottom bar is ${foot.height}px (spec 72 + border)`);
    return out;
  });
}

async function capture(page: Page, screen: string, width: number, opts: { primary?: number | "any"; header?: boolean; fullPage?: boolean; exam?: boolean } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const a = await audit(page, { primary: opts.primary ?? 1, header: opts.header ?? true });
  if (opts.exam) a.exam = await examChrome(page);
  const file = `${screen}-${width}.png`;
  const shot = await page.screenshot({ fullPage: opts.fullPage ?? true, animations: "disabled" });
  await test.info().attach(file, { body: shot, contentType: "image/png" });
  if (WRITE) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, file), shot);
  }
  const checks: Record<string, true | string> = {};
  for (const [k, v] of Object.entries(a)) checks[k] = v.length ? v.join("; ") : true;
  results.push({ screen, width, file, checks });
  const failures = Object.entries(a).filter(([, v]) => v.length);
  expect.soft(failures, `${screen} @ ${width}px`).toEqual([]);
}

for (const width of WIDTHS) {
  test(`visual QA @ ${width}px`, async ({ page, browser }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: HEIGHT[width] });
    const desktop = width >= 1024;

    // Public
    await page.goto("/");
    await capture(page, "01-landing", width, { header: false });
    await page.goto("/login");
    await capture(page, "02-login", width, { header: false }); // auth card: title lives inside the card

    // Student
    await login(page, STUDENT);
    await page.goto("/today");
    await capture(page, "03-today", width);
    const drillHref = await page.getByTestId("start-drill").getAttribute("href").catch(() => null);
    if (drillHref) {
      await page.goto(drillHref);
      await page.locator('footer button[data-state]').first().waitFor();
      await capture(page, "04-drill", width, { header: false, fullPage: false });
    }
    await page.goto("/mocks");
    await page.getByTestId("mock-card").first().click();
    await page.getByTestId("start-mock").waitFor();
    await capture(page, "05-mock-pretest", width);
    await page.getByTestId("start-mock").click();
    await page.waitForURL(/\/mocks\/attempt\/[0-9a-f-]+$/);
    await page.getByTestId("mock-stem").waitFor();
    await page.getByRole("radiogroup").locator("button").first().click();
    await page.getByRole("button", { name: /mark for review/i }).click();
    await page.getByRole("button", { name: /save & next/i }).click();
    await page.getByRole("radiogroup").locator("button").nth(1).click();
    await page.getByRole("button", { name: /save & next/i }).click();
    await capture(page, "06-in-mock", width, { header: false, fullPage: false, exam: true });
    if (!desktop) {
      await page.getByTestId("palette-open").click();
      await capture(page, "07-in-mock-palette-drawer", width, { header: false, fullPage: false, primary: 0 });
      await page.keyboard.press("Escape");
    }
    await page.getByTestId("mock-submit").click();
    await capture(page, "08-submit-dialog", width, { header: false, fullPage: false });
    await page.getByTestId("confirm-submit").click();
    await page.waitForURL(/\/result$/);
    await page.getByTestId("mock-score").waitFor();
    await capture(page, "09-result", width, { primary: "any", fullPage: false });
    await page.getByRole("tab", { name: "Wrong" }).click();
    await page.locator("#review-h").scrollIntoViewIfNeeded();
    await capture(page, "10-review", width, { primary: "any", header: false, fullPage: false });
    await page.goto("/insights");
    await capture(page, "11-insights", width);
    await page.goto("/companies");
    const company = page.getByTestId("company-cards").locator("a[href^='/companies/']").first();
    await page.goto((await company.getAttribute("href"))!);
    await capture(page, "12-company-crack-path", width);
    await page.goto("/profile-coach");
    await capture(page, "13-profile-coach", width);

    // TPO + content (separate contexts so the student session isn't reused)
    const tpo = await browser.newPage({ viewport: { width, height: HEIGHT[width] } });
    await login(tpo, "tpo@demo.learncrew.in");
    await tpo.goto("/tpo");
    await capture(tpo, "14-tpo-overview", width, { primary: "any" });
    await tpo.goto("/tpo/heatmap");
    await capture(tpo, "15-tpo-heatmap", width, { primary: 0 });
    await tpo.close();
    const content = await browser.newPage({ viewport: { width, height: HEIGHT[width] } });
    await login(content, "content@learncrew.in");
    await content.goto("/content/review");
    await capture(content, "16-admin-queue", width, { primary: "any" });
    await content.close();
  });
}

test("visual regression: deterministic screens", async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: HEIGHT[width] });
    for (const [name, path] of [["dev-ui", "/dev/ui"], ["landing", "/"], ["login", "/login"]] as const) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${name}-${width}.png`, { fullPage: true, maxDiffPixelRatio: 0.01, animations: "disabled" });
    }
  }
});

test.afterAll(() => {
  if (!WRITE || !results.length) return;
  const items: [string, string[]][] = [
    ["spacing on 8pt grid; card padding 24/32 consistent", ["lint"]],
    ["columns + card tops aligned; baselines in exam chrome aligned", ["rows", "exam"]],
    ["tap targets ≥44px (automated check over all interactive elements)", ["tap"]],
    ["no orphan whitespace / no empty columns", ["review"]],
    ["no overlapping, clipping, horizontal scroll, or text under sticky chrome", ["hscroll", "chrome"]],
    ["exactly one primary CTA", ["primary"]],
    ["header not cramped (≥32 below)", ["header"]],
  ];
  const screens = [...new Set(results.map((r) => r.screen))];
  // Orphan-whitespace review is manual: docs/screens/v4-review.json maps screen → "ok" or a note.
  const reviewFile = join(OUT, "..", "v4-review.json");
  const review: Record<string, string> = existsSync(reviewFile) ? JSON.parse(readFileSync(reviewFile, "utf8")) : {};
  const lines = [
    "# Visual QA checklist (v4)",
    "",
    "Generated by `VISUAL_QA_WRITE=1 npx playwright test --project=visual` — every automated box is backed by an assertion in `e2e/visual-qa.spec.ts`;",
    "`lint` = `npm run lint:spacing` (8pt grid, CI-enforced); `review` = human/agent review of the PNGs below (see notes).",
    "",
    `Run: ${new Date().toISOString().slice(0, 10)} · widths ${WIDTHS.join(" / ")} · ${results.length} screenshots in \`docs/screens/v4/\``,
    "",
  ];
  for (const s of screens) {
    const rs = results.filter((r) => r.screen === s);
    lines.push(`## ${s}`, "", rs.map((r) => `[${r.width}](v4/${r.file})`).join(" · "), "");
    for (const [text, keys] of items) {
      const fails = rs.flatMap((r) => keys.filter((k) => k in r.checks && r.checks[k] !== true).map((k) => `${r.width}px ${k}: ${r.checks[k]}`));
      if (keys.includes("review")) {
        const v = review[s];
        lines.push(`- [${v === "ok" ? "x" : " "}] ${text}${v && v !== "ok" ? ` — ${v}` : v ? "" : " — not reviewed yet"}`);
        continue;
      }
      const box = keys.includes("lint") ? "x" : fails.length ? " " : "x";
      lines.push(`- [${box}] ${text}${fails.length ? ` — ${fails.join(" | ")}` : ""}`);
    }
    lines.push("");
  }
  writeFileSync(join(OUT, "..", "CHECKLIST.md"), lines.join("\n"));
});
