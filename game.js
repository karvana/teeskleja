// Pure game logic for the imposter word game (pass-and-play).
// All functions mutate a plain, JSON-serializable state object; no DOM access here,
// so the same rules can later back an online-room mode.
const Game = (() => {
  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 20;
  const TIE_BREAK_SECONDS = 30;
  const MAX_TIE_BREAKS = 2; // after this many re-votes still tied, the imposters survive
  const CIVILIAN_WIN_POINTS = 1;
  const IMPOSTER_WIN_POINTS = 2;

  const PHASES = Object.freeze({
    SETUP: 'setup',
    REVEAL: 'reveal',
    CLUES: 'clues',
    DISCUSSION: 'discussion',
    VOTE: 'vote',
    VOTE_RESULT: 'voteResult',
    FINAL_GUESS: 'finalGuess',
    ROUND_END: 'roundEnd',
  });

  const WINNERS = Object.freeze({ CIVILIANS: 'civilians', IMPOSTERS: 'imposters' });

  const REASONS = Object.freeze({
    ALL_FOUND: 'allFound',
    CIVILIAN_VOTED_OUT: 'civilianVotedOut',
    WORD_GUESSED: 'wordGuessed',
    OUTNUMBERED: 'outnumbered',
    DEADLOCK: 'deadlock',
  });

  // ---- Settings helpers ----------------------------------------------------

  function recommendedImposters(playerCount) {
    return playerCount >= 11 ? 2 : 1;
  }

  // Civilians must always outnumber imposters at the start.
  function maxImposters(playerCount) {
    return Math.max(1, Math.floor((playerCount - 1) / 2));
  }

  function recommendedDiscussionSeconds(playerCount) {
    if (playerCount <= 5) return 60;
    if (playerCount <= 10) return 90;
    return 120;
  }

  function createInitialState(categories) {
    return {
      version: 1,
      phase: PHASES.SETUP,
      players: [],
      settings: {
        imposterCount: 1,
        imposterCountAuto: true,
        discussionSeconds: 60,
        discussionAuto: true,
        clueWords: 1,
        finalGuess: true,
        categoryIds: categories.map((c) => c.id),
      },
      usedWords: [],
      roundsPlayed: 0,
      round: null,
    };
  }

  function newPlayerId() {
    return 'p' + Math.random().toString(36).slice(2, 10);
  }

  function normalizeName(name) {
    return name.trim().replace(/\s+/g, ' ');
  }

  // Returns an error key or null.
  function addPlayer(state, rawName) {
    const name = normalizeName(rawName);
    if (!name) return 'emptyName';
    if (state.players.length >= MAX_PLAYERS) return 'tooManyPlayers';
    const taken = state.players.some((p) => p.name.toLocaleLowerCase('et') === name.toLocaleLowerCase('et'));
    if (taken) return 'duplicateName';
    state.players.push({ id: newPlayerId(), name, score: 0 });
    applyAutoSettings(state);
    return null;
  }

  function removePlayer(state, playerId) {
    state.players = state.players.filter((p) => p.id !== playerId);
    applyAutoSettings(state);
  }

  // Keep settings within valid bounds and follow the recommended defaults
  // until the host changes them by hand.
  function applyAutoSettings(state) {
    const n = state.players.length;
    const s = state.settings;
    if (s.imposterCountAuto) s.imposterCount = recommendedImposters(n);
    s.imposterCount = Math.min(Math.max(1, s.imposterCount), maxImposters(n));
    if (s.discussionAuto) s.discussionSeconds = recommendedDiscussionSeconds(n);
  }

  function validateSetup(state) {
    if (state.players.length < MIN_PLAYERS) return 'needPlayers';
    if (state.players.length > MAX_PLAYERS) return 'tooManyPlayers';
    if (!state.settings.categoryIds.length) return 'needCategory';
    return null;
  }

  // ---- Round setup ---------------------------------------------------------

  function shuffle(list, rng = Math.random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function wordKey(categoryId, word) {
    return categoryId + ':' + word;
  }

  // Picks an unused word from the selected categories; recycles once all are used.
  function pickWord(state, categories, rng = Math.random) {
    const selected = categories.filter((c) => state.settings.categoryIds.includes(c.id));
    const used = new Set(state.usedWords);
    let pool = [];
    selected.forEach((c) => c.words.forEach((w) => {
      if (!used.has(wordKey(c.id, w))) pool.push({ categoryId: c.id, word: w });
    }));
    if (!pool.length) {
      const selectedIds = new Set(selected.map((c) => c.id));
      state.usedWords = state.usedWords.filter((k) => !selectedIds.has(k.split(':')[0]));
      pool = [];
      selected.forEach((c) => c.words.forEach((w) => pool.push({ categoryId: c.id, word: w })));
    }
    const pick = pool[Math.floor(rng() * pool.length)];
    state.usedWords.push(wordKey(pick.categoryId, pick.word));
    return pick;
  }

  function startRound(state, categories, rng = Math.random) {
    const ids = state.players.map((p) => p.id);
    const { categoryId, word } = pickWord(state, categories, rng);
    const imposterIds = shuffle(ids, rng).slice(0, state.settings.imposterCount);
    // Rotate the starting player every round so nobody always clues blind.
    const start = state.roundsPlayed % ids.length;
    const order = ids.slice(start).concat(ids.slice(0, start));

    state.round = {
      number: state.roundsPlayed + 1,
      categoryId,
      word,
      imposterIds,
      order,
      alive: order.slice(),
      caughtIds: [],
      revealIndex: 0,
      clueIndex: 0,
      isTieBreak: false,
      tieCandidates: null,
      tieCount: 0,
      voters: [],
      candidates: [],
      voterIndex: 0,
      votes: {},
      tally: null,
      eliminatedId: null,
      guessingImposterId: null,
      timer: null,
      winner: null,
      reason: null,
    };
    state.phase = PHASES.REVEAL;
  }

  // ---- Queries -------------------------------------------------------------

  function isImposter(round, playerId) {
    return round.imposterIds.includes(playerId);
  }

  function playerById(state, playerId) {
    return state.players.find((p) => p.id === playerId) || null;
  }

  function currentRevealPlayerId(state) {
    return state.round.order[state.round.revealIndex];
  }

  function currentCluePlayerId(state) {
    return state.round.alive[state.round.clueIndex];
  }

  function currentVoterId(state) {
    return state.round.voters[state.round.voterIndex];
  }

  function voteOptionsFor(state, voterId) {
    return state.round.candidates.filter((id) => id !== voterId);
  }

  // ---- Phase transitions ---------------------------------------------------

  function advanceReveal(state) {
    const r = state.round;
    r.revealIndex += 1;
    if (r.revealIndex >= r.order.length) {
      r.clueIndex = 0;
      state.phase = PHASES.CLUES;
    }
  }

  // Clues are final: there is no way to step back.
  function advanceClue(state, now = Date.now()) {
    const r = state.round;
    r.clueIndex += 1;
    if (r.clueIndex >= r.alive.length) startDiscussion(state, state.settings.discussionSeconds, false, now);
  }

  function startDiscussion(state, seconds, isTieBreak, now = Date.now()) {
    const r = state.round;
    r.isTieBreak = isTieBreak;
    if (!isTieBreak) r.tieCandidates = null;
    r.timer = { durationMs: seconds * 1000, endsAt: now + seconds * 1000, pausedRemainingMs: null };
    state.phase = PHASES.DISCUSSION;
  }

  function timerRemainingMs(round, now = Date.now()) {
    const t = round.timer;
    if (!t) return 0;
    if (t.pausedRemainingMs !== null) return t.pausedRemainingMs;
    return Math.max(0, t.endsAt - now);
  }

  function toggleTimerPause(state, now = Date.now()) {
    const t = state.round.timer;
    if (!t) return;
    if (t.pausedRemainingMs === null) {
      t.pausedRemainingMs = Math.max(0, t.endsAt - now);
    } else {
      t.endsAt = now + t.pausedRemainingMs;
      t.pausedRemainingMs = null;
    }
  }

  function addTimerSeconds(state, seconds, now = Date.now()) {
    const t = state.round.timer;
    if (!t) return;
    if (t.pausedRemainingMs !== null) t.pausedRemainingMs += seconds * 1000;
    else t.endsAt = Math.max(t.endsAt, now) + seconds * 1000;
  }

  function startVote(state) {
    const r = state.round;
    r.timer = null;
    r.voters = r.alive.slice();
    r.candidates = r.isTieBreak && r.tieCandidates ? r.tieCandidates.slice() : r.alive.slice();
    r.voterIndex = 0;
    r.votes = {};
    r.tally = null;
    r.eliminatedId = null;
    state.phase = PHASES.VOTE;
  }

  function castVote(state, voterId, targetId) {
    const r = state.round;
    if (voterId !== currentVoterId(state)) return;
    if (!voteOptionsFor(state, voterId).includes(targetId)) return;
    r.votes[voterId] = targetId;
    r.voterIndex += 1;
    if (r.voterIndex >= r.voters.length) resolveVote(state);
  }

  function resolveVote(state) {
    const r = state.round;
    const tally = {};
    r.candidates.forEach((id) => { tally[id] = 0; });
    Object.values(r.votes).forEach((id) => { tally[id] += 1; });
    r.tally = tally;

    const max = Math.max(...Object.values(tally));
    const leaders = r.candidates.filter((id) => tally[id] === max);
    state.phase = PHASES.VOTE_RESULT;

    if (leaders.length > 1) {
      r.tieCount += 1;
      r.tieCandidates = leaders;
      r.eliminatedId = null;
      if (r.tieCount > MAX_TIE_BREAKS) endRound(state, WINNERS.IMPOSTERS, REASONS.DEADLOCK);
      return;
    }
    r.tieCount = 0;
    r.tieCandidates = null;
    r.eliminatedId = leaders[0];
  }

  // Called after a tie result: short extra discussion, then re-vote among the tied.
  function startTieBreak(state, now = Date.now()) {
    startDiscussion(state, TIE_BREAK_SECONDS, true, now);
  }

  // Called after the eliminated player's role has been shown.
  function continueAfterElimination(state, now = Date.now()) {
    const r = state.round;
    const id = r.eliminatedId;
    r.alive = r.alive.filter((p) => p !== id);
    if (!isImposter(r, id)) {
      endRound(state, WINNERS.IMPOSTERS, REASONS.CIVILIAN_VOTED_OUT);
      return;
    }
    r.caughtIds.push(id);
    if (state.settings.finalGuess) {
      r.guessingImposterId = id;
      state.phase = PHASES.FINAL_GUESS;
      return;
    }
    afterImposterCaught(state, now);
  }

  function resolveFinalGuess(state, correct, now = Date.now()) {
    if (correct) {
      endRound(state, WINNERS.IMPOSTERS, REASONS.WORD_GUESSED);
      return;
    }
    state.round.guessingImposterId = null;
    afterImposterCaught(state, now);
  }

  function afterImposterCaught(state, now) {
    const r = state.round;
    const remaining = r.imposterIds.filter((id) => !r.caughtIds.includes(id));
    if (!remaining.length) {
      endRound(state, WINNERS.CIVILIANS, REASONS.ALL_FOUND);
      return;
    }
    const civiliansLeft = r.alive.filter((id) => !isImposter(r, id)).length;
    if (remaining.length >= civiliansLeft) {
      endRound(state, WINNERS.IMPOSTERS, REASONS.OUTNUMBERED);
      return;
    }
    // More imposters left: another discussion and vote among the remaining players.
    startDiscussion(state, state.settings.discussionSeconds, false, now);
  }

  function endRound(state, winner, reason) {
    const r = state.round;
    r.winner = winner;
    r.reason = reason;
    r.timer = null;
    state.players.forEach((p) => {
      const imp = isImposter(r, p.id);
      if (winner === WINNERS.CIVILIANS && !imp) p.score += CIVILIAN_WIN_POINTS;
      if (winner === WINNERS.IMPOSTERS && imp) p.score += IMPOSTER_WIN_POINTS;
    });
    state.roundsPlayed += 1;
    state.phase = PHASES.ROUND_END;
  }

  function abandonRound(state) {
    state.round = null;
    state.phase = PHASES.SETUP;
  }

  function resetScores(state) {
    state.players.forEach((p) => { p.score = 0; });
    state.roundsPlayed = 0;
  }

  return {
    MIN_PLAYERS, MAX_PLAYERS, TIE_BREAK_SECONDS, PHASES, WINNERS, REASONS,
    CIVILIAN_WIN_POINTS, IMPOSTER_WIN_POINTS,
    recommendedImposters, maxImposters, recommendedDiscussionSeconds,
    createInitialState, addPlayer, removePlayer, applyAutoSettings, validateSetup,
    startRound, isImposter, playerById,
    currentRevealPlayerId, currentCluePlayerId, currentVoterId, voteOptionsFor,
    advanceReveal, advanceClue, timerRemainingMs, toggleTimerPause, addTimerSeconds,
    startVote, castVote, startTieBreak, continueAfterElimination, resolveFinalGuess,
    abandonRound, resetScores,
  };
})();
