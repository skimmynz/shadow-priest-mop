const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.resolve(__dirname, '../../cache');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

exports.handler = async function(event) {
  const { encounterId } = event.queryStringParameters;
  const apiKey = process.env.WCL_API_KEY;
  const cacheFile = path.join(CACHE_DIR, `${encounterId}.json`);

  if (!encounterId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing encounterId parameter' })
    };
  }

  try {
    // Check cache
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
      const now = Date.now();
      if (now - cached.timestamp < CACHE_TTL) {
        return {
          statusCode: 200,
          body: JSON.stringify(cached.data),
        };
      }
    }

    // Fetch fresh data from Warcraft Logs REST API
    const url = `https://www.warcraftlogs.com/v1/rankings/encounter/${encounterId}?metric=dps&size=25&difficulty=4&class=7&spec=3&includeCombatantInfo=true&api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    // Save to cache
    fs.writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), data }));

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
