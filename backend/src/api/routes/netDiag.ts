import { Router } from "express";
import net from "net";

// TEMPORARY — diagnosing whether Render's network blocks outbound SMTP
// ports. Only dials a fixed, hardcoded list of hosts (no user input, so no
// SSRF surface) and reports connect success/failure. Remove once the SMTP
// delivery issue is resolved.
export const netDiagRouter = Router();

function tryConnect(host: string, port: number, timeoutMs = 6000): Promise<{ host: string; port: number; ok: boolean; error?: string; ms: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = net.createConnection({ host, port, family: 4 });
    const done = (ok: boolean, error?: string) => {
      socket.destroy();
      resolve({ host, port, ok, error, ms: Date.now() - start });
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false, "timeout"));
    socket.once("error", (err) => done(false, err.message));
  });
}

netDiagRouter.get("/diag/net", async (_req, res) => {
  const targets: Array<[string, number]> = [
    ["smtp.hostinger.com", 465],
    ["smtp.hostinger.com", 587],
    ["smtp.gmail.com", 465],
    ["smtp.gmail.com", 587],
    ["google.com", 443],
    ["google.com", 80],
  ];
  const results = await Promise.all(targets.map(([h, p]) => tryConnect(h, p)));
  res.json({ results });
});
