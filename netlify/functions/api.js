// Using dynamic import in CommonJS
exports.handler = async (event, context) => {
  const { default: arcjet, shield, detectBot } = await import("@arcjet/node");
  
  const aj = arcjet({
    key: process.env.ARCJET_KEY,
    rules: [
      shield({ mode: "LIVE" }),
      detectBot({
        mode: "LIVE",
        allow: ["CATEGORY:SEARCH_ENGINE"],
      }),
    ],
  });

  const decision = await aj.protect(context, event);
  
  if (decision.isDenied()) {
    return {
      statusCode: 403,
      body: "Forbidden"
    };
  }
  
  return {
    statusCode: 200,
    body: "Hello from Arcjet protected function!"
  };
};
