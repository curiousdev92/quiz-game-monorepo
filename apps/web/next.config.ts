import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const dir = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  // These are all PRODUCTION-BUILD concerns — gate them off in dev so `next dev`
  // runs the lean SWC/Turbopack path. In particular `reactCompiler` forces Next's
  // Babel loader (and webpack over Turbopack), which is memory-heavy in dev; leaving
  // it on for `next dev` can OOM a constrained machine. `next build` still applies it.
  ...(isProd
    ? {
        output: "standalone" as const, // self-contained server for slim Docker images
        outputFileTracingRoot: path.join(dir, "../../"), // bundle workspace deps (@quiz/shared)
        reactCompiler: true, // auto-memoization — production optimization only
      }
    : {}),
  allowedDevOrigins: ["192.168.2.42"],
  transpilePackages: ["@quiz/shared"],
};

export default nextConfig;
