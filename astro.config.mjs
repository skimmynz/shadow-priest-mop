import { defineConfig } from "astro/config";
import netlify from "@astrojs/netlify"; // Replaced @astrojs/node
import arcjet, { shield, detectBot, tokenBucket } from "@arcjet/astro";

export default defineConfig({
  // 'server' output is required for Arcjet rules to run on every request
  output: "server",
  adapter: netlify(),
  env: {
    validateSecrets: true,
  },
  integrations: [
    arcjet({
      rules: [
        // Shield protects against common attacks like SQL injection
        shield({ mode: "LIVE" }),
        // Bot detection blocks malicious crawlers but allows Google/Bing
        detectBot({
          mode: "LIVE",
          allow: ["CATEGORY:SEARCH_ENGINE"],
        }),
        // Rate limiting: 10 tokens total, refills 5 every 10 seconds
        tokenBucket({
          mode: "LIVE",
          refillRate: 5,
          interval: 10,
          capacity: 10,
        }),
      ],
    }),
  ],
});
