/* --------------------------------------------------------------------------------
   Talents
   -------------------------------------------------------------------------------- */
var talentTiers = {
  15: ["Void Tendrils", "Psyfiend", "Dominate Mind"],
  30: ["Body and Soul", "Angelic Feather", "Phantasm"],
  45: ["From Darkness, Comes Light", "Mindbender", "Solace and Insanity"],
  60: ["Desperate Prayer", "Spectral Guise", "Angelic Bulwark"],
  75: ["Twist of Fate", "Power Infusion", "Divine Insight"],
  90: ["Cascade", "Divine Star", "Halo"]
};
var talentIcons = {
  "Void Tendrils": "spell_priest_voidtendrils", "Psyfiend": "spell_priest_psyfiend",
  "Dominate Mind": "spell_shadow_shadowworddominate", "Body and Soul": "spell_holy_symbolofhope",
  "Angelic Feather": "ability_priest_angelicfeather", "Phantasm": "ability_priest_phantasm",
  "From Darkness, Comes Light": "spell_holy_surgeoflight", "Mindbender": "spell_shadow_soulleech_3",
  "Solace and Insanity": "ability_priest_flashoflight", "Desperate Prayer": "spell_holy_testoffaith",
  "Spectral Guise": "spell_priest_spectralguise", "Angelic Bulwark": "ability_priest_angelicbulwark",
  "Twist of Fate": "spell_shadow_mindtwisting", "Power Infusion": "spell_holy_powerinfusion",
  "Divine Insight": "spell_priest_burningwill", "Cascade": "ability_priest_cascade",
  "Divine Star": "spell_priest_divinestar", "Halo": "ability_priest_halo"
};
var talentSpellIds = {
  "Void Tendrils": 108920, "Psyfiend": 108921, "Dominate Mind": 605,
  "Body and Soul": 64129, "Angelic Feather": 121536, "Phantasm": 108942,
  "From Darkness, Comes Light": 109186, "Mindbender": 123040, "Solace and Insanity": 129250,
  "Desperate Prayer": 19236, "Spectral Guise": 112833, "Angelic Bulwark": 108945,
  "Twist of Fate": 109142, "Power Infusion": 10060, "Divine Insight": 109175,
  "Cascade": 121135, "Divine Star": 110744, "Halo": 120517
};
var talentNameMap = { "Surge of Light": "From Darkness, Comes Light", "Mind Control": "Dominate Mind" };

var TIER_ORDER = Object.keys(talentTiers).map(Number).sort(function(a, b) { return a - b; });
var VALID_TALENT_SET = new Set([].concat.apply([], Object.values(talentTiers)));
var TIER_BY_TALENT = (function() {
  var m = new Map();
  for (var tierStr in talentTiers) {
    var tier = Number(tierStr);
    for (var t of talentTiers[tier]) m.set(t, tier);
  }
  return m;
})();
var getSpellId = function(n) { return n in talentSpellIds ? talentSpellIds[n] : 0; };
var getTalentDisplayName = function(n) { return n in talentNameMap ? talentNameMap[n] : n; };
var talentIconUrl = function(name) {
  var key = name && talentIcons[name] ? talentIcons[name] : 'inv_misc_questionmark';
  return 'https://assets.rpglogs.com/img/warcraft/abilities/' + key + '.jpg';
};
