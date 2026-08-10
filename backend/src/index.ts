import dns from "dns";
import { env } from "./config/env.js";
import { app } from "./app.js";
import { connectDB } from "./config/database.js";

// Render has no outbound IPv6 route, but some DNS servers return the AAAA
// record before the A record, and Node's default lookup order is whatever
// the resolver returned ("verbatim") — so outbound connections (e.g. SMTP
// to smtp.hostinger.com) can pick the unreachable IPv6 address and hang.
// Force IPv4-first resolution process-wide.
dns.setDefaultResultOrder("ipv4first");

// Initialize Mongoose connection before starting the listening loop
connectDB().then(() => {
  app.listen(Number(env.PORT), () => {
    // eslint-disable-next-line no-console
    console.log(`STAROX backend listening on :${env.PORT}`);
  });
}).catch((err) => {
  console.error("Failed to start server due to connection error:", err);
  process.exit(1);
});
