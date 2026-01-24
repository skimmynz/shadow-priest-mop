// astro.config.mjs
import { defineConfig } from 'astro/config';
import arcjet from '@arcjet/astro';

export default defineConfig({
  integrations: [
    arcjet({
      // Optional: Add global rules here, e.g.
      // rules: [ /* your rules */ ]
    }),
  ],
  // Strongly recommended: Catches missing/invalid ARCJET_KEY at startup
  env: { validateSecrets: true },
});
