// Add rate limiting
const rateLimiter = new Map();
exports.handler = async function(event, context) {
  const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'];
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (rateLimiter.has(clientIP)) {
    const requests = rateLimiter.get(clientIP).filter(time => time > windowStart);
    if (requests.length >= 30) { // Max 30 requests per minute
      return {
        statusCode: 429,
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      };
    }
    requests.push(now);
    rateLimiter.set(clientIP, requests);
  } else {
    rateLimiter.set(clientIP, [now]);
  }
  
  // Validate encounterId is numeric
  const encounterId = parseInt(event.queryStringParameters?.encounterId);
  if (!encounterId || encounterId < 1 || encounterId > 99999) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid encounterId' })
    };
  }
  
};

const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const { encounterId } = event.queryStringParameters;
  const apiKey = process.env.WCL_API_KEY;
  
  if (!encounterId) {
    return {
      statusCode: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Missing encounterId parameter' })
    };
  }

  try {
    const url = `https://www.warcraftlogs.com/v1/rankings/encounter/${encounterId}?metric=dps&size=25&difficulty=4&class=7&spec=3&includeCombatantInfo=true&api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Add server timestamp for caching
    const processedData = {
      ...data,
      cachedAt: new Date().toISOString()
    };
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=21600' // 6 hours
      },
      body: JSON.stringify(processedData)
    };
  } catch (error) {
    console.error('WCL API Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
