// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';        // Required for SSR/API routes
import arcjet from '@arcjet/astro';

export default defineConfig({
  output: 'server',                       // or 'hybrid' if you want some static pages
  adapter: node({
    mode: 'standalone'                    // Works well on Netlify/Vercel/etc.
  }),
  env: {
    validateSecrets: true                 // Errors early if ARCJET_KEY is missing
  },
  integrations: [
    arcjet({
      // Optional: Add global rules here later
      // rules: [ /* e.g. shield({ mode: 'LIVE' }) */ ]
    })
  ],
});
