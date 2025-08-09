import { neon } from '@netlify/neon';
const sql = neon();

exports.handler = async function(event, context) {
  const { encounterId } = event.queryStringParameters;

  if (!encounterId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing encounterId parameter' })
    };
  }

  try {
    const [cached] = await sql`
      SELECT data 
      FROM boss_logs 
      WHERE encounter_id = ${encounterId}
    `;

    if (!cached) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No cached data found for this encounterId' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(cached.data)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
