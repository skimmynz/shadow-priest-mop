// netlify/functions/analyze-shadow-priest.js
// Fixed version with proper OAuth2 authentication

const SPELL_IDS = {
  DEVOURING_PLAGUE: 2944,
  MIND_BLAST: 8092,
  SHADOW_WORD_DEATH: 32379,
  VAMPIRIC_TOUCH: 34914,
  SHADOW_WORD_PAIN: 589,
  MIND_FLAY: 15407,
  SHADOW_ORBS: 77487,
};

const WCL_API_BASE = 'https://classic.warcraftlogs.com/api/v2/client';
const WCL_OAUTH_BASE = 'https://classic.warcraftlogs.com/oauth/token';

// OAuth2 Authentication Manager
class WCLAuth {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    console.log('Getting OAuth2 access token...');
    
    // Return cached token if still valid
    if (this.token && this.tokenExpiry > Date.now()) {
      console.log('Using cached token');
      return this.token;
    }

    try {
      console.log('Requesting new OAuth2 token...');
      
      const response = await fetch(WCL_OAUTH_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        })
      });

      console.log('OAuth response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OAuth error:', errorText);
        throw new Error(`OAuth failed (${response.status}): Invalid client credentials`);
      }

      const data = await response.json();
      console.log('OAuth2 token received successfully');
      
      this.token = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
      
      return this.token;
    } catch (error) {
      console.error('OAuth2 failed:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
}

// GraphQL Queries
const GET_REPORT_INFO = `
query GetReportInfo($code: String!) {
  reportData {
    report(code: $code) {
      code
      title
      startTime
      endTime
      fights {
        id
        name
        startTime
        endTime
        boss {
          id
          name
        }
        difficulty
        kill
      }
      masterData {
        actors {
          id
          name
          type
          subType
          server
          guid
        }
      }
    }
  }
}`;

const GET_CAST_EVENTS = `
query GetCastEvents($code: String!, $fightIDs: [Int]!, $sourceID: Int!) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        sourceID: $sourceID
        dataType: Casts
        abilityID: [${SPELL_IDS.DEVOURING_PLAGUE}, ${SPELL_IDS.MIND_BLAST}, ${SPELL_IDS.SHADOW_WORD_DEATH}]
      ) {
        data {
          ... on Cast {
            timestamp
            type
            ability {
              guid
              name
            }
            sourceID
          }
        }
      }
    }
  }
}`;

const GET_DOT_EVENTS = `
query GetDoTEvents($code: String!, $fightIDs: [Int]!, $sourceID: Int!) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        sourceID: $sourceID
        dataType: Debuffs
        abilityID: [${SPELL_IDS.VAMPIRIC_TOUCH}, ${SPELL_IDS.SHADOW_WORD_PAIN}]
      ) {
        data {
          ... on ApplyDebuff {
            timestamp
            type
            ability {
              guid
              name
            }
            sourceID
            targetID
          }
          ... on RefreshDebuff {
            timestamp
            type
            ability {
              guid
              name
            }
            sourceID
            targetID
          }
          ... on RemoveDebuff {
            timestamp
            type
            ability {
              guid
              name
            }
            sourceID
            targetID
          }
        }
      }
    }
  }
}`;

const GET_SHADOW_ORB_EVENTS = `
query GetShadowOrbEvents($code: String!, $fightIDs: [Int]!, $sourceID: Int!) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        sourceID: $sourceID
        dataType: Buffs
        abilityID: [${SPELL_IDS.SHADOW_ORBS}]
      ) {
        data {
          ... on ApplyBuff {
            timestamp
            type
            ability {
              guid
              name
            }
            sourceID
            stacks
          }
          ... on ApplyBuffStack {
            timestamp
            type
            ability {
              guid
              name
            }
            sourceID
            stacks
          }
          ... on RemoveBuff {
            timestamp
            type
            ability {
              guid
              name
            }
            sourceID
          }
          ... on RemoveBuffStack {
            timestamp
            type
            ability {
              guid
              name
            }
            sourceID
            stacks
          }
        }
      }
    }
  }
}`;

// WarcraftLogs API Client
class WarcraftLogsAPI {
  constructor(auth) {
    this.auth = auth;
  }

  async makeRequest(query, variables = {}) {
    try {
      console.log('Making WCL API request...');
      
      const token = await this.auth.getAccessToken();
      
      const response = await fetch(WCL_API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      console.log('WCL API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WCL API error response:', errorText);
        throw new Error(`WCL API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(`GraphQL error: ${data.errors[0].message}`);
      }

      return data.data;
    } catch (error) {
      console.error('WCL API Request failed:', error);
      throw error;
    }
  }

  async getReportInfo(reportCode) {
    return await this.makeRequest(GET_REPORT_INFO, { code: reportCode });
  }

  async getShadowPriestData(reportCode, fightId, playerName) {
    console.log(`Getting report info for ${reportCode}`);
    const reportInfo = await this.getReportInfo(reportCode);
    
    if (!reportInfo.reportData || !reportInfo.reportData.report) {
      throw new Error('Report not found or is private');
    }
    
    const report = reportInfo.reportData.report;
    
    const player = report.masterData.actors.find(actor => 
      actor.name.toLowerCase() === playerName.toLowerCase() && 
      actor.type === 'Player'
    );
    
    if (!player) {
      const playerNames = report.masterData.actors
        .filter(actor => actor.type === 'Player')
        .map(actor => actor.name)
        .join(', ');
      throw new Error(`Player "${playerName}" not found. Available players: ${playerNames}`);
    }

    const fight = report.fights.find(f => f.id === fightId);
    if (!fight) {
      const availableFights = report.fights.map(f => `${f.id}: ${f.name}`).join(', ');
      throw new Error(`Fight ${fightId} not found. Available fights: ${availableFights}`);
    }

    const sourceID = player.id;
    const fightIDs = [fightId];

    console.log(`Fetching events for ${playerName} (ID: ${sourceID}) in fight ${fightId}: ${fight.name}`);

    const [castEvents, dotEvents, orbEvents] = await Promise.all([
      this.makeRequest(GET_CAST_EVENTS, { code: reportCode, fightIDs, sourceID }),
      this.makeRequest(GET_DOT_EVENTS, { code: reportCode, fightIDs, sourceID }),
      this.makeRequest(GET_SHADOW_ORB_EVENTS, { code: reportCode, fightIDs, sourceID })
    ]);

    return {
      report,
      player,
      castEvents: castEvents.reportData.report.events.data || [],
      dotEvents: dotEvents.reportData.report.events.data || [],
      orbEvents: orbEvents.reportData.report.events.data || [],
      fight
    };
  }
}

// Shadow Priest Analyzer
class ShadowPriestAnalyzer {
  constructor(data) {
    this.data = data;
    this.fightStart = data.fight.startTime;
    this.fightEnd = data.fight.endTime;
    this.fightDuration = this.fightEnd - this.fightStart;
  }

  analyzeCasts() {
    const casts = {
      devouringPlague: 0,
      mindBlast: 0,
      shadowWordDeath: 0
    };

    this.data.castEvents.forEach(event => {
      switch (event.ability.guid) {
        case SPELL_IDS.DEVOURING_PLAGUE:
          casts.devouringPlague++;
          break;
        case SPELL_IDS.MIND_BLAST:
          casts.mindBlast++;
          break;
        case SPELL_IDS.SHADOW_WORD_DEATH:
          casts.shadowWordDeath++;
          break;
      }
    });

    console.log('Cast analysis:', casts);
    return casts;
  }

  analyzeOrbGeneration() {
    let totalOrbs = 0;
    
    this.data.orbEvents.forEach(event => {
      if (event.type === 'applybuff' || event.type === 'applybuffstack') {
        totalOrbs += 1;
      }
    });

    console.log('Total orbs generated:', totalOrbs);
    return totalOrbs;
  }

  calculatePossibleCasts() {
    const fightDurationSeconds = this.fightDuration / 1000;
    
    const possible = {
      mindBlast: Math.max(1, Math.floor(fightDurationSeconds / 8) + 1),
      shadowWordDeath: Math.max(1, Math.floor(fightDurationSeconds / 9) + 1)
    };

    console.log('Possible casts:', possible);
    return possible;
  }

  analyzeDotUptime() {
    const dots = {
      vampiricTouch: this.analyzeSingleDot(SPELL_IDS.VAMPIRIC_TOUCH, 15000, 3000),
      shadowWordPain: this.analyzeSingleDot(SPELL_IDS.SHADOW_WORD_PAIN, 18000, 3000)
    };

    console.log('DoT analysis:', dots);
    return dots;
  }

  analyzeSingleDot(spellId, duration, tickInterval) {
    const dotEvents = this.data.dotEvents.filter(e => e.ability.guid === spellId);
    
    if (dotEvents.length === 0) {
      return { uptime: 0, clips: 0, ticksLost: 0 };
    }

    const eventsByTarget = {};

    dotEvents.forEach(event => {
      const targetId = event.targetID;
      if (!eventsByTarget[targetId]) {
        eventsByTarget[targetId] = [];
      }
      eventsByTarget[targetId].push(event);
    });

    let bestUptime = 0;
    let totalClips = 0;
    let totalTicksLost = 0;

    Object.keys(eventsByTarget).forEach(targetId => {
      const events = eventsByTarget[targetId].sort((a, b) => a.timestamp - b.timestamp);
      let activeStart = null;
      let targetUptime = 0;
      let targetClips = 0;
      let targetTicksLost = 0;

      events.forEach(event => {
        switch (event.type) {
          case 'applydebuff':
            activeStart = event.timestamp;
            break;
            
          case 'refreshdebuff':
            if (activeStart) {
              const timeActive = event.timestamp - activeStart;
              const remainingTime = duration - timeActive;
              
              if (remainingTime > tickInterval * 1.5) {
                targetClips++;
                targetTicksLost += Math.floor(remainingTime / tickInterval);
              }
              
              targetUptime += timeActive;
              activeStart = event.timestamp;
            }
            break;
            
          case 'removedebuff':
            if (activeStart) {
              targetUptime += event.timestamp - activeStart;
              activeStart = null;
            }
            break;
        }
      });

      if (activeStart) {
        const endTime = Math.min(this.fightEnd, activeStart + duration);
        targetUptime += endTime - activeStart;
      }

      const uptimePercent = (targetUptime / this.fightDuration) * 100;
      bestUptime = Math.max(bestUptime, uptimePercent);
      totalClips += targetClips;
      totalTicksLost += targetTicksLost;
    });

    return {
      uptime: Math.min(100, bestUptime),
      clips: totalClips,
      ticksLost: totalTicksLost
    };
  }

  analyze() {
    console.log('Starting Shadow Priest analysis...');
    
    const casts = this.analyzeCasts();
    const orbs = this.analyzeOrbGeneration();
    const possibleCasts = this.calculatePossibleCasts();
    const dots = this.analyzeDotUptime();

    const results = {
      devouringPlague: {
        casts: casts.devouringPlague,
        orbs: orbs
      },
      mindBlast: {
        casts: casts.mindBlast,
        possible: possibleCasts.mindBlast,
        efficiency: parseFloat(((casts.mindBlast / possibleCasts.mindBlast) * 100).toFixed(1))
      },
      shadowWordDeath: {
        casts: casts.shadowWordDeath,
        possible: possibleCasts.shadowWordDeath,
        efficiency: parseFloat(((casts.shadowWordDeath / possibleCasts.shadowWordDeath) * 100).toFixed(1))
      },
      vampiricTouch: {
        uptime: parseFloat(dots.vampiricTouch.uptime.toFixed(1)),
        clips: dots.vampiricTouch.clips,
        ticksLost: dots.vampiricTouch.ticksLost
      },
      shadowWordPain: {
        uptime: parseFloat(dots.shadowWordPain.uptime.toFixed(1)),
        clips: dots.shadowWordPain.clips,
        ticksLost: dots.shadowWordPain.ticksLost
      },
      fightDuration: this.fightDuration
    };

    console.log('Analysis complete:', results);
    return results;
  }
}

// Utility functions
function extractReportCode(url) {
  const match = url.match(/reports\/([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

function extractFightId(url) {
  const match = url.match(/fight=(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

// Main Netlify Function Handler
exports.handler = async (event, context) => {
  console.log('=== Shadow Priest Analyzer Function Started ===');
  console.log('HTTP Method:', event.httpMethod);
  
  try {
    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      console.log('Handling CORS preflight');
      return createResponse(200, { message: 'CORS OK' });
    }

    if (event.httpMethod !== 'POST') {
      return createResponse(405, { 
        success: false, 
        error: 'Method not allowed' 
      });
    }

    // Check environment variables
    console.log('Checking environment variables...');
    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;
    
    // Fallback to direct API key if OAuth credentials not available
    const directApiKey = process.env.WCL_API_KEY;
    
    if (!clientId || !clientSecret) {
      if (!directApiKey) {
        console.error('No authentication credentials found');
        return createResponse(500, {
          success: false,
          error: 'Server configuration error: Need either OAuth credentials (WCL_CLIENT_ID + WCL_CLIENT_SECRET) or direct API key (WCL_API_KEY)'
        });
      }
      
      console.log('Using direct API key authentication');
      // Use direct API key (this might not work with v2 API)
      return createResponse(500, {
        success: false,
        error: 'WarcraftLogs API v2 requires OAuth2. Please set WCL_CLIENT_ID and WCL_CLIENT_SECRET environment variables instead of WCL_API_KEY'
      });
    }

    console.log('Using OAuth2 authentication');
    console.log('Client ID length:', clientId.length);

    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return createResponse(400, {
        success: false,
        error: 'Invalid JSON in request body'
      });
    }

    const { wclUrl, playerName } = requestData;
    
    if (!wclUrl || !playerName) {
      return createResponse(400, {
        success: false,
        error: 'Missing required parameters: wclUrl and playerName'
      });
    }

    // Extract report details
    const reportCode = extractReportCode(wclUrl);
    const fightId = extractFightId(wclUrl);
    
    console.log('Report code:', reportCode);
    console.log('Fight ID:', fightId);
    console.log('Player name:', playerName);
    
    if (!reportCode) {
      return createResponse(400, {
        success: false,
        error: 'Invalid WarcraftLogs URL format'
      });
    }

    // Initialize OAuth authentication
    const auth = new WCLAuth(clientId, clientSecret);
    const api = new WarcraftLogsAPI(auth);
    
    // Fetch data from WarcraftLogs
    console.log('Fetching Shadow Priest data...');
    const data = await api.getShadowPriestData(reportCode, fightId, playerName);
    
    // Analyze the data
    console.log('Analyzing data...');
    const analyzer = new ShadowPriestAnalyzer(data);
    const results = analyzer.analyze();
    
    // Add metadata
    results.metadata = {
      reportCode,
      fightId,
      playerName: data.player.name,
      fightName: data.fight.name,
      bossName: data.fight.name, // Use fight name as boss name since boss field not available
      kill: data.fight.kill,
      analyzedAt: new Date().toISOString()
    };

    console.log('Analysis successful');
    return createResponse(200, {
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Function handler error:', error);
    
    return createResponse(500, {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
