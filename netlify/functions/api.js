// ✅ New ES Module syntax
import arcjet, { shield, detectBot } from "@arcjet/node";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({
      mode: "LIVE",
    }),
    detectBot({
      mode: "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),
  ],
});

export default async (req, context) => {
  const decision = await aj.protect(context, req);
  
  if (decision.isDenied()) {
    return new Response("Forbidden", { status: 403 });
  }
  
  // Your function logic here
  return new Response("Hello from Arcjet protected function!");
};
