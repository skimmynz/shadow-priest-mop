import React, { useState } from 'react';
import { AlertCircle, Search, Loader2, BarChart3 } from 'lucide-react';

const WarcraftLogsAnalyzer = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // Shadow Priest spells to track
  const shadowPriestSpells = {
    34914: 'Vampiric Touch',
    2944: 'Devouring Plague', 
    589: 'Shadow Word: Pain',
    8092: 'Mind Blast',
    15407: 'Mind Flay',
    32379: 'Shadow Word: Death',
    73510: 'Mind Spike'
  };

  // Parse WarcraftLogs URL to extract report ID, fight, and source
  const parseUrl = (url) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const reportId = pathParts[pathParts.length - 1];
      
      const params = new URLSearchParams(urlObj.search);
      const fight = params.get('fight');
      const source = params.get('source');
      
      return { reportId, fight, source };
    } catch (err) {
      throw new Error('Invalid URL format');
    }
  };

  const analyzeLog = async () => {
    if (!url.trim()) {
      setError('Please enter a WarcraftLogs URL');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const { reportId, fight, source } = parseUrl(url);
      
      if (!reportId || !fight) {
        throw new Error('URL must include report ID and fight number');
      }

      // Call Netlify function
      const response = await fetch('/.netlify/functions/analyze-warcraft-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportId,
          fight,
          source
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.type === 'players') {
        setResults({
          type: 'players',
          fight: data.fight,
          players: data.players
        });
      } else {
        // Process cast data
        const castCounts = {};
        let totalTrackedCasts = 0;
        
        data.events.forEach(event => {
          if (event.type === 'cast' && shadowPriestSpells[event.abilityGameID]) {
            const spellName = shadowPriestSpells[event.abilityGameID];
            castCounts[spellName] = (castCounts[spellName] || 0) + 1;
            totalTrackedCasts++;
          }
        });

        // Sort by cast count descending
        const sortedCasts = Object.entries(castCounts)
          .sort(([,a], [,b]) => b - a)
          .map(([spell, count]) => ({ spell, count }));

        setResults({
          type: 'casts',
          player: data.player,
          fight: data.fight,
          casts: sortedCasts,
          totalTrackedCasts: totalTrackedCasts,
          totalAllCasts: data.totalCasts
        });
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BarChart3 className="w-8 h-8 text-blue-300" />
              <h1 className="text-3xl font-bold text-white">Shadow Priest Cast Analyzer</h1>
            </div>
            <p className="text-blue-200">Track Shadow Priest spell casts from WarcraftLogs reports</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-blue-200 mb-2">
                WarcraftLogs Fight URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://classic.warcraftlogs.com/reports/H3hZVgNBtyXPRbmQ?fight=18&type=damage-done&source=11"
                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-blue-300 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/50"
              />
              <p className="text-xs text-blue-300 mt-1">
                Include fight number. Source ID is optional - if not provided, available Priests will be shown.
              </p>
            </div>

            <button
              onClick={analyzeLog}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Analyze Shadow Priest Casts
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-200">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Error:</span>
              </div>
              <p className="text-red-100 mt-1">{error}</p>
            </div>
          )}

          {results && (
            <div className="mt-8 bg-white/5 rounded-xl p-6 border border-white/10">
              {results.type === 'players' ? (
                <div>
                  <h2 className="text-xl font-semibold text-white mb-4">
                    Available Priests in Fight: {results.fight.name}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {results.players.map((player) => (
                      <div key={player.id} className="bg-white/10 rounded-lg p-3">
                        <div className="text-white font-medium">{player.name}</div>
                        <div className="text-sm text-blue-200">ID: {player.id}</div>
                        <div className="text-sm text-blue-300">{player.subType}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-blue-200 mt-4 text-sm">
                    Add &source=ID to your URL to analyze a specific priest's casts
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-2">
                      Shadow Priest Spell Analysis
                    </h2>
                    <div className="text-blue-200 space-y-1">
                      <p><strong>Player:</strong> {results.player?.name || 'Unknown'}</p>
                      <p><strong>Fight:</strong> {results.fight.name}</p>
                      <p><strong>Tracked Shadow Priest Casts:</strong> {results.totalTrackedCasts}</p>
                      <p><strong>Total Cast Events:</strong> {results.totalAllCasts}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-white mb-4">Shadow Priest Spell Casts</h3>
                    {results.casts.length > 0 ? (
                      results.casts.map((cast, index) => (
                        <div key={index} className="bg-gradient-to-r from-purple-800/30 to-blue-800/30 rounded-lg p-4 flex justify-between items-center border border-purple-500/20">
                          <span className="text-white font-medium">{cast.spell}</span>
                          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                            {cast.count} casts
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-blue-200 mb-2">No Shadow Priest spells found for this player in this fight.</p>
                        <p className="text-sm text-blue-300">
                          Tracked spells: Vampiric Touch, Devouring Plague, Shadow Word: Pain, Mind Blast, Mind Flay, Shadow Word: Death, Mind Spike
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/20">
                    <h4 className="text-sm font-medium text-blue-200 mb-2">Tracked Shadow Priest Spells:</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs text-blue-300">
                      {Object.values(shadowPriestSpells).map(spell => (
                        <span key={spell}>• {spell}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 text-center text-blue-300 text-sm">
            <p>This tool analyzes WarcraftLogs reports to track Shadow Priest spell usage.</p>
            <p className="mt-1">Only Priest players are shown when no specific source is provided.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarcraftLogsAnalyzer;
