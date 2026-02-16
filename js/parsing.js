/* --------------------------------------------------------------------------------
   Parsing rules
   -------------------------------------------------------------------------------- */
var PARSING_RULES = {
  1395: { title: "The Stone Guard", rules: ["The damage bonus from Energized Tiles is normalized."] },
  1390: { title: "Feng the Accursed", rules: ["Damage done to Soul Fragments is removed."] },
  1434: { title: "Gara'jal the Spiritbinder", rules: ["Damage done to Spirit Totems is removed."] },
  1436: { title: "The Spirit Kings", rules: ["No rules, though friendly fire damage (during Mind Control) is already excluded."] },
  1500: { title: "Elegon", rules: ["Damage done during Draw Power is normalized, and damage done to Cosmic Sparks is removed."] },
  1407: { title: "Will of the Emperor", rules: ["Damage done to Emperor's Rage is removed from 25-man Heroic.","Will of the Emperor is removed from Damage All Star Points."] },
  1507: { title: "Imperial Vizier Zor'lok", rules: ["Damage done to adds that don't die is removed."] },
  1504: { title: "Blade Lord Ta'yak", rules: ["No rules."] },
  1463: { title: "Garalon", rules: ["Garalon is removed from Damage All Star Points."] },
  1498: { title: "Wind Lord Mel'jarak", rules: ["Damage done to adds that don't die is removed."] },
  1499: { title: "Amber-Shaper Un'sok", rules: ["Amber-Shaper is removed from All Star Points (both Damage and Healing)."] },
  1501: { title: "Grand Empress Shek'zeer", rules: ["Damage done to Kor'thik Reavers and Set'thik Windblades is removed."] },
  1409: { title: "Protectors of the Endless", rules: ["Damage done to bosses that heal to full is removed.","Damage gained from Corrupted Essence is normalized.","Only Hardmode/Elite order ranks as Heroic."] },
  1505: { title: "Tsulong", rules: ["Damage done to The Dark of Night, Fright Spawn, and Embodied Terrors is removed."] },
  1506: { title: "Lei Shi", rules: ["Damage done to Animated Protectors is removed."] },
  1431: { title: "Sha of Fear", rules: ["Sha of Fear is removed from Damage ASP."] },
  51577: { title: "Jin'rokh the Breaker", rules: ["No rules."] },
  51575: { title: "Horridon", rules: ["Horridon is removed from Damage All Star Points."] },
  51570: { title: "Council of Elders", rules: ["Damage done to Living Sand is removed."] },
  51565: { title: "Tortos", rules: ["Damage done to Humming Crystal is removed.","Heroic Only: Damage done to Vampiric Cave Bat is removed.","Only damage done to Whirl Turtles that cast Shell Concussion counts."] },
  51578: { title: "Megaera", rules: ["Damage done to heads that don't die is removed.","25m Heroic: Damage done to Nether Wyrm is removed."] },
  51573: { title: "Ji-Kun", rules: ["Ji-Kun is removed from Damage All Star Points."] },
  51572: { title: "Durumu the Forgotten", rules: ["Damage done to Wandering Eye is removed."] },
  51574: { title: "Primordius", rules: ["Primordius is removed from Damage and Healing All Star Points."] },
  51576: { title: "Dark Animus", rules: ["Heroic: Damage to Large Anima Golem and Massive Anima Golem is removed.","Only count damage done to Anima Golems that die."] },
  51559: { title: "Iron Qon", rules: ["Damage done to Ice Tomb is removed."] },
  51560: { title: "Twin Empyreans", rules: ["Damage done to Lurker in the Night is removed."] },
  51579: { title: "Lei Shen", rules: ["Damage done to Unharnessed Power, Lesser Diffused Lightning, Greater Diffused Lightning, and Diffused Lightning is removed."] },
  51580: { title: "Ra-den", rules: ["Damage done to Sanguine Horror, Corrupted Anima, Corrupted Vita, and Essence of Vita is removed."] }
};
function renderParsingRules(encounterId) {
  var rules = PARSING_RULES[encounterId];
  if (!rules) return '<span class="parsing-pill no-rules">No rules</span>';
  var meaningful = rules.rules.filter(function(r) { return !/^no rules\.?$/i.test(r.trim()); });
  if (meaningful.length === 0) return '<span class="parsing-pill no-rules">No rules</span>';
  var tooltip = meaningful.join(' \u2022 ');
  return '<span class="parsing-pill has-rules" title="' + tooltip.replace(/"/g, '&quot;') + '">' + meaningful.length + ' rule' + (meaningful.length > 1 ? 's' : '') + '</span>';
}
