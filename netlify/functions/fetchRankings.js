const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const CACHE_PATH = path.join(__dirname, '../../public/cache/mogushan.json');
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

exports.handler = async function(event, context) {
  try {
    const now = Date.now();
    let cachedData;

    if (fs.existsSync(CACHE_PATH)) {
      const file = fs.readFileSync(CACHE_PATH, 'utf-8');
      cachedData = JSON.parse(file);

      if (now - cachedData.timestamp < CACHE_TTL) {
        return {
          statusCode: 200,
          body: JSON.stringify(cachedData.data),
        };
      }
    }

    // Fetch fresh data from Warcraft Logs API
    const response = await fetch('https://www.warcraftlogs.com/api/v2/your-query', {
      headers: { Authorization: `Bearer ${process.env.WCL_API_TOKEN}` },
    });
    const data = await response.json();

    // Cache it
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ timestamp: now, data }));

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
