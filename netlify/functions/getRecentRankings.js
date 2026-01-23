const fetch = require('node-fetch');

// Rate limiting storage
const rateLimiter = new Map();

// Clean up old entries periodically
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

// Currently available MoP boss encounter IDs (T14 + T15)
const BOSS_IDS = [
  // T14 - Mogu'shan Vaults
  1395, // The Stone Guard
  1390, // Feng the Accursed
  1434, // Gara'jal the Spiritbinder
  1436, // The Spirit Kings
  1500, // Elegon
  1407, // Will of the Emperor
  
  // T14 - Heart of Fear
  1507, // Imperial Vizier Zor'lok
  1504, // Blade Lord Ta'yak
  1463, // Garalon
  1498, // Wind Lord Mel'jarak
  1499, // Amber-Shaper Un'sok
  1501, // Grand Empress Shek'zeer
  
  // T14 - Terrace of Endless Spring
  1409, // Protectors of the Endless
  1505, // Tsulong
  1506, // Lei Shi
  1431, // Sha of Fear
  
  // T15 - Throne of Thunder
  51577, // Jin'rokh the Breaker
  51575, // Horridon
  51570, // Council of Elders
  51565, // Tortos
  51578, // Megaera
  51573, // Ji-Kun
  51572, // Durumu the Forgotten
  51574, // Primordius
  51576, // Dark Animus
  51559, // Iron Qon
  51560, // Twin Consorts
  51579, // Lei Shen
  51580  // Ra-den
];

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
    if (requests.length >= 30) {
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
    console.log('Starting to fetch rankings from', BOSS_IDS.length, 'bosses');
    
    // Fetch top 3 rankings from each boss
    const fetchPromises = BOSS_IDS.map(async (encounterId) => {
      const url = `https://www.warcraftlogs.com/v1/rankings/encounter/${encounterId}?metric=dps&size=3&difficulty=4&class=7&spec=3&api_key=${apiKey}`;
      
      try {
        const response = await fetch(url, {
          timeout: 5000,
          headers: { 'User-Agent': 'ShadowPriest-Rankings/1.0' }
        });
        
        if (!response.ok) {
          console.log(`Encounter ${encounterId} returned status ${response.status}`);
          return null;
        }
        
        const data = await response.json();
        console.log(`Encounter ${encounterId}: ${data.rankings?.length || 0} rankings`);
        return data.rankings || [];
      } catch (error) {
        console.error(`Failed to fetch encounter ${encounterId}:`, error.message);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    
    // Flatten and filter out nulls
    const allRankings = results
      .filter(result => result !== null)
      .flat();

    console.log(`Total rankings before filtering: ${allRankings.length}`);

    // Filter rankings that have DPS data
    const validRankings = allRankings.filter(ranking => ranking && ranking.total > 0);
    
    console.log(`Valid rankings with DPS > 0: ${validRankings.length}`);

    // Sort by DPS (total) descending and take top 5
    const topRankings = validRankings
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    console.log(`Successfully fetched ${topRankings.length} recent top rankings`);
    console.log('Top DPS values:', topRankings.map(r => r.total));

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=300' // 5 minutes
      },
      body: JSON.stringify({
        rankings: topRankings,
        cachedAt: new Date().toISOString(),
        count: topRankings.length
      })
    };
    
  } catch (error) {
    console.error('Error fetching recent rankings:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to fetch recent rankings',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
