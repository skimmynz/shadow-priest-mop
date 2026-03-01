const fetch = require('node-fetch');

const rateLimiter = new Map();

setInterval(() => {
  const now = Date.now();
  const windowStart = now - 60000;
  for (const [ip, requests] of rateLimiter.entries()) {
    const validRequests = requests.filter(time => time > windowStart);
    if (validRequests.length === 0) {
      rateLimiter.delete(ip);
    } else {
      rateLimiter.set(ip, validRequests);
    }
  }
}, 30000);

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Rate limiting
  const clientIP = event.headers['client-ip'] ||
                   event.headers['x-forwarded-for'] ||
                   event.headers['x-real-ip'] ||
                   'unknown';
  const now = Date.now();
  const windowStart = now - 60000;
  if (rateLimiter.has(clientIP)) {
    const requests = rateLimiter.get(clientIP).filter(time => time > windowStart);
    if (requests.length >= 60) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded. Please wait before making more requests.', retryAfter: 60 })
      };
    }
    requests.push(now);
    rateLimiter.set(clientIP, requests);
  } else {
    rateLimiter.set(clientIP, [now]);
  }

  const reportID = event.queryStringParameters && event.queryStringParameters.reportID;
  const fightID = parseInt(event.queryStringParameters && event.queryStringParameters.fightID);
  if (!reportID || !/^[a-zA-Z0-9]{8,24}$/.test(reportID) || !fightID || fightID < 1) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid reportID or fightID parameter' })
    };
  }

  const apiKey = process.env.WCL_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server configuration error' })
    };
  }

  try {
    // Step 1: Get fight timestamps and actor name map
    const fightsUrl = `https://www.warcraftlogs.com/v1/report/fights/${reportID}?api_key=${apiKey}`;
    const fightsRes = await fetch(fightsUrl, { timeout: 10000, headers: { 'User-Agent': 'ShadowPriest-Rankings/1.0' } });
    if (!fightsRes.ok) throw new Error(`Fights API returned ${fightsRes.status}`);
    const fightsData = await fightsRes.json();

    const fight = (fightsData.fights || []).find(f => f.id === fightID);
    if (!fight) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Fight not found in report' })
      };
    }

    // Build actorID -> name map from friendlies
    const actorNames = {};
    for (const f of (fightsData.friendlies || [])) {
      actorNames[f.id] = f.name;
    }

    // Step 2: Fetch combatantinfo events for the fight window
    const eventsUrl = `https://www.warcraftlogs.com/v1/report/events/${reportID}?start=${fight.start_time}&end=${fight.end_time}&type=combatantinfo&api_key=${apiKey}`;
    const eventsRes = await fetch(eventsUrl, { timeout: 10000, headers: { 'User-Agent': 'ShadowPriest-Rankings/1.0' } });
    if (!eventsRes.ok) throw new Error(`Events API returned ${eventsRes.status}`);
    const eventsData = await eventsRes.json();

    // Step 3: Build playerName -> hasteRating map
    const players = {};
    for (const ev of (eventsData.events || [])) {
      const name = actorNames[ev.sourceID];
      if (name && typeof ev.hasteSpell === 'number') {
        players[name] = { hasteRating: ev.hasteSpell };
      }
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        'CDN-Cache-Control': 'public, max-age=300, stale-while-revalidate=3600'
      },
      body: JSON.stringify({ players })
    };

  } catch (error) {
    console.error('getPlayerHaste error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch haste data', details: error.message })
    };
  }
};
