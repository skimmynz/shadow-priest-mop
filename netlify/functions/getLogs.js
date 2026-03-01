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
      timeout: 10000,
      headers: { 'User-Agent': 'ShadowPriest-Rankings/1.0' }
    });

    if (!response.ok) {
      throw new Error(`WCL API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rankings = Array.isArray(data.rankings) ? data.rankings : [];

    // Collect unique reportIDs and fetch haste for all reports simultaneously
    const uniqueReports = [...new Set(rankings.map(r => r.reportID).filter(Boolean))];

    async function fetchHasteForReport(reportID) {
      try {
        const reqOpts = { timeout: 8000, headers: { 'User-Agent': 'ShadowPriest-Rankings/1.0' } };
        const [fightsRes, eventsRes] = await Promise.all([
          fetch(`https://www.warcraftlogs.com/v1/report/fights/${reportID}?api_key=${apiKey}`, reqOpts),
          fetch(`https://www.warcraftlogs.com/v1/report/events/${reportID}?start=0&end=9999999999&type=combatantinfo&api_key=${apiKey}`, reqOpts)
        ]);
        if (!fightsRes.ok || !eventsRes.ok) return {};
        const [fightsData, eventsData] = await Promise.all([fightsRes.json(), eventsRes.json()]);
        const actorNames = {};
        for (const f of (fightsData.friendlies || [])) actorNames[f.id] = f.name;
        const hasteMap = {};
        for (const ev of (eventsData.events || [])) {
          const name = actorNames[ev.sourceID];
          if (name && typeof ev.hasteSpell === 'number' && !hasteMap[name]) hasteMap[name] = ev.hasteSpell;
        }
        return hasteMap;
      } catch (e) {
        return {};
      }
    }

    // Run all report fetches simultaneously, but cap total time to stay within the
    // Netlify function 10s limit (initial rankings fetch already consumed some of it).
    const HASTE_BUDGET_MS = 6000;
    const hasteTimeout = new Promise(resolve => setTimeout(() => resolve(null), HASTE_BUDGET_MS));
    const hasteResults = await Promise.race([
      Promise.all(uniqueReports.map(rid => fetchHasteForReport(rid))),
      hasteTimeout
    ]);

    if (hasteResults !== null) {
      // Completed within budget — embed hasteRating into each ranking entry
      const hasteByReport = {};
      uniqueReports.forEach((rid, i) => { hasteByReport[rid] = hasteResults[i]; });
      for (const r of rankings) {
        const hasteMap = hasteByReport[r.reportID];
        if (hasteMap && typeof hasteMap[r.name] === 'number') r.hasteRating = hasteMap[r.name];
      }
    }
    // If hasteResults is null the budget expired — rankings return without hasteRating;
    // the client fallback (getPlayerHaste) will fill in haste values asynchronously.

    // Add server timestamp for caching
    const processedData = {
      ...data,
      rankings,
      cachedAt: new Date().toISOString(),
      encounterId: encounterId
    };

    console.log(`Successfully fetched ${rankings.length} rankings for encounter ${encounterId}`);
    
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
