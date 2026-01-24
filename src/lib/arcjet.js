// netlify/functions/rankings.js
import { aj } from "../../src/lib/arcjet.js";

export const handler = async (event, context) => {
  // Pass the event to Arcjet for a decision
  const decision = await aj.protect(event);

  if (decision.isDenied()) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: "Access denied by Arcjet" }),
    };
  }

  // Your actual rankings logic here
  return {
    statusCode: 200,
    body: JSON.stringify({ data: "Shadow Priest Rank #1: Skimmynz" }),
  };
};
