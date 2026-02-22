const fetch = require('node-fetch');

// Hardcoded character — this endpoint only serves skimmyxo's data.
const CHAR   = 'skimmyxo';
const SERVER = 'arugal-au';
const REGION = 'us';

exports.handler = async function(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const apiKey = process.env.WCL_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' }),
    };
  }

  try {
    // WarcraftLogs v1 character rankings — returns best parse per encounter.
    // difficulty=4 (Heroic), size=25 — matches WarcraftLogs character page defaults.
    const url =
      `https://classic.warcraftlogs.com/v1/rankings/character/${CHAR}/${SERVER}/${REGION}` +
      `?metric=dps&difficulty=4&size=25&api_key=${apiKey}`;

    const res = await fetch(url, {
      timeout: 10000,
      headers: { 'User-Agent': 'ShadowPriest-Rankings/1.0' },
    });

    if (!res.ok) {
      throw new Error(`WCL returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        // 30-min fresh, 2-hour stale-while-revalidate
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=7200',
      },
      body: JSON.stringify({ rankings: data, cachedAt: Date.now() }),
    };
  } catch (err) {
    console.error('getCharacter error:', err);
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
