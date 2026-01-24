import aj from "arcjet:client";
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  // Arcjet should only run on requests that are not prerendered
  if (context.isPrerendered) {
    return next();
  }

  try {
    // This executes the rules you defined in astro.config.mjs
    const decision = await aj.protect(context.request);

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return new Response("Too Many Requests", { status: 429 });
      } else if (decision.reason.isBot()) {
        return new Response("Bots are not allowed", { status: 403 });
      } else {
        return new Response("Forbidden", { status: 403 });
      }
    }

    return next();
  } catch (error) {
    console.error("Arcjet error:", error);
    // "Fail open": let the request through if the security check fails
    return next();
  }
});
