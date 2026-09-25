/* GOLDEN REFERENCE — runtime.
 * One small engine for every golden page:
 *   - reads ?t=<ms|end> (seek), ?speed=<n>, ?pending=1 (show layers that wait on a product decision)
 *   - plays the opponent's sprite clips from /game/anim/manifest.json (same files the app ships)
 *   - runs the state's timeline from its contract JSON (the same file the checker reads)
 *   - exposes window.__golden = { ready, events[], params } for the checker
 * The app should implement the same timeline ids and push the same events to window.__bbTimeline
 * (see ../HANDOFF.md) so the checker can compare order and timing. */
(function () {
  const Q = new URLSearchParams(location.search);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const P = {
    t: Q.get('t') === 'end' || reduced ? Infinity : Number(Q.get('t') || 0),
    speed: Number(Q.get('speed') || 1),
    pending: Q.get('pending') === '1',
    sound: Q.get('sound') === '1',
  };
  const G = (window.__golden = { ready: false, events: [], params: P });
  if (P.pending) document.body.classList.add('pending');
  if (P.t === Infinity) document.documentElement.classList.add('g-instant');   // seek to the end: no transitions in flight
  const ROOT = '../../../apps/web/public/game/';
  const $ = (s, r = document) => r.querySelector(s);
  const tid = (id) => document.querySelector(`[data-testid="${id}"]`);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms / P.speed));

  // ---------------------------------------------------------------- data
  async function json(url) { const r = await fetch(url); if (!r.ok) throw new Error(url); return r.json(); }

  // ---------------------------------------------------------------- sprite player (mirrors apps/web sprite-player.tsx)
  let manifest = null;
  async function sprite(el, character, clip, opts = {}) {
    manifest = manifest || (await json(ROOT + 'anim/manifest.json'));
    const c = manifest.characters[character][clip];
    el.style.backgroundImage = `url('${ROOT}anim/${c.src}')`;
    el.style.backgroundSize = `${c.cols * 100}% ${c.rows * 100}%`;
    clearInterval(el._t);
    let i = opts.hold ? c.frames - 1 : 0;
    const step = () => {
      const col = i % c.cols, row = Math.floor(i / c.cols);
      el.style.backgroundPosition = `${c.cols > 1 ? (col / (c.cols - 1)) * 100 : 0}% ${c.rows > 1 ? (row / (c.rows - 1)) * 100 : 0}%`;
      if (i < c.frames - 1) i++; else if (c.loop) i = 0; else clearInterval(el._t);
    };
    step();
    if (!opts.hold && !(P.t === Infinity)) el._t = setInterval(step, 1000 / manifest.fps / P.speed);
    el.dataset.clip = clip;
  }

  // ---------------------------------------------------------------- sound (placeholder synth; spec in ../sfx.json)
  const Sfx = { on: P.sound, ctx: null, spec: null,
    ensure() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); return this.ctx; },
    tone(f, d, type = 'sine', vol = .2, t0 = 0, f2) { const c = this.ensure(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
      o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .02); },
    noise(d, vol = .2, t0 = 0, hp = 800) { const c = this.ensure(), b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), x = b.getChannelData(0);
      for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / x.length); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol; s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + t0); },
    play(name) {
      if (this.spec && this.spec.cues[name] && navigator.vibrate) { const h = this.spec.cues[name].haptic; if (h && h.length) navigator.vibrate(h); }
      if (!this.on) return;
      const T = this;
      ({ 'offer-ding': () => { T.tone(1318, .35, 'triangle', .18); T.tone(2637, .2, 'sine', .05); },
        'gap-snap': () => { T.noise(.03, .25, 0, 2000); T.tone(660, .12, 'triangle', .12, .02, 990); },
        'clock-tick': () => T.noise(.02, .2, 0, 3000),
        'coin-drain': () => T.tone(1800, .08, 'sine', .05, 0, 900),
        'stamp': () => { T.tone(90, .35, 'sine', .5, 0, 45); T.noise(.12, .35, 0, 300); },
        'card-flip': () => { T.noise(.16, .12, 0, 1500); T.noise(.05, .1, .17, 400); },
        'reveal-sting': () => { T.tone(523, .5, 'triangle', .14); T.tone(659, .5, 'triangle', .12, .08); T.tone(330, .6, 'sine', .08, .3); },
        'coin-tick': () => T.tone(2200 + Math.random() * 600, .06, 'square', .04),
        'rating-up': () => { [784, 988, 1175].forEach((f, i) => T.tone(f, .3, 'sine', .12, i * .09)); },
        'trophy': () => { T.noise(.08, .15, 0, 2500); T.tone(220, .25, 'sine', .25, .06); },
        'letter': () => { T.noise(.2, .08, 0, 1200); T.tone(400, .08, 'sine', .15, .2); },
      }[name] || (() => {}))();
    } };
  window.Sfx = Sfx;

  // ---------------------------------------------------------------- reward-layer primitives
  function fmt(v, d) { return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function countTo(el, from, to, ms, d = 0, prefix = '', suffix = '') {
    if (!el) return;
    if (!ms) { el.textContent = prefix + fmt(to, d) + suffix; return; }
    const t0 = performance.now(), dur = ms / P.speed;
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = prefix + fmt(from + (to - from) * e, d) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  function center(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function pop(el, text) {
    const [x, y] = center(el); const p = document.createElement('div');
    p.className = 'pop'; p.textContent = text; p.style.left = x + 'px'; p.style.top = y - 30 + 'px';
    document.body.appendChild(p); setTimeout(() => p.remove(), 1200 / P.speed);
  }
  function punch(el) { el.classList.remove('punch'); void el.offsetWidth; el.classList.add('punch'); }
  async function fly(from, to, n = 12) {
    const [x0, y0] = center(from), [x1, y1] = center(to);
    for (let k = 0; k < n; k++) {
      const c = document.createElement('div'); c.className = 'coin'; document.body.appendChild(c);
      const sx = x0 + (Math.random() - .5) * 90, sy = y0 + (Math.random() - .5) * 40;
      const mx = (sx + x1) / 2 + (Math.random() - .5) * 220, my = Math.min(sy, y1) - 120 - Math.random() * 80;
      const kf = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
        kf.push({ transform: `translate(${a * sx + b * mx + d * x1 - 13}px, ${a * sy + b * my + d * y1 - 13}px) scale(${1 + .35 * Math.sin(Math.PI * t)})` }); }
      c.animate(kf, { duration: (620 + k * 35) / P.speed, easing: 'cubic-bezier(.5,0,.75,.5)', fill: 'forwards' }).onfinish = () => { c.remove(); punch(to); Sfx.play('coin-tick'); };
      await sleep(40);
    }
  }
  function confetti(n = 140) {
    const cols = ['#D9A653', '#FF7A50', '#8B6BD1', '#3FD8C4', '#3FBE6B', '#FFF1C4'];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('i'); const w = 6 + Math.random() * 8;
      d.style.cssText = `position:fixed;z-index:70;pointer-events:none;left:${Math.random() * 100}vw;top:-20px;width:${w}px;height:${w * 1.6}px;background:${cols[i % cols.length]};border-radius:2px`;
      document.body.appendChild(d);
      d.animate([{ transform: 'translate(0,0) rotate(0)' }, { transform: `translate(${(Math.random() - .5) * 240}px, ${innerHeight + 60}px) rotate(${Math.random() * 900}deg)` }],
        { duration: (1800 + Math.random() * 1400) / P.speed, delay: Math.random() * 300 / P.speed, easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'forwards' }).onfinish = () => d.remove();
    }
  }

  // ---------------------------------------------------------------- timeline
  // step = { id, at, action, target, ...args }. Final states are applied instantly when seeking past a step.
  async function runStep(s, instant) {
    const el = s.target ? tid(s.target) : null;
    if (s.pending && !P.pending) return;
    const A = s.action;
    if (A === 'show') { el && el.classList.remove('tl-hidden'); if (el && !instant) el.classList.add('tl-show'); }
    else if (A === 'hide') { el && (el.classList.remove('tl-show'), el.classList.add('tl-hidden')); }
    else if (A === 'stamp') { el && el.classList.remove('tl-hidden'); if (el && !instant) el.classList.add('enter-stamp'); }
    else if (A === 'class') { el && el.classList.add(s.cls); }
    else if (A === 'count') { countTo(el, s.from, s.to, instant ? 0 : s.dur, s.decimals || 0, s.prefix || '', s.suffix || ''); }
    else if (A === 'fill') { if (el) { const i = el.querySelector('i'); el.classList.toggle('filling', !instant); i.style.transition = instant ? 'none' : ''; i.style.width = s.to + '%'; setTimeout(() => el.classList.remove('filling'), 1200 / P.speed); } }
    else if (A === 'pop') { if (!instant && el) pop(el, s.text); }
    else if (A === 'fly') { if (!instant && el) fly(el, tid(s.to), s.n || 12); }
    else if (A === 'clip') { if (el) await sprite(el, s.character, s.clip, { hold: instant && !s.loop }); }
    else if (A === 'confetti') { if (!instant) confetti(s.n || 140); }
    if (s.sfx && !instant) Sfx.play(s.sfx);
    G.events.push({ id: s.id, at: s.at, t: Math.round(performance.now() - G.t0) });
  }
  async function timeline(steps) {
    G.t0 = performance.now();
    const sorted = [...steps].sort((a, b) => a.at - b.at);
    for (const s of sorted) {
      if (s.at <= P.t) { await runStep(s, true); continue; }
      const wait = s.at - Math.max(P.t, 0) - (performance.now() - G.t0) * P.speed;
      if (wait > 0) await sleep(wait);
      runStep(s, false);
    }
  }

  // ---------------------------------------------------------------- boot
  window.Golden = { Sfx, sprite, countTo, pop, fly, confetti, punch, timeline, json, P,
    async boot(state) {
      const [fx, contract] = await Promise.all([json('../fixture/reference-match.json'), json(`../contracts/${state}.json`)]);
      G.fixture = fx; G.contract = contract;
      json('../sfx.json').then((j) => (Sfx.spec = j)).catch(() => {});
      const tg = document.createElement('button'); tg.className = 'glass sound-toggle'; tg.dataset.testid = 'sound-toggle';
      tg.setAttribute('aria-label', 'Sound'); tg.textContent = Sfx.on ? '🔊' : '🔈';
      tg.onclick = () => { Sfx.on = !Sfx.on; Sfx.ensure().resume(); tg.textContent = Sfx.on ? '🔊' : '🔈'; };
      document.body.appendChild(tg);
      if (window.World) World.mount();
      document.querySelectorAll('[data-fx]').forEach((el) => {           // fill text from the fixture: data-fx="path.to.value"
        const v = el.dataset.fx.split('.').reduce((o, k) => (o == null ? o : o[k]), fx); if (v != null) el.textContent = v;
      });
      // portraits: a face crop from frame 0 of the character's idle sheet (cx, cy, face width in cell px)
      const FACE = { pipquill: [195, 272, 140], goldenotter: [245, 205, 190] };
      document.querySelectorAll('[data-face]').forEach((el) => {
        const [cx, cy, fw] = FACE[el.dataset.face]; const d = el.clientWidth, s = d / fw;
        el.style.backgroundImage = `url('${ROOT}anim/${el.dataset.face}/idle.webp')`;
        el.style.backgroundSize = `${4800 * s}px ${1800 * s}px`;
        el.style.backgroundPosition = `${-(cx * s - d / 2)}px ${-(cy * s - d / 2)}px`;
        el.style.backgroundRepeat = 'no-repeat';
      });
      document.querySelectorAll('[data-sprite]').forEach((el) => { const [c, clip] = el.dataset.sprite.split(':'); sprite(el, c, clip); });
      await document.fonts.ready;
      const run = timeline(contract.timeline || []);
      if (P.t === Infinity) await run;
      G.ready = true;
      document.documentElement.dataset.goldenReady = '1';
    } };
})();
