const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const { encounterId } = event.queryStringParameters;
  const apiKey = process.env.WCL_API_KEY;

  const url = `https://www.warcraftlogs.com/v1/rankings/encounter/${encounterId}?metric=dps&size=25&difficulty=4&class=7&spec=3&includeCombatantInfo=true&api_key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const cachePath = path.join(__dirname, '../../server_cache.txt');
    let lastUpdated = "Unknown";
    if (fs.existsSync(cachePath)) {
      lastUpdated = fs.readFileSync(cachePath, 'utf8').trim();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ rankings: data.rankings, lastUpdated })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
