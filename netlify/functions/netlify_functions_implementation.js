// netlify/functions/analyze-shadow-priest.js
// Netlify Function for Shadow Priest WarcraftLogs Analysis

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

class WarcraftLogsAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async makeRequest(query, variables = {}) {
    try {
      const response = await fetch(WCL_API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
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
    const reportInfo = await this.getReportInfo(reportCode);
    const report = reportInfo.reportData.report;
    
    const player = report.masterData.actors.find(actor => 
      actor.name.toLowerCase() === playerName.toLowerCase() && 
      actor.type === 'Player'
    );
    
    if (!player) {
      throw new Error(`Player "${playerName}" not found in report`);
    }

    const sourceID = player.id;
    const fightIDs = [fightId];

    const [castEvents, dotEvents, orbEvents] = await Promise.all([
      this.makeRequest(GET_CAST_EVENTS, { code: reportCode, fightIDs, sourceID }),
      this.makeRequest(GET_DOT_EVENTS, { code: reportCode, fightIDs, sourceID }),
      this.makeRequest(GET_SHADOW_ORB_EVENTS, { code: reportCode, fightIDs, sourceID })
    ]);

    return {
      report,
      player,
      castEvents: castEvents.reportData.report.events.data,
      dotEvents: dotEvents.reportData.report.events.data,
      orbEvents: orbEvents.reportData.report.events.data,
      fight: report.fights.find(f => f.id === fightId)
    };
  }
}

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

    return casts;
  }

  analyzeOrbGeneration() {
    let totalOrbs = 0;
    let currentStacks = 0;
    
    this.data.orbEvents.forEach(event => {
      switch (event.type) {
        case 'applybuff':
          currentStacks = 1;
          totalOrbs += 1;
          break;
        case 'applybuffstack':
          const newStacks = event.stacks || 1;
          totalOrbs += (newStacks - currentStacks);
          currentStacks = newStacks;
          break;
        case 'removebuff':
          currentStacks = 0;
          break;
        case 'removebuffstack':
          currentStacks = Math.max(0, currentStacks - 1);
          break;
      }
    });

    return totalOrbs;
  }

  calculatePossibleCasts() {
    const fightDurationSeconds = this.fightDuration / 1000;
    
    return {
      mindBlast: Math.floor(fightDurationSeconds / 8) + 1,
      shadowWordDeath: Math.floor(fightDurationSeconds / 9) + 1
    };
  }

  analyzeDotUptime() {
    const dots = {
      vampiricTouch: this.analyzeSingleDot(SPELL_IDS.VAMPIRIC_TOUCH, 15000, 3000),
      shadowWordPain: this.analyzeSingleDot(SPELL_IDS.SHADOW_WORD_PAIN, 18000, 3000)
    };

    return dots;
  }

  analyzeSingleDot(spellId, duration, tickInterval) {
    const dotEvents = this.data.dotEvents.filter(e => e.ability.guid === spellId);
    const eventsByTarget = {};

    // Group by target
    dotEvents.forEach(event => {
      const targetId = event.targetID;
      if (!eventsByTarget[targetId]) {
        eventsByTarget[targetId] = [];
      }
      eventsByTarget[targetId].push(event);
    });

    let totalUptime = 0;
    let totalClips = 0;
    let totalTicksLost = 0;

    // Analyze each target
    Object.keys(eventsByTarget).forEach(targetId => {
      const events = eventsByTarget[targetId].sort((a, b) => a.timestamp - b.timestamp);
      let activeStart = null;
      let targetUptime = 0;

      events.forEach(event => {
        switch (event.type) {
          case 'applydebuff':
            activeStart = event.timestamp;
            break;
            
          case 'refreshdebuff':
            if (activeStart) {
              const timeActive = event.timestamp - activeStart;
              const remainingTime = duration - timeActive;
              
              if (remainingTime > tickInterval * 1.2) {
                totalClips++;
                totalTicksLost += Math.floor(remainingTime / tickInterval);
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

      // Handle DoT active at fight end
      if (activeStart) {
        const endTime = Math.min(this.fightEnd, activeStart + duration);
        targetUptime += endTime - activeStart;
      }

      totalUptime = Math.max(totalUptime, (targetUptime / this.fightDuration) * 100);
    });

    return {
      uptime: totalUptime,
      clips: totalClips,
      ticksLost: totalTicksLost
    };
  }

  analyze() {
    const casts = this.analyzeCasts();
    const orbs = this.analyzeOrbGeneration();
    const possibleCasts = this.calculatePossibleCasts();
    const dots = this.analyzeDotUptime();

    return {
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

// Main Netlify Function Handler
exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get API key from environment variable
    const apiKey = process.env.WCL_API_KEY;
    if (!apiKey) {
      throw new Error('WarcraftLogs API key not configured');
    }

    // Parse request body
    const { wclUrl, playerName } = JSON.parse(event.body);
    
    if (!wclUrl || !playerName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required parameters: wclUrl and playerName' 
        })
      };
    }

    // Extract report code and fight ID from URL
    const reportCode = extractReportCode(wclUrl);
    const fightId = extractFightId(wclUrl);
    
    if (!reportCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid WarcraftLogs URL format' 
        })
      };
    }

    // Initialize API client
    const api = new WarcraftLogsAPI(apiKey);
    
    // Fetch data from WarcraftLogs
    console.log(`Fetching data for ${playerName} from report ${reportCode}, fight ${fightId}`);
    const data = await api.getShadowPriestData(reportCode, fightId, playerName);
    
    // Analyze the data
    const analyzer = new ShadowPriestAnalyzer(data);
    const results = analyzer.analyze();
    
    // Add metadata
    results.metadata = {
      reportCode,
      fightId,
      playerName,
      fightName: data.fight.name,
      bossName: data.fight.boss?.name || 'Unknown',
      kill: data.fight.kill,
      analyzedAt: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: results
      })
    };

  } catch (error) {
    console.error('Analysis failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// WarcraftLogs API Client (same as before)
class WarcraftLogsAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async makeRequest(query, variables = {}) {
    try {
      const response = await fetch(WCL_API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.errors) {
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
    const reportInfo = await this.getReportInfo(reportCode);
    const report = reportInfo.reportData.report;
    
    const player = report.masterData.actors.find(actor => 
      actor.name.toLowerCase() === playerName.toLowerCase() && 
      actor.type === 'Player'
    );
    
    if (!player) {
      throw new Error(`Player "${playerName}" not found in report`);
    }

    const sourceID = player.id;
    const fightIDs = [fightId];

    const [castEvents, dotEvents, orbEvents] = await Promise.all([
      this.makeRequest(GET_CAST_EVENTS, { code: reportCode, fightIDs, sourceID }),
      this.makeRequest(GET_DOT_EVENTS, { code: reportCode, fightIDs, sourceID }),
      this.makeRequest(GET_SHADOW_ORB_EVENTS, { code: reportCode, fightIDs, sourceID })
    ]);

    return {
      report,
      player,
      castEvents: castEvents.reportData.report.events.data,
      dotEvents: dotEvents.reportData.report.events.data,
      orbEvents: orbEvents.reportData.report.events.data,
      fight: report.fights.find(f => f.id === fightId)
    };
  }
}