const fetch = require('node-fetch');

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
    const reqOpts = { timeout: 10000, headers: { 'User-Agent': 'ShadowPriest-Rankings/1.0' } };

    // Fire both calls in parallel — combatantinfo events fire at fight start so the
    // full-report window (0..INT_MAX) always captures them without needing fight timestamps first.
    const [fightsRes, eventsRes] = await Promise.all([
      fetch(`https://www.warcraftlogs.com/v1/report/fights/${reportID}?api_key=${apiKey}`, reqOpts),
      fetch(`https://www.warcraftlogs.com/v1/report/events/${reportID}?start=0&end=9999999999&type=combatantinfo&api_key=${apiKey}`, reqOpts)
    ]);

    if (!fightsRes.ok) throw new Error(`Fights API returned ${fightsRes.status}`);
    if (!eventsRes.ok) throw new Error(`Events API returned ${eventsRes.status}`);

    const [fightsData, eventsData] = await Promise.all([fightsRes.json(), eventsRes.json()]);

    // Build actorID -> name map from friendlies
    const actorNames = {};
    for (const f of (fightsData.friendlies || [])) {
      actorNames[f.id] = f.name;
    }

    // Build playerName -> hasteRating map (first combatantinfo event per player wins)
    const players = {};
    for (const ev of (eventsData.events || [])) {
      const name = actorNames[ev.sourceID];
      if (name && typeof ev.hasteSpell === 'number' && !players[name]) {
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
