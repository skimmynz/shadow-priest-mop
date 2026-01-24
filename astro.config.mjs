// astro.config.mjs
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import arcjet from '@arcjet/astro';

export default defineConfig({
  output: 'server',  // Explicitly enable SSR/on-demand rendering – required for Arcjet
  adapter: node({
    mode: 'standalone'  // Good choice for Netlify, Vercel, or any Node host
  }),
  env: {
    validateSecrets: true  // Excellent – errors on startup if ARCJET_KEY missing/wrong
  },
  integrations: [
    arcjet({
      // Optional: Add global rules here for all requests (recommended to start)
      // rules: [
      //   shield({ mode: 'LIVE' }),  // Blocks common attacks/WAF-style
      //   detectBot({ mode: 'LIVE' }),  // Blocks automated traffic
      // ]
    })
  ],
});
