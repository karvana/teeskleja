// User-facing UI text (Estonian). Keys are English; use t(key, vars) to read them.
const STRINGS = {
  appTitle: 'Teeskleja',
  tagline: 'Sõnamäng seltskonnale. Üks telefon käib käest kätte.',
  quit: 'Lõpeta',
  quitConfirm: 'Lõpetada see raund? Punktid jäävad alles.',

  // Setup
  playersTitle: 'Mängijad',
  playerNamePlaceholder: 'Mängija nimi',
  addPlayer: 'Lisa',
  removePlayer: 'Eemalda {name}',
  playersCount: '{count} mängijat (3–20)',
  settingsTitle: 'Seaded',
  imposters: 'Teesklejaid',
  discussionTime: 'Arutelu aeg',
  recommendedValue: 'soovitus {value}',
  clueLength: 'Vihje pikkus',
  clueOneWord: '1 sõna',
  clueThreeWords: 'Kuni 3 sõna',
  finalGuess: 'Tabatud teeskleja võib sõna arvata',
  allImposterRounds: 'Salajane raund: kõik on teesklejad',
  allImposterRoundsHint: 'Mõnel juhuslikul raundil saavad kõik ainult kategooria. Keegi ei tea ette, millal.',
  categoriesTitle: 'Kategooriad',
  selectAll: 'Vali kõik',
  selectNone: 'Tühjenda',
  startGame: 'Alusta mängu',
  scoreboardTitle: 'Punktid',
  resetScores: 'Nulli punktid',
  resetScoresConfirm: 'Nullida kõigi punktid?',
  howToPlayTitle: 'Kuidas mängida?',
  howToPlay: [
    'Kõik peale teeskleja saavad sama salasõna. Teeskleja näeb ainult kategooriat.',
    'Igaüks ütleb kordamööda ühe lühikese vihje. Sõna ennast ega selle osa öelda ei tohi.',
    'Siis arutate ja hääletate salaja, kes on teeskleja.',
    'Tsiviilid võidavad, kui leiavad kõik teesklejad. Tabatud teeskleja võib veel sõna ära arvata ja raundi võita.',
  ],

  // Errors
  emptyName: 'Sisesta nimi',
  duplicateName: 'See nimi on juba olemas',
  tooManyPlayers: 'Rohkem kui 20 mängijat ei saa',
  needPlayers: 'Lisa vähemalt 3 mängijat',
  needCategory: 'Vali vähemalt üks kategooria',

  // Reveal
  roundLabel: 'Raund {n}',
  passPhoneTo: 'Anna telefon mängijale',
  revealHint: 'Hoia nuppu all, et oma rolli näha. Ära lase teistel ekraani näha!',
  holdToReveal: 'Hoia, et näha',
  yourWord: 'Sinu sõna',
  youAreImposter: 'Sina oled teeskleja!',
  imposterCategoryHint: 'Sa näed ainult kategooriat. Ole osav!',
  wordCategoryIs: 'Kategooria: {category}',
  revealDone: 'Nägin, anna edasi',
  revealDoneLast: 'Nägin, alustame',
  revealProgress: '{done} / {total}',

  // Clues
  cluesTitle: 'Vihjed',
  cluesRuleOne: 'Igaüks ütleb ühe sõna.',
  cluesRuleThree: 'Igaüks ütleb kuni 3 sõna.',
  cluesRuleNoWord: 'Salasõna ega selle osa öelda ei tohi.',
  clueTurn: 'Vihje ütleb',
  nextClue: 'Öeldud, järgmine',
  lastClue: 'Öeldud, alusta arutelu',

  // Discussion
  discussionTitle: 'Arutelu',
  tieBreakTitle: 'Viik: lisaarutelu',
  tieBreakHint: 'Arutage ainult nende vahel:',
  discussionHint: 'Arutage vihjeid. Salasõna valjult öelda ei tohi.',
  pause: 'Paus',
  resume: 'Jätka',
  addTime: '+15 s',
  timeUp: 'Aeg läbi!',
  goVote: 'Hääletama',

  // Vote
  voteTitle: 'Hääletus',
  voteHint: 'Vali salaja, kes on sinu arvates teeskleja.',
  openVote: 'Ava hääletus',
  confirmVote: 'Kinnita hääl',
  votesProgress: 'Hääletanud {done} / {total}',

  // Vote result
  voteResultTitle: 'Hääletuse tulemus',
  votesCount: '{n} häält',
  voteOne: '1 hääl',
  tieResult: 'Viik! Lühike lisaarutelu ja uus hääletus viigis olijate vahel.',
  startTieBreak: 'Alusta lisaarutelu',
  votedOut: 'Välja hääletati',
  showRole: 'Näita rolli',
  wasImposter: '{name} oli TEESKLEJA!',
  wasCivilian: '{name} oli tsiviil.',
  continue: 'Edasi',

  // Final guess
  finalGuessTitle: 'Viimane võimalus',
  finalGuessHint: '{name}, ütle valjult, mis on salasõna. Seejärel näita sõna kõigile.',
  showWord: 'Näita sõna',
  secretWordWas: 'Salasõna oli',
  guessQuestion: 'Kas teeskleja arvas õigesti?',
  guessCorrect: 'Jah, õigesti',
  guessWrong: 'Ei',

  // Round end
  civiliansWin: 'Tsiviilid võitsid!',
  impostersWin: 'Teesklejad võitsid!',
  reason_allFound: 'Kõik teesklejad leiti üles.',
  reason_civilianVotedOut: 'Välja hääletati tsiviil.',
  reason_wordGuessed: 'Tabatud teeskleja arvas sõna ära.',
  reason_outnumbered: 'Teesklejaid jäi sama palju kui tsiviile.',
  reason_deadlock: 'Hääletus jäi korduvalt viiki.',
  allImpostersTitle: 'Kõik olid teesklejad!',
  reason_allImposters: 'Salasõna polnudki. Selles raundis keegi punkte ei saa.',
  everyone: 'Kõik',
  theWord: 'Sõna',
  theCategory: 'Kategooria',
  theImposters: 'Teeskleja(d)',
  pointsHint: 'Võitnud tsiviilid +{civ}, võitnud teesklejad +{imp} punkti.',
  nextRound: 'Uus raund',
  backToSetup: 'Seaded',

  // Misc
  secondsShort: '{n} s',
  offlineReady: 'Mäng töötab nüüd ka ilma internetita.',
};

function t(key, vars) {
  let text = STRINGS[key];
  if (text === undefined) return key;
  if (vars) Object.keys(vars).forEach((k) => { text = text.split('{' + k + '}').join(String(vars[k])); });
  return text;
}
