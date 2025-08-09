
import { neon } from '@netlify/neon';
const sql = neon();
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  const apiKey = process.env.WCL_API_KEY;
  const now = new Date().toISOString();

  const bosses = [
  {
    "encounter_id": 1395,
    "boss_name": "The Stone Guard"
  },
  {
    "encounter_id": 1390,
    "boss_name": "Feng the Accursed"
  },
  {
    "encounter_id": 1434,
    "boss_name": "Gara'jal the Spiritbinder"
  },
  {
    "encounter_id": 1436,
    "boss_name": "The Spirit Kings"
  },
  {
    "encounter_id": 1500,
    "boss_name": "Elegon"
  },
  {
    "encounter_id": 1407,
    "boss_name": "Will of the Emperor"
  }
];

  for (const boss of bosses) {
    const url = `https://www.warcraftlogs.com/v1/rankings/encounter/${boss.encounter_id}?metric=dps&size=25&difficulty=4&class=7&spec=3&includeCombatantInfo=true&api_key=${apiKey}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      await sql`
        INSERT INTO boss_logs (encounter_id, boss_name, data, last_updated)
        VALUES (${boss.encounter_id}, ${boss.boss_name}, ${JSON.stringify(data)}, ${now})
        ON CONFLICT (encounter_id)
        DO UPDATE SET boss_name = ${boss.boss_name}, data = ${JSON.stringify(data)}, last_updated = ${now}
      `;
    } catch (error) {
      console.error(`Failed to update data for ${boss.boss_name}:`, error.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Boss logs updated successfully." })
  };
};
