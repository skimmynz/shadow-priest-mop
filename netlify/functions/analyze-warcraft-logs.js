// netlify/functions/analyze-warcraft-logs.js
// NOT LIVE

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { reportId, fight, source } = JSON.parse(event.body);

    if (!reportId || !fight) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'reportId and fight are required' })
      };
    }

    // Get environment variables
    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing WarcraftLogs credentials' })
      };
    }

    // Get OAuth2 access token
    const getAccessToken = async () => {
      const response = await fetch('https://www.warcraftlogs.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret
        })
      });

      if (!response.ok) {
        throw new Error(`OAuth failed: ${response.status}`);
      }

      const data = await response.json();
      return data.access_token;
    };

    // Make GraphQL request
    const makeGraphQLRequest = async (query, token) => {
      const response = await fetch('https://www.warcraftlogs.com/api/v2/client', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      return data;
    };

    // GraphQL query to get fight and player data
    const getFightDataQuery = (reportId) => {
      return `
        query {
          reportData {
            report(code: "${reportId}") {
              fights {
                id
                name
                startTime
                endTime
              }
              masterData {
                actors {
                  id
                  name
                  type
                  subType
                }
              }
            }
          }
        }
      `;
    };

    // GraphQL query to get cast events
    const getEventsQuery = (reportId, fightId, sourceId) => {
      return `
        query {
          reportData {
            report(code: "${reportId}") {
              events(
                fightIDs: [${fightId}]
                sourceID: ${sourceId}
                dataType: Casts
                startTime: 0
                endTime: 999999999
              ) {
                data
              }
            }
          }
        }
      `;
    };

    // Get access token
    const token = await getAccessToken();

    // Get fight and player data
    const fightData = await makeGraphQLRequest(getFightDataQuery(reportId), token);
    const report = fightData.data.reportData.report;
    const fightInfo = report.fights.find(f => f.id === parseInt(fight));
    const actors = report.masterData.actors;

    if (!fightInfo) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Fight ${fight} not found in report` })
      };
    }

    // If no source specified, return Priests only
    if (!source) {
      const priests = actors.filter(actor => 
        actor.type === 'Player' && actor.subType === 'Priest'
      );
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          type: 'players',
          fight: fightInfo,
          players: priests
        })
      };
    }

    // Get events data for specific player
    const eventsData = await makeGraphQLRequest(getEventsQuery(reportId, fight, source), token);
    const events = eventsData.data.reportData.report.events.data;
    const player = actors.find(actor => actor.id === parseInt(source));

    if (!player) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Player with ID ${source} not found in report` })
      };
    }

    // Count total cast events
    const totalCasts = events.filter(event => event.type === 'cast').length;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        type: 'events',
        player: player,
        fight: fightInfo,
        events: events,
        totalCasts: totalCasts
      })
    };

  } catch (error) {
    console.error('Error in analyze-warcraft-logs function:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: error.message || 'Internal server error' 
      })
    };
  }
};
