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
