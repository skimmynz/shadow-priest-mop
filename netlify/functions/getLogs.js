const fetch = require('node-fetch');

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
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
        'CDN-Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200'
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
