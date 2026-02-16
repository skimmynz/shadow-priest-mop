const fetch = require('node-fetch');

// Rate limiting storage (in production, consider using a database)
const rateLimiter = new Map();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  for (const [ip, requests] of rateLimiter.entries()) {
    const validRequests = requests.filter(time => time > windowStart);
    if (validRequests.length === 0) {
      rateLimiter.delete(ip);
    } else {
      rateLimiter.set(ip, validRequests);
    }
  }
}, 30000); // Clean every 30 seconds

exports.handler = async function(event, context) {
  // CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Rate limiting
  const clientIP = event.headers['client-ip'] || 
                   event.headers['x-forwarded-for'] || 
                   event.headers['x-real-ip'] || 
                   'unknown';
  
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  if (rateLimiter.has(clientIP)) {
    const requests = rateLimiter.get(clientIP).filter(time => time > windowStart);
    if (requests.length >= 30) { // Max 30 requests per minute
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ 
          error: 'Rate limit exceeded. Please wait before making more requests.',
          retryAfter: 60 
        })
      };
    }
    requests.push(now);
    rateLimiter.set(clientIP, requests);
  } else {
    rateLimiter.set(clientIP, [now]);
  }

  // Validate encounterId
  const encounterId = parseInt(event.queryStringParameters?.encounterId);
  if (!encounterId || encounterId < 1 || encounterId > 99999) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid encounterId parameter' })
    };
  }

  // Check for API key
  const apiKey = process.env.WCL_API_KEY;
  if (!apiKey) {
    console.error('WCL_API_KEY environment variable not set');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  try {
    const url = `https://www.warcraftlogs.com/v1/rankings/encounter/${encounterId}?metric=dps&size=25&difficulty=4&class=7&spec=3&includeCombatantInfo=true&api_key=${apiKey}`;
    
    console.log(`Fetching data for encounter ${encounterId} from WCL API`);
    
    const response = await fetch(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'ShadowPriest-Rankings/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`WCL API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Add server timestamp for caching
    const processedData = {
      ...data,
      cachedAt: new Date().toISOString(),
      encounterId: encounterId
    };
    
    console.log(`Successfully fetched ${data.rankings?.length || 0} rankings for encounter ${encounterId}`);
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
      },
      body: JSON.stringify(processedData)
    };
    
  } catch (error) {
    console.error('WCL API Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch data from Warcraft Logs',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
