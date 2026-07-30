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

  const pathCandidates = ["chromium", "chromium-browser", "google-chrome"];
  for (const candidate of pathCandidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {
      // try next
    }
  }

  return chromium.executablePath();
}

screenshotRouter.post("/screenshot", async (req: Request, res: Response) => {
  const { url, fullPage = true, width = 1280 } = req.body as {
    url: string;
    fullPage?: boolean;
    width?: number;
  };

  if (!url) return res.status(400).json({ error: "url is required" });

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).json({ error: "Only http/https URLs allowed" });
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

    res.json({
      success: true,
      dataUrl: `data:image/png;base64,${screenshot}`,
      url,
      width: Number(width),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Screenshot failed";
    res.status(502).json({ error: msg });
  } finally {
    if (browser) await browser.close();
  }
});
