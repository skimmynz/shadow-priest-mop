// netlify/functions/analyze-shadow-priest.js

// -----------------------------
// Constants / Spell IDs (MoP)
// -----------------------------
const SPELL_IDS = {
  DEVOURING_PLAGUE: 2944,
  MIND_BLAST: 8092,
  SHADOW_WORD_DEATH: 32379,
  VAMPIRIC_TOUCH: 34914,
  SHADOW_WORD_PAIN: 589,
  MIND_FLAY: 15407,
  SHADOW_ORBS: 95740, // MoP Classic aura id (not 77487)
};

// Public v2 endpoints on main domain (recommended)
// Docs: https://www.warcraftlogs.com/api/docs
const WCL_API_BASE = 'https://www.warcraftlogs.com/api/v2/client';
const WCL_OAUTH_BASE = 'https://www.warcraftlogs.com/oauth/token';

// -----------------------------
// OAuth2 Authentication
// -----------------------------
class WCLAuth {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.token = null;
    this.tokenExpiry = 0;
  }

  async getAccessToken() {
    if (this.token && this.tokenExpiry > Date.now()) return this.token;

    const res = await fetch(WCL_OAUTH_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`OAuth failed (${res.status}): ${t}`);
    }
    const data = await res.json();
    this.token = data.access_token;
    // subtract 60s buffer
    this.tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000;
    return this.token;
  }
}

// -----------------------------
// GraphQL Queries
// -----------------------------
// IMPORTANT: ReportFight does not have 'boss { }' field. Use encounterID, times, kill, etc.
const GET_REPORT_INFO = `
query GetReportInfo($code: String!) {
  reportData {
    report(code: $code) {
      code
      title
      startTime
      endTime
      fights(translate: true) {
        id
        encounterID
        startTime
        endTime
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

// For events, the v2 API returns a paginator with JSON 'data' and 'nextPageTimestamp'.
const GET_CAST_EVENTS = `
query GetCastEvents($code: String!, $fightIDs: [Int]!, $sourceID: Int!, $start: Float, $end: Float) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        sourceID: $sourceID
        dataType: Casts
        abilityID: [${SPELL_IDS.DEVOURING_PLAGUE}, ${SPELL_IDS.MIND_BLAST}, ${SPELL_IDS.SHADOW_WORD_DEATH}]
        startTime: $start
        endTime: $end
        limit: 10000
        useAbilityIDs: true
      ) {
        data
        nextPageTimestamp
      }
    }
  }
}`;

const GET_DOT_EVENTS = `
query GetDoTEvents($code: String!, $fightIDs: [Int]!, $sourceID: Int!, $start: Float, $end: Float) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        sourceID: $sourceID
        dataType: Debuffs
        abilityID: [${SPELL_IDS.VAMPIRIC_TOUCH}, ${SPELL_IDS.SHADOW_WORD_PAIN}]
        startTime: $start
        endTime: $end
        limit: 10000
        useAbilityIDs: true
      ) {
        data
        nextPageTimestamp
      }
    }
  }
}`;

const GET_SHADOW_ORB_EVENTS = `
query GetShadowOrbEvents($code: String!, $fightIDs: [Int]!, $sourceID: Int!, $start: Float, $end: Float) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        sourceID: $sourceID
        dataType: Buffs
        abilityID: [${SPELL_IDS.SHADOW_ORBS}]
        startTime: $start
        endTime: $end
        limit: 10000
        useAbilityIDs: true
      ) {
        data
        nextPageTimestamp
      }
    }
  }
}`;

const GET_DAMAGE_EVENTS = `
query GetDamageEvents($code: String!, $fightIDs: [Int]!, $sourceID: Int!, $start: Float, $end: Float) {
  reportData {
    report(code: $code) {
      events(
        fightIDs: $fightIDs
        sourceID: $sourceID
        dataType: DamageDone
        abilityID: [${SPELL_IDS.MIND_BLAST}, ${SPELL_IDS.SHADOW_WORD_DEATH}]
        startTime: $start
        endTime: $end
        limit: 10000
        useAbilityIDs: true
      ) {
        data
        nextPageTimestamp
      }
    }
  }
}`;

// -----------------------------
// Warcraft Logs API Client
// -----------------------------
class WarcraftLogsAPI {
  constructor(auth) { this.auth = auth; }

  async makeRequest(query, variables = {}) {
    const token = await this.auth.getAccessToken();
    const res = await fetch(WCL_API_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`WCL API error (${res.status}): ${t}`);
    }
    const json = await res.json();
    if (json.errors) throw new Error(`GraphQL error: ${json.errors[0].message}`);
    return json.data;
  }

  // Generic paginator: keeps fetching pages until nextPageTimestamp is null.
  async fetchAllEvents(query, variables) {
    const all = [];
    let next = variables.start ?? undefined;
    let safety = 0;
    do {
      const pageVars = { ...variables, start: next };
      const data = await this.makeRequest(query, pageVars);
      const paginator = data?.reportData?.report?.events;
      if (!paginator) break;
      const items = Array.isArray(paginator.data) ? paginator.data : [];
      all.push(...items);
      next = paginator.nextPageTimestamp ?? null;
      safety++;
    } while (next && safety < 100); // guard
    return all;
  }

  async getReportInfo(reportCode) {
    return await this.makeRequest(GET_REPORT_INFO, { code: reportCode });
  }

  async getShadowPriestData(reportCode, fightId, playerName) {
    const info = await this.getReportInfo(reportCode);
    const report = info?.reportData?.report;
    if (!report) throw new Error('Report not found or is private');

    const player = report.masterData.actors.find(
      a => a.type === 'Player' && a.name.toLowerCase() === playerName.toLowerCase()
    );
    if (!player) {
      const names = report.masterData.actors.filter(a => a.type === 'Player').map(a => a.name).join(', ');
      throw new Error(`Player "${playerName}" not found. Available players: ${names}`);
    }

    const fight = report.fights.find(f => f.id === fightId);
    if (!fight) {
      const fightsList = report.fights.map(f => `${f.id}:${f.encounterID}`).join(', ');
      throw new Error(`Fight ${fightId} not found. Available fights: ${fightsList}`);
    }

    const sourceID = player.id;
    const fightIDs = [fightId];
    const start = fight.startTime;
    const end = fight.endTime;

    // Fetch and paginate all events
    const [casts, debuffs, orbs, damage] = await Promise.all([
      this.fetchAllEvents(GET_CAST_EVENTS, { code: reportCode, fightIDs, sourceID, start, end }),
      this.fetchAllEvents(GET_DOT_EVENTS, { code: reportCode, fightIDs, sourceID, start, end }),
      this.fetchAllEvents(GET_SHADOW_ORB_EVENTS, { code: reportCode, fightIDs, sourceID, start, end }),
      this.fetchAllEvents(GET_DAMAGE_EVENTS, { code: reportCode, fightIDs, sourceID, start, end }),
    ]);

    return { report, player, fight, castEvents: casts, dotEvents: debuffs, orbEvents: orbs, dmgEvents: damage };
  }
}

// -----------------------------
// Analyzer
// -----------------------------
class ShadowPriestAnalyzer {
  constructor(data) {
    this.data = data;
    this.fightStart = data.fight.startTime;
    this.fightEnd = data.fight.endTime;
    this.fightDuration = this.fightEnd - this.fightStart;
  }

  abilityIdOf(e) {
    // Events JSON may contain abilityGameID or ability.guid depending on options
    return e.abilityGameID ?? e.ability?.guid ?? e.ability?.id ?? null;
  }

  analyzeCasts() {
    const counts = { devouringPlague: 0, mindBlast: 0, shadowWordDeath: 0 };
    for (const e of this.data.castEvents) {
      if (e.type !== 'cast') continue;
      const id = this.abilityIdOf(e);
      if (id === SPELL_IDS.DEVOURING_PLAGUE) counts.devouringPlague++;
      else if (id === SPELL_IDS.MIND_BLAST) counts.mindBlast++;
      else if (id === SPELL_IDS.SHADOW_WORD_DEATH) counts.shadowWordDeath++;
    }
    return counts;
  }

  analyzeOrbGeneration() {
    // Track stack deltas for the Shadow Orbs aura (95740)
    let totalOrbs = 0;
    let lastStacks = 0;
    for (const e of this.data.orbEvents) {
      if (!['applybuff', 'applybuffstack', 'removebuffstack', 'removebuff'].includes(e.type)) continue;
      const id = this.abilityIdOf(e);
      if (id !== SPELL_IDS.SHADOW_ORBS) continue;

      // Pull stacks from common fields that may appear in JSON:
      const nextStacks =
        e.stacks ?? e.stack ?? e.newStacks ?? e.new_stack ?? e.new ?? (e.type === 'removebuff' ? 0 : undefined);

      if (typeof nextStacks === 'number') {
        const delta = nextStacks - lastStacks;
        if (delta > 0) totalOrbs += delta;
        lastStacks = nextStacks;
      } else {
        // Fallback: if we don't get stack counts, count apply/stack as +1
        if (e.type === 'applybuff' || e.type === 'applybuffstack') totalOrbs += 1;
      }
    }
    return totalOrbs;
  }

  calculatePossibleCasts() {
    const secs = this.fightDuration / 1000;
    // Simple baseline (you can refine with haste/procs later)
    return {
      mindBlast: Math.max(1, Math.floor(secs / 8) + 1),
      shadowWordDeath: Math.max(1, Math.floor(secs / 9) + 1),
    };
  }

  analyzeDotUptime() {
    const vt = this.analyzeSingleDot(SPELL_IDS.VAMPIRIC_TOUCH, 15000, 3000); // adjust if you prefer 18s/3s
    const swp = this.analyzeSingleDot(SPELL_IDS.SHADOW_WORD_PAIN, 18000, 3000);
    return { vampiricTouch: vt, shadowWordPain: swp };
  }

  analyzeSingleDot(spellId, duration, tickInterval) {
    // Only events for this DoT
    const events = this.data.dotEvents.filter(e => this.abilityIdOf(e) === spellId);

    if (events.length === 0) {
      return { uptime: 0, clips: 0, ticksLost: 0 };
    }

    // Group by target
    const byTarget = new Map();
    for (const e of events) {
      const tgt = e.targetID ?? e.target?.id ?? 'unknown';
      if (!byTarget.has(tgt)) byTarget.set(tgt, []);
      byTarget.get(tgt).push(e);
    }

    let bestUptime = 0;
    let totalClips = 0;
    let totalTicksLost = 0;

    for (const [_, evs] of byTarget) {
      evs.sort((a, b) => a.timestamp - b.timestamp);

      let activeStart = null;
      let targetUptime = 0;
      let clips = 0;
      let ticksLost = 0;

      for (const e of evs) {
        switch (e.type) {
          case 'applydebuff':
            activeStart = e.timestamp;
            break;
          case 'refreshdebuff':
            if (activeStart) {
              const timeActive = e.timestamp - activeStart;
              const remaining = duration - timeActive;
              if (remaining > tickInterval * 1.5) {
                clips += 1;
                ticksLost += Math.floor(remaining / tickInterval);
              }
              targetUptime += timeActive;
              activeStart = e.timestamp;
            }
            break;
          case 'removedebuff':
            if (activeStart) {
              targetUptime += e.timestamp - activeStart;
              activeStart = null;
            }
            break;
        }
      }

      if (activeStart) {
        const endTime = Math.min(this.fightEnd, activeStart + duration);
        targetUptime += endTime - activeStart;
      }

      const pct = (targetUptime / this.fightDuration) * 100;
      bestUptime = Math.max(bestUptime, pct);
      totalClips += clips;
      totalTicksLost += ticksLost;
    }

    return {
      uptime: Math.min(100, bestUptime),
      clips: totalClips,
      ticksLost: totalTicksLost,
    };
  }

  analyze() {
    const casts = this.analyzeCasts();
    const orbs = this.analyzeOrbGeneration();
    const possible = this.calculatePossibleCasts();
    const dots = this.analyzeDotUptime();

    return {
      devouringPlague: { casts: casts.devouringPlague, orbs },
      mindBlast: {
        casts: casts.mindBlast,
        possible: possible.mindBlast,
        efficiency: Number(((casts.mindBlast / possible.mindBlast) * 100).toFixed(1)),
      },
      shadowWordDeath: {
        casts: casts.shadowWordDeath,
        possible: possible.shadowWordDeath,
        efficiency: Number(((casts.shadowWordDeath / possible.shadowWordDeath) * 100).toFixed(1)),
      },
      vampiricTouch: {
        uptime: Number(dots.vampiricTouch.uptime.toFixed(1)),
        clips: dots.vampiricTouch.clips,
        ticksLost: dots.vampiricTouch.ticksLost,
      },
      shadowWordPain: {
        uptime: Number(dots.shadowWordPain.uptime.toFixed(1)),
        clips: dots.shadowWordPain.clips,
        ticksLost: dots.shadowWordPain.ticksLost,
      },
      fight: {
        id: this.data.fight.id,
        encounterID: this.data.fight.encounterID,
        durationMs: this.fightDuration,
        kill: this.data.fight.kill,
        difficulty: this.data.fight.difficulty,
      },
    };
  }
}

// -----------------------------
// Utilities
// -----------------------------
function extractReportCode(url) {
  const m = url.match(/reports\/([A-Za-z0-9]+)/);
  return m ? m[1] : null;
}
function extractFightId(url) {
  const m = url.match(/fight=(\d+)/);
  return m ? parseInt(m[1]) : 1;
}
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

// -----------------------------
// Netlify Handler
// -----------------------------
exports.handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') return createResponse(200, { message: 'CORS OK' });
    if (event.httpMethod !== 'POST') return createResponse(405, { success: false, error: 'Method not allowed' });

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return createResponse(500, {
        success: false,
        error: 'Server configuration error: set WCL_CLIENT_ID and WCL_CLIENT_SECRET',
      });
    }

    let req;
    try {
      req = JSON.parse(event.body || '{}');
    } catch {
      return createResponse(400, { success: false, error: 'Invalid JSON in request body' });
    }

    const { wclUrl, playerName } = req;
    if (!wclUrl || !playerName) {
      return createResponse(400, { success: false, error: 'Missing required parameters: wclUrl and playerName' });
    }

    const reportCode = extractReportCode(wclUrl);
    const fightId = extractFightId(wclUrl);
    if (!reportCode) return createResponse(400, { success: false, error: 'Invalid WarcraftLogs URL format' });

    const api = new WarcraftLogsAPI(new WCLAuth(clientId, clientSecret));

    const data = await api.getShadowPriestData(reportCode, fightId, playerName);
    const analyzer = new ShadowPriestAnalyzer(data);
    const results = analyzer.analyze();

    return createResponse(200, {
      success: true,
      data: {
        ...results,
        metadata: {
          reportCode,
          fightId,
          encounterID: data.fight.encounterID,
          playerName: data.player.name,
          analyzedAt: new Date().toISOString(),
        },
      },
    });
  } catch (err) {
    return createResponse(500, { success: false, error: err.message, timestamp: new Date().toISOString() });
  }
};
