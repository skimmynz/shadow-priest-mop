import { neon } from '@netlify/neon';
const sql = neon();
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const { encounterId } = event.queryStringParameters;
  const apiKey = process.env.WCL_API_KEY;

  if (!encounterId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing encounterId parameter' })
    };
  }

  try {
    // Check for cached data
    const [cached] = await sql`
      SELECT data 
      FROM boss_logs 
      WHERE encounter_id = ${encounterId}
    `;

    if (cached) {
      return {
        statusCode: 200,
        body: JSON.stringify(cached.data)
      };
    }

    // Fallback: fetch from Warcraft Logs API
    const url = `https://www.warcraftlogs.com/v1/rankings/encounter/${encounterId}?metric=dps&size=25&difficulty=4&class=7&spec=3&includeCombatantInfo=true&api_key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    // Insert into DB with placeholder boss name
    await sql`
      INSERT INTO boss_logs (encounter_id, boss_name, data, last_updated)
      VALUES (${encounterId}, 'Unknown', ${JSON.stringify(data)}, ${new Date().toISOString()})
    `;

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
