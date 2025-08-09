const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.resolve(__dirname, '../../cache');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

exports.handler = async function(event) {
  const encounterId = event.queryStringParameters.encounterId;
  const cacheFile = path.join(CACHE_DIR, `${encounterId}.json`);

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

    // Fetch fresh data
    const response = await fetch(`https://www.warcraftlogs.com/api/v2/your-query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WCL_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `your GraphQL query here`,
        variables: { encounterId: parseInt(encounterId) }
      })
    });

    const data = await response.json();

    // Save to cache
    fs.writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), data }));

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
