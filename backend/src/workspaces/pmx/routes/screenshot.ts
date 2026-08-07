import { Router, type Request, type Response } from "express";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export const screenshotRouter = Router();

async function resolveChromiumPath(): Promise<string> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  // Prefer system Chromium when available (e.g. the Dockerfile's apk-installed chromium).
  const absoluteCandidates = [
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  ];
  for (const candidate of absoluteCandidates) {
    if (existsSync(candidate)) return candidate;
  }

  // Local Windows development — @sparticuz/chromium below only ever extracts
  // a Linux binary (it's built for AWS Lambda), so without this a Windows
  // dev box always fell through to that and failed at puppeteer.launch()
  // with an opaque "spawn ... ENOENT". Only checked on win32 so this can
  // never affect, or add overhead to, the Linux production path above.
  const windowsCandidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  if (process.platform === "win32") {
    for (const candidate of windowsCandidates) {
      if (existsSync(candidate)) return candidate;
    }
  }

  const pathCandidates = ["chromium", "chromium-browser", "google-chrome"];
  for (const candidate of pathCandidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // try next
    }
  }

  // Last resort: @sparticuz/chromium's bundled binary. Correct as the final
  // fallback for a Linux production deploy (Docker/Lambda) — left exactly as
  // it was. It only ever extracts a Linux executable though, so on any other
  // platform (or if extraction silently produced a dead path) the file it
  // points at may not actually exist — verify before trusting it, so a
  // missing browser fails with a clear, actionable error right here instead
  // of resurfacing later as puppeteer's opaque "spawn ... ENOENT" deep
  // inside launch(), which is what happened on Windows and took a full code
  // trace to diagnose.
  const bundledPath = await chromium.executablePath();
  if (existsSync(bundledPath)) return bundledPath;

  const checked = [
    ...absoluteCandidates,
    ...(process.platform === "win32" ? windowsCandidates : []),
    ...pathCandidates.map((c) => `${c} (via PATH)`),
    `${bundledPath} (@sparticuz/chromium bundled binary)`,
  ];
  throw new Error(
    `No usable Chromium/Chrome executable found for platform "${process.platform}". ` +
    `Checked: ${checked.join(", ")}. ` +
    `Set PUPPETEER_EXECUTABLE_PATH in backend/.env to point at an installed browser ` +
    `(see backend/.env.example) — this is the common fix for local Windows development.`
  );
}

export interface CaptureScreenshotOptions {
  fullPage?: boolean;
  width?: number;
}

export interface CaptureScreenshotResult {
  dataUrl: string;
  width: number;
}

// The actual puppeteer capture, extracted out of the route handler below so
// other server-side code (e.g. the URL-mode UI audit path in pmx.ts) can
// call it directly instead of round-tripping through HTTP to this same
// backend. Throws on invalid URL/protocol or a capture failure — callers
// decide how to translate that (this route maps it to 400/502; the UI audit
// path catches it and degrades gracefully instead of failing the audit).
export async function captureScreenshot(
  url: string,
  opts: CaptureScreenshotOptions = {}
): Promise<CaptureScreenshotResult> {
  const { fullPage = true, width = 1280 } = opts;

  const parsedUrl = new URL(url); // throws SyntaxError-ish TypeError on invalid URL
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http/https URLs allowed");
  }

  let browser;
  try {
    const executablePath = await resolveChromiumPath();
    const useLambdaChromium = executablePath.includes("/tmp/chromium");
    browser = await puppeteer.launch({
      args: useLambdaChromium ? chromium.args : ["--no-sandbox", "--disable-setuid-sandbox"],
      defaultViewport: { width: Number(width), height: 900 },
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });

    // Wait a bit for any animations/lazy loads
    await new Promise((r) => setTimeout(r, 1500));

    const screenshot = await page.screenshot({
      type: "png",
      fullPage: Boolean(fullPage),
      encoding: "base64",
    });

    return { dataUrl: `data:image/png;base64,${screenshot}`, width: Number(width) };
  } finally {
    if (browser) await browser.close();
  }
}

screenshotRouter.post("/screenshot", async (req: Request, res: Response) => {
  const { url, fullPage = true, width = 1280 } = req.body as {
    url: string;
    fullPage?: boolean;
    width?: number;
  };

  if (!url) return res.status(400).json({ error: "url is required" });

  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const result = await captureScreenshot(url, { fullPage, width });
    res.json({ success: true, dataUrl: result.dataUrl, url, width: result.width });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Screenshot failed";
    res.status(err instanceof Error && err.message === "Only http/https URLs allowed" ? 400 : 502).json({ error: msg });
  }
});
