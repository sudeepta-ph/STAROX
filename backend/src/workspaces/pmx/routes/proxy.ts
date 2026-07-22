import { Router, type Request, type Response } from "express";

export const proxyRouter = Router();

// Headers that block iframe embedding — strip them all
const BLOCKED_HEADERS = new Set([
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "x-content-type-options",
  "strict-transport-security",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-embedder-policy",
  "cross-origin-resource-policy",
]);

// Rewrite absolute + relative URLs in HTML so all sub-resources
// (CSS, JS, images, links) also go through the proxy
function rewriteHtml(html: string, targetOrigin: string, proxyBase: string): string {
  // Rewrite href/src/action attributes
  return html
    .replace(/(href|src|action)="(\/[^"]*?)"/gi, (_, attr, path) => {
      return `${attr}="${proxyBase}?url=${encodeURIComponent(targetOrigin + path)}"`;
    })
    .replace(/(href|src|action)='(\/[^']*?)'/gi, (_, attr, path) => {
      return `${attr}='${proxyBase}?url=${encodeURIComponent(targetOrigin + path)}'`;
    })
    // Inject base tag so relative URLs resolve correctly
    .replace(/<head([^>]*)>/i, `<head$1><base href="${targetOrigin}/">`);
}

proxyRouter.get("/proxy", async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;

  if (!targetUrl) {
    return res.status(400).send("Missing ?url= parameter");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).send("Invalid URL");
  }

  // Only allow http/https
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return res.status(400).send("Only http/https URLs are allowed");
  }

  try {
    const upstream = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "identity",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    });

    // Forward status
    res.status(upstream.status);

    // Copy headers, stripping the ones that block embedding
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (BLOCKED_HEADERS.has(lower)) return;
      if (lower === "transfer-encoding") return; // causes issues
      res.setHeader(key, value);
    });

    // Always allow framing from our frontend
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const contentType = upstream.headers.get("content-type") ?? "";

    if (contentType.includes("text/html")) {
      const html = await upstream.text();
      const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
      const scheme = forwardedProto || req.protocol;
      const proxyBase = `${scheme}://${req.get("host")}/proxy`;
      const targetOrigin = `${parsedUrl.protocol}//${parsedUrl.host}`;
      const rewritten = rewriteHtml(html, targetOrigin, proxyBase);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(rewritten);
    } else {
      // Binary / CSS / JS — stream as-is
      const buffer = await upstream.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy error";
    res.status(502).send(`Proxy failed: ${msg}`);
  }
});
