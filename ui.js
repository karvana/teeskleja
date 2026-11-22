// UI layer: renders the current game phase and wires user actions to Game.*.
(() => {
  const STORAGE_KEY = 'teeskleja.state.v1';
  const P = Game.PHASES;
  const DISCUSSION_MIN = 30;
  const DISCUSSION_MAX = 300;
  const DISCUSSION_STEP = 15;

  const screen = document.getElementById('screen');
  const quitButton = document.getElementById('quit-button');

  let state = loadState() || Game.createInitialState(WORD_CATEGORIES);
  // Transient, per-screen UI flags (never persisted).
  let ui = freshUi();
  let lastRenderedPhase = null;
  let audioCtx = null;
  let wakeLock = null;

  function freshUi() {
    return {
      error: null,
      draftName: '',
      revealSeen: false,
      voteOpen: false,
      selectedVote: null,
      roleShown: false,
      wordShown: false,
    };
  }

  // ---- Persistence ---------------------------------------------------------

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && saved.version === 1 && Array.isArray(saved.players)) {
        // Drop categories that no longer exist in the word list.
        const known = new Set(WORD_CATEGORIES.map((c) => c.id));
        saved.settings.categoryIds = saved.settings.categoryIds.filter((id) => known.has(id));
        return saved;
      }
    } catch (e) { /* storage unavailable or corrupt: start fresh */ }
    return null;
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  // Runs a state change, persists it and re-renders. Resets per-screen flags
  // unless keepUi is set.
  function commit(mutate, keepUi = false) {
    mutate();
    if (!keepUi) {
      const draftName = ui.draftName;
      ui = freshUi();
      ui.draftName = draftName;
    }
    saveState();
    render();
  }

  // ---- Helpers -------------------------------------------------------------

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function playerName(id) {
    const p = Game.playerById(state, id);
    return p ? p.name : '?';
  }

  function categoryLabel(id) {
    const c = WORD_CATEGORIES.find((cat) => cat.id === id);
    return c ? c.label : id;
  }

  function formatTime(ms) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function actionBar(buttonsHtml) {
    return '<div class="action-bar"><div class="action-bar-inner">' + buttonsHtml + '</div></div>';
  }

  function button(action, label, opts = {}) {
    const cls = opts.variant || 'btn-primary';
    const attrs = [
      'type="button"',
      'class="' + cls + (opts.extraClass ? ' ' + opts.extraClass : '') + '"',
      'data-action="' + action + '"',
    ];
    if (opts.value !== undefined) attrs.push('data-value="' + esc(opts.value) + '"');
    if (opts.disabled) attrs.push('disabled');
    if (opts.id) attrs.push('id="' + opts.id + '"');
    if (opts.ariaLabel) attrs.push('aria-label="' + esc(opts.ariaLabel) + '"');
    if (opts.pressed !== undefined) attrs.push('aria-pressed="' + (opts.pressed ? 'true' : 'false') + '"');
    return '<button ' + attrs.join(' ') + '>' + label + '</button>';
  }

  function scoreboardHtml() {
    const rows = state.players.slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'et'));
    return '<ol class="scoreboard">' + rows.map((p) =>
      '<li><span class="score-name">' + esc(p.name) + '</span><span class="score-value">' + p.score + '</span></li>'
    ).join('') + '</ol>';
  }

  // ---- Screens -------------------------------------------------------------

  function renderSetup() {
    const s = state.settings;
    const n = state.players.length;
    const maxImp = Game.maxImposters(Math.max(n, Game.MIN_PLAYERS));
    const players = state.players.map((p) =>
      '<li class="player-chip"><span>' + esc(p.name) + '</span>' +
      button('removePlayer', '&times;', { variant: 'chip-remove', value: p.id, ariaLabel: t('removePlayer', { name: p.name }) }) +
      '</li>'
    ).join('');

    const categories = WORD_CATEGORIES.map((c) =>
      button('toggleCategory', esc(c.label), { variant: 'chip-toggle', value: c.id, pressed: s.categoryIds.includes(c.id) })
    ).join('');

    const howTo = '<details class="card how-to"><summary>' + t('howToPlayTitle') + '</summary><ol>' +
      STRINGS.howToPlay.map((line) => '<li>' + esc(line) + '</li>').join('') + '</ol></details>';

    const scores = state.roundsPlayed > 0
      ? '<section class="card"><div class="card-head"><h2>' + t('scoreboardTitle') + '</h2>' +
        button('resetScores', t('resetScores'), { variant: 'btn-link' }) + '</div>' + scoreboardHtml() + '</section>'
      : '';

    return '<div class="stack">' +
      '<p class="tagline">' + t('tagline') + '</p>' +
      howTo +
      '<section class="card">' +
        '<div class="card-head"><h2>' + t('playersTitle') + '</h2><span class="muted">' + t('playersCount', { count: n }) + '</span></div>' +
        (players ? '<ul class="player-list">' + players + '</ul>' : '') +
        '<form id="add-player-form" class="add-player" autocomplete="off">' +
          '<input id="player-name" name="name" type="text" maxlength="20" enterkeyhint="done" autocapitalize="words" ' +
          'placeholder="' + t('playerNamePlaceholder') + '" value="' + esc(ui.draftName) + '" aria-label="' + t('playerNamePlaceholder') + '">' +
          '<button type="submit" class="btn-secondary">' + t('addPlayer') + '</button>' +
        '</form>' +
        (ui.error ? '<p class="error" role="alert">' + t(ui.error) + '</p>' : '') +
      '</section>' +
      '<section class="card">' +
        '<h2>' + t('settingsTitle') + '</h2>' +
        '<div class="setting">' +
          '<div><div class="setting-label">' + t('imposters') + '</div>' +
          '<div class="setting-hint">' + t('recommendedValue', { value: Game.recommendedImposters(n) }) + '</div></div>' +
          '<div class="stepper">' +
            button('impMinus', '&minus;', { variant: 'step-btn', disabled: s.imposterCount <= 1, ariaLabel: '-1' }) +
            '<output>' + s.imposterCount + '</output>' +
            button('impPlus', '+', { variant: 'step-btn', disabled: s.imposterCount >= maxImp, ariaLabel: '+1' }) +
          '</div>' +
        '</div>' +
        '<div class="setting">' +
          '<div><div class="setting-label">' + t('discussionTime') + '</div>' +
          '<div class="setting-hint">' + t('recommendedValue', { value: t('secondsShort', { n: Game.recommendedDiscussionSeconds(n) }) }) + '</div></div>' +
          '<div class="stepper">' +
            button('timeMinus', '&minus;', { variant: 'step-btn', disabled: s.discussionSeconds <= DISCUSSION_MIN, ariaLabel: '-15 s' }) +
            '<output>' + formatTime(s.discussionSeconds * 1000) + '</output>' +
            button('timePlus', '+', { variant: 'step-btn', disabled: s.discussionSeconds >= DISCUSSION_MAX, ariaLabel: '+15 s' }) +
          '</div>' +
        '</div>' +
        '<div class="setting setting-column">' +
          '<div class="setting-label">' + t('clueLength') + '</div>' +
          '<div class="segmented" role="group" aria-label="' + t('clueLength') + '">' +
            button('clueWords', t('clueOneWord'), { variant: 'segment', value: 1, pressed: s.clueWords === 1 }) +
            button('clueWords', t('clueThreeWords'), { variant: 'segment', value: 3, pressed: s.clueWords === 3 }) +
          '</div>' +
        '</div>' +
        '<label class="setting toggle-row">' +
          '<span class="setting-label">' + t('finalGuess') + '</span>' +
          '<input type="checkbox" id="final-guess-toggle" class="switch"' + (s.finalGuess ? ' checked' : '') + '>' +
        '</label>' +
        '<label class="setting toggle-row">' +
          '<span><span class="setting-label">' + t('allImposterRounds') + '</span>' +
          '<span class="setting-hint block">' + t('allImposterRoundsHint') + '</span></span>' +
          '<input type="checkbox" id="all-imposters-toggle" class="switch"' + (s.allImposterRounds ? ' checked' : '') + '>' +
        '</label>' +
      '</section>' +
      '<section class="card">' +
        '<div class="card-head"><h2>' + t('categoriesTitle') + '</h2>' +
          '<span class="inline-actions">' +
            button('allCategories', t('selectAll'), { variant: 'btn-link' }) +
            button('noCategories', t('selectNone'), { variant: 'btn-link' }) +
          '</span></div>' +
        '<div class="chip-grid">' + categories + '</div>' +
      '</section>' +
      scores +
    '</div>' +
    actionBar(button('start', t('startGame')));
  }

  function renderReveal() {
    const r = state.round;
    const id = Game.currentRevealPlayerId(state);
    const imposter = Game.isImposter(r, id);
    const isLast = r.revealIndex === r.order.length - 1;
    const secret = imposter
      ? '<div class="secret-role imposter">' + t('youAreImposter') + '</div>' +
        '<div class="secret-word">' + esc(categoryLabel(r.categoryId)) + '</div>' +
        '<div class="secret-sub">' + t('imposterCategoryHint') + '</div>'
      : '<div class="secret-role">' + t('yourWord') + '</div>' +
        '<div class="secret-word">' + esc(r.word) + '</div>' +
        '<div class="secret-sub">' + t('wordCategoryIs', { category: esc(categoryLabel(r.categoryId)) }) + '</div>';

    return '<div class="stack center">' +
      '<p class="eyebrow">' + t('roundLabel', { n: r.number }) + ' · ' + t('revealProgress', { done: r.revealIndex + 1, total: r.order.length }) + '</p>' +
      '<p class="muted">' + t('passPhoneTo') + '</p>' +
      '<p class="big-name">' + esc(playerName(id)) + '</p>' +
      '<p class="hint">' + t('revealHint') + '</p>' +
      '<button type="button" class="reveal-card" id="reveal-hold" aria-label="' + t('holdToReveal') + '">' +
        '<span class="reveal-cover"><svg class="reveal-icon" viewBox="0 0 64 64" aria-hidden="true"><use href="#logo"></use></svg>' + t('holdToReveal') + '</span>' +
        '<span class="reveal-secret" aria-hidden="true">' + secret + '</span>' +
      '</button>' +
    '</div>' +
    actionBar(button('revealDone', isLast ? t('revealDoneLast') : t('revealDone'), { id: 'reveal-done', disabled: !ui.revealSeen }));
  }

  function renderClues() {
    const r = state.round;
    const current = Game.currentCluePlayerId(state);
    const isLast = r.clueIndex === r.alive.length - 1;
    const list = r.alive.map((id, i) => {
      const status = i < r.clueIndex ? 'done' : i === r.clueIndex ? 'current' : 'todo';
      return '<li class="turn turn-' + status + '"><span class="turn-index">' + (i + 1) + '</span>' + esc(playerName(id)) + '</li>';
    }).join('');

    return '<div class="stack">' +
      '<p class="eyebrow center">' + t('roundLabel', { n: r.number }) + ' · ' + t('cluesTitle') + '</p>' +
      '<div class="card center">' +
        '<p class="muted">' + t('clueTurn') + '</p>' +
        '<p class="big-name">' + esc(playerName(current)) + '</p>' +
        '<p class="rule">' + (state.settings.clueWords === 1 ? t('cluesRuleOne') : t('cluesRuleThree')) + ' ' + t('cluesRuleNoWord') + '</p>' +
      '</div>' +
      '<ol class="turn-list">' + list + '</ol>' +
    '</div>' +
    actionBar(button('nextClue', isLast ? t('lastClue') : t('nextClue')));
  }

  function renderDiscussion() {
    const r = state.round;
    const remaining = Game.timerRemainingMs(r);
    const paused = r.timer && r.timer.pausedRemainingMs !== null;
    const tieNames = r.isTieBreak && r.tieCandidates
      ? '<p class="tie-names">' + r.tieCandidates.map((id) => esc(playerName(id))).join(' · ') + '</p>'
      : '';

    return '<div class="stack center">' +
      '<p class="eyebrow">' + t('roundLabel', { n: r.number }) + '</p>' +
      '<h2 class="screen-title">' + (r.isTieBreak ? t('tieBreakTitle') : t('discussionTitle')) + '</h2>' +
      '<p class="hint">' + (r.isTieBreak ? t('tieBreakHint') : t('discussionHint')) + '</p>' +
      tieNames +
      '<div class="timer' + (remaining <= 0 ? ' timer-done' : '') + '" id="timer" role="timer">' +
        (remaining <= 0 ? t('timeUp') : formatTime(remaining)) + '</div>' +
      '<div class="row center">' +
        button('pause', paused ? t('resume') : t('pause'), { variant: 'btn-secondary', id: 'pause-button', disabled: remaining <= 0 }) +
        button('addTime', t('addTime'), { variant: 'btn-secondary' }) +
      '</div>' +
      '<p class="muted small">' + esc(categoryLabel(r.categoryId)) + '</p>' +
    '</div>' +
    actionBar(button('goVote', t('goVote')));
  }

  function renderVote() {
    const r = state.round;
    const voter = Game.currentVoterId(state);
    const progress = t('votesProgress', { done: r.voterIndex, total: r.voters.length });

    if (!ui.voteOpen) {
      return '<div class="stack center">' +
        '<p class="eyebrow">' + t('voteTitle') + ' · ' + progress + '</p>' +
        '<p class="muted">' + t('passPhoneTo') + '</p>' +
        '<p class="big-name">' + esc(playerName(voter)) + '</p>' +
        '<p class="hint">' + t('voteHint') + '</p>' +
      '</div>' +
      actionBar(button('openVote', t('openVote')));
    }

    const options = Game.voteOptionsFor(state, voter).map((id) =>
      button('selectVote', esc(playerName(id)), { variant: 'vote-option', value: id, pressed: ui.selectedVote === id })
    ).join('');

    return '<div class="stack">' +
      '<p class="eyebrow center">' + esc(playerName(voter)) + ' · ' + t('voteTitle') + '</p>' +
      '<p class="hint center">' + t('voteHint') + '</p>' +
      '<div class="vote-grid" role="group" aria-label="' + t('voteTitle') + '">' + options + '</div>' +
    '</div>' +
    actionBar(button('confirmVote', t('confirmVote'), { disabled: !ui.selectedVote }));
  }

  function renderVoteResult() {
    const r = state.round;
    const max = Math.max(1, ...Object.values(r.tally));
    const rows = Object.keys(r.tally).sort((a, b) => r.tally[b] - r.tally[a]).map((id) => {
      const count = r.tally[id];
      const width = Math.round((count / max) * 100);
      const highlight = id === r.eliminatedId || (r.tieCandidates || []).includes(id);
      return '<li class="tally-row' + (highlight ? ' tally-lead' : '') + '">' +
        '<div class="tally-label"><span>' + esc(playerName(id)) + '</span><span>' +
        (count === 1 ? t('voteOne') : t('votesCount', { n: count })) + '</span></div>' +
        '<div class="tally-bar"><span style="width:' + width + '%"></span></div></li>';
    }).join('');

    let body;
    let actions;
    if (!r.eliminatedId) {
      body = '<p class="notice">' + t('tieResult') + '</p>';
      actions = button('startTieBreak', t('startTieBreak'));
    } else if (!ui.roleShown) {
      body = '<div class="card center"><p class="muted">' + t('votedOut') + '</p><p class="big-name">' + esc(playerName(r.eliminatedId)) + '</p></div>';
      actions = button('showRole', t('showRole'));
    } else {
      const imp = Game.isImposter(r, r.eliminatedId);
      body = '<div class="card center role-reveal ' + (imp ? 'is-imposter' : 'is-civilian') + '">' +
        '<p class="role-text">' + esc(t(imp ? 'wasImposter' : 'wasCivilian', { name: playerName(r.eliminatedId) })) + '</p></div>';
      actions = button('continueAfterElimination', t('continue'));
    }

    return '<div class="stack">' +
      '<h2 class="screen-title center">' + t('voteResultTitle') + '</h2>' +
      '<ol class="tally">' + rows + '</ol>' +
      body +
    '</div>' +
    actionBar(actions);
  }

  function renderFinalGuess() {
    const r = state.round;
    const name = playerName(r.guessingImposterId);
    const content = ui.wordShown
      ? '<div class="card center"><p class="muted">' + t('secretWordWas') + '</p><p class="secret-word">' + esc(r.word) + '</p></div>' +
        '<p class="setting-label">' + t('guessQuestion') + '</p>'
      : '';
    const actions = ui.wordShown
      ? button('guessWrong', t('guessWrong'), { variant: 'btn-secondary' }) + button('guessCorrect', t('guessCorrect'))
      : button('showWord', t('showWord'));

    return '<div class="stack center">' +
      '<h2 class="screen-title">' + t('finalGuessTitle') + '</h2>' +
      '<p class="hint">' + esc(t('finalGuessHint', { name })) + '</p>' +
      content +
    '</div>' +
    actionBar(actions);
  }

  function renderRoundEnd() {
    const r = state.round;
    const W = Game.WINNERS;
    const bannerClass = { [W.CIVILIANS]: 'is-civilian', [W.IMPOSTERS]: 'is-imposter', [W.NOBODY]: 'is-twist' }[r.winner];
    const title = { [W.CIVILIANS]: t('civiliansWin'), [W.IMPOSTERS]: t('impostersWin'), [W.NOBODY]: t('allImpostersTitle') }[r.winner];
    const imposters = r.allImposters ? t('everyone') : r.imposterIds.map((id) => esc(playerName(id))).join(', ');
    return '<div class="stack">' +
      '<div class="winner-banner ' + bannerClass + '">' +
        '<p class="winner-title">' + title + '</p>' +
        '<p class="winner-reason">' + t('reason_' + r.reason) + '</p>' +
      '</div>' +
      '<dl class="facts card">' +
        (r.word ? '<div><dt>' + t('theWord') + '</dt><dd>' + esc(r.word) + '</dd></div>' : '') +
        '<div><dt>' + t('theCategory') + '</dt><dd>' + esc(categoryLabel(r.categoryId)) + '</dd></div>' +
        '<div><dt>' + t('theImposters') + '</dt><dd>' + imposters + '</dd></div>' +
      '</dl>' +
      '<section class="card"><h2>' + t('scoreboardTitle') + '</h2>' + scoreboardHtml() +
        '<p class="muted small">' + t('pointsHint', { civ: Game.CIVILIAN_WIN_POINTS, imp: Game.IMPOSTER_WIN_POINTS }) + '</p></section>' +
    '</div>' +
    actionBar(button('toSetup', t('backToSetup'), { variant: 'btn-secondary' }) + button('nextRound', t('nextRound')));
  }

  const RENDERERS = {
    [P.SETUP]: renderSetup,
    [P.REVEAL]: renderReveal,
    [P.CLUES]: renderClues,
    [P.DISCUSSION]: renderDiscussion,
    [P.VOTE]: renderVote,
    [P.VOTE_RESULT]: renderVoteResult,
    [P.FINAL_GUESS]: renderFinalGuess,
    [P.ROUND_END]: renderRoundEnd,
  };

  function render() {
    if (state.phase !== P.SETUP && !state.round) state.phase = P.SETUP;
    screen.innerHTML = (RENDERERS[state.phase] || renderSetup)();
    screen.dataset.phase = state.phase;
    quitButton.hidden = state.phase === P.SETUP;
    quitButton.textContent = t('quit');
    if (lastRenderedPhase !== state.phase) {
      window.scrollTo(0, 0);
      lastRenderedPhase = state.phase;
    }
    if (state.phase === P.REVEAL) bindRevealHold();
    syncWakeLock();
  }

  // ---- Hold-to-reveal ------------------------------------------------------

  function bindRevealHold() {
    const card = document.getElementById('reveal-hold');
    if (!card) return;
    const show = (e) => {
      if (e) e.preventDefault();
      card.classList.add('is-revealed');
      card.querySelector('.reveal-secret').setAttribute('aria-hidden', 'false');
      if (!ui.revealSeen) {
        ui.revealSeen = true;
        const done = document.getElementById('reveal-done');
        if (done) done.disabled = false;
      }
    };
    const hide = () => {
      card.classList.remove('is-revealed');
      card.querySelector('.reveal-secret').setAttribute('aria-hidden', 'true');
    };
    card.addEventListener('pointerdown', (e) => {
      show(e);
      try { card.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => card.addEventListener(ev, hide));
    card.addEventListener('contextmenu', (e) => e.preventDefault());
    card.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') show(e);
    });
    card.addEventListener('keyup', hide);
    card.addEventListener('blur', hide);
  }

  // ---- Timer, sound, vibration, wake lock ----------------------------------

  function unlockAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try { audioCtx = new Ctx(); } catch (e) { audioCtx = null; }
  }

  function beep() {
    if (!audioCtx) return;
    try {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      [0, 0.25, 0.5].forEach((offset) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + offset + 0.18);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + offset);
        osc.stop(audioCtx.currentTime + offset + 0.2);
      });
    } catch (e) { /* ignore */ }
  }

  function tick() {
    if (state.phase !== P.DISCUSSION || !state.round || !state.round.timer) return;
    const timer = state.round.timer;
    const remaining = Game.timerRemainingMs(state.round);
    const el = document.getElementById('timer');
    if (el) {
      el.textContent = remaining <= 0 ? t('timeUp') : formatTime(remaining);
      el.classList.toggle('timer-done', remaining <= 0);
      el.classList.toggle('timer-warning', remaining > 0 && remaining <= 10000);
    }
    if (remaining <= 0 && !timer.alarmed) {
      timer.alarmed = true;
      saveState();
      if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
      beep();
      const pause = document.getElementById('pause-button');
      if (pause) pause.disabled = true;
    }
  }

  async function syncWakeLock() {
    if (!('wakeLock' in navigator)) return;
    const wanted = state.phase !== P.SETUP && document.visibilityState === 'visible';
    try {
      if (wanted && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!wanted && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) { wakeLock = null; }
  }

  // ---- Actions -------------------------------------------------------------

  const ACTIONS = {
    removePlayer: (value) => commit(() => Game.removePlayer(state, value)),
    impMinus: () => commit(() => { state.settings.imposterCount -= 1; state.settings.imposterCountAuto = false; Game.applyAutoSettings(state); }),
    impPlus: () => commit(() => { state.settings.imposterCount += 1; state.settings.imposterCountAuto = false; Game.applyAutoSettings(state); }),
    timeMinus: () => commit(() => {
      state.settings.discussionSeconds = Math.max(DISCUSSION_MIN, state.settings.discussionSeconds - DISCUSSION_STEP);
      state.settings.discussionAuto = false;
    }),
    timePlus: () => commit(() => {
      state.settings.discussionSeconds = Math.min(DISCUSSION_MAX, state.settings.discussionSeconds + DISCUSSION_STEP);
      state.settings.discussionAuto = false;
    }),
    clueWords: (value) => commit(() => { state.settings.clueWords = Number(value); }),
    toggleCategory: (value) => commit(() => {
      const ids = state.settings.categoryIds;
      state.settings.categoryIds = ids.includes(value) ? ids.filter((id) => id !== value) : ids.concat(value);
    }),
    allCategories: () => commit(() => { state.settings.categoryIds = WORD_CATEGORIES.map((c) => c.id); }),
    noCategories: () => commit(() => { state.settings.categoryIds = []; }),
    resetScores: () => {
      if (confirm(t('resetScoresConfirm'))) commit(() => Game.resetScores(state));
    },
    start: () => {
      unlockAudio();
      const error = Game.validateSetup(state);
      if (error) {
        ui.error = error;
        render();
        return;
      }
      commit(() => Game.startRound(state, WORD_CATEGORIES));
    },
    revealDone: () => { if (ui.revealSeen) commit(() => Game.advanceReveal(state)); },
    nextClue: () => { unlockAudio(); commit(() => Game.advanceClue(state)); },
    pause: () => commit(() => Game.toggleTimerPause(state), true),
    addTime: () => commit(() => {
      Game.addTimerSeconds(state, 15);
      if (state.round.timer) state.round.timer.alarmed = false;
    }, true),
    goVote: () => commit(() => Game.startVote(state)),
    openVote: () => { ui.voteOpen = true; ui.selectedVote = null; render(); },
    selectVote: (value) => { ui.selectedVote = value; render(); },
    confirmVote: () => {
      if (!ui.selectedVote) return;
      const target = ui.selectedVote;
      commit(() => Game.castVote(state, Game.currentVoterId(state), target));
    },
    startTieBreak: () => commit(() => Game.startTieBreak(state)),
    showRole: () => { ui.roleShown = true; render(); },
    continueAfterElimination: () => commit(() => Game.continueAfterElimination(state)),
    showWord: () => { ui.wordShown = true; render(); },
    guessCorrect: () => commit(() => Game.resolveFinalGuess(state, true)),
    guessWrong: () => commit(() => Game.resolveFinalGuess(state, false)),
    nextRound: () => { unlockAudio(); commit(() => Game.startRound(state, WORD_CATEGORIES)); },
    toSetup: () => commit(() => Game.abandonRound(state)),
  };

  screen.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target || target.disabled) return;
    const action = ACTIONS[target.dataset.action];
    if (action) action(target.dataset.value);
  });

  screen.addEventListener('submit', (e) => {
    if (e.target.id !== 'add-player-form') return;
    e.preventDefault();
    const input = document.getElementById('player-name');
    const error = Game.addPlayer(state, input.value);
    if (error) {
      ui.error = error;
      ui.draftName = input.value;
    } else {
      ui.error = null;
      ui.draftName = '';
      saveState();
    }
    render();
    const next = document.getElementById('player-name');
    if (next) next.focus();
  });

  screen.addEventListener('input', (e) => {
    if (e.target.id === 'player-name') ui.draftName = e.target.value;
  });

  screen.addEventListener('change', (e) => {
    if (e.target.id === 'final-guess-toggle') commit(() => { state.settings.finalGuess = e.target.checked; });
    if (e.target.id === 'all-imposters-toggle') commit(() => { state.settings.allImposterRounds = e.target.checked; });
  });

  quitButton.addEventListener('click', () => {
    if (confirm(t('quitConfirm'))) commit(() => Game.abandonRound(state));
  });

  document.addEventListener('visibilitychange', () => {
    syncWakeLock();
    tick();
  });

  // ---- Boot ----------------------------------------------------------------

  document.title = t('appTitle');
  document.getElementById('app-title-text').textContent = t('appTitle');
  Game.applyAutoSettings(state);
  render();
  setInterval(tick, 250);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline support unavailable */ });
    });
  }
})();
