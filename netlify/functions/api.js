import arcjet, { detectBot, shield, tokenBucket } from "@arcjet/node";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    // Shield protects against common attacks
    shield({ mode: "LIVE" }),
    // Bot detection - curl should be blocked by default
    detectBot({
      mode: "LIVE",
      allow: [
        "CATEGORY:SEARCH_ENGINE", // Allow Google, Bing, etc
      ],
    }),
    // Add rate limiting
    tokenBucket({
      mode: "LIVE",
      refillRate: 5, // 5 tokens per interval
      interval: 10, // 10 seconds  
      capacity: 10, // bucket capacity
    }),
  ],
});

export default async (req, context) => {
  // Important: Deduct tokens from the bucket
  const decision = await aj.protect(req, { requested: 5 });
  
  console.log("Arcjet decision", decision);

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      return new Response(JSON.stringify({ error: "Too many requests" }), { 
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    } else if (decision.reason.isBot()) {
      return new Response(JSON.stringify({ error: "No bots allowed" }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ error: "Forbidden" }), { 
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  
  return new Response(JSON.stringify({ message: "Hello from Arcjet protected function!" }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
