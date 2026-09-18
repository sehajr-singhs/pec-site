/* PEC demos — plain JS, no dependencies. Each demo is self-contained. */
'use strict';

/* ===================== helpers ===================== */
function el(id) { return document.getElementById(id); }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/* ===================== DEMO 1 =====================
   Continuous (RK4) vs discrete (explicit Euler) ball-on-moving-paddle. */
(function () {
  const canvas = el('d1-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const G = 9.81 * 60;          // px/s^2 (scaled gravity)
  const PADDLE_Y = H - 70;
  const PADDLE_AMP = 60, PADDLE_OMEGA = 2.2, PADDLE_BASE = PADDLE_Y;
  const REST = 0.82;            // restitution

  let truth, model, running = false, raf = null, tSim = 0, lastWall = 0, divergence = 0;

  function paddleY(t) { return PADDLE_BASE - PADDLE_AMP * (0.5 + 0.5 * Math.sin(PADDLE_OMEGA * t)); }
  function paddleV(t) { return -PADDLE_AMP * PADDLE_OMEGA * Math.cos(PADDLE_OMEGA * t) * 0.5; }

  function accel(x, t) { return G; } // downward gravity only; paddle handled at contact

  function stepTruth(s, dt) {
    // RK4 on (y, vy), with paddle contact resolved inside the step
    const a1 = accel(null, s.t);
    const k1y = s.vy, k1v = a1;
    const a2 = accel(null, s.t + dt / 2);
    const k2y = s.vy + dt / 2 * k1v, k2v = a2;
    const k3y = s.vy + dt / 2 * k2v, k3v = a2;
    const k4y = s.vy + dt * k3v, k4v = accel(null, s.t + dt);
    s.y += dt / 6 * (k1y + 2 * k2y + 2 * k3y + k4y);
    s.vy += dt / 6 * (k1v + 2 * k2v + 2 * k3v + k4v);
    s.t += dt;
    const py = paddleY(s.t);
    if (s.y >= py) { // contact: reflect relative to paddle velocity
      const vp = paddleV(s.t);
      s.y = py;
      s.vy = Math.abs(s.vy - vp) * REST + vp;
    }
  }

  function stepModel(s, dt) {
    // explicit Euler — the "discrete-tick model"
    s.vy += accel(null, s.t) * dt;
    s.y += s.vy * dt;
    s.t += dt;
    const py = paddleY(s.t);
    if (s.y >= py) {
      const vp = paddleV(s.t);
      s.y = py;
      s.vy = Math.abs(s.vy - vp) * REST + vp;
    }
  }

  function reset() {
    truth = { y: 120, vy: 0, t: 0 };
    model = { y: 120, vy: 0, t: 0 };
    tSim = 0; divergence = 0;
    running = false;
    if (raf) cancelAnimationFrame(raf);
    el('d1-status').textContent = 'idle';
    draw();
  }

  function frame(wallNow) {
    if (!running) return;
    const dtWall = Math.min((wallNow - lastWall) / 1000, 0.05);
    lastWall = wallNow;
    // fixed sub-step for truth so it stays accurate regardless of frame rate;
    // the model consumes the SAME amount of simulated time, just in user-chosen
    // (coarser) chunks — so divergence reflects integrator error, not clock drift
    const dt = 1 / 240;
    let remaining = dtWall;
    let modelDebt = 0;
    const modelDt = Number(el('d1-dt').value) / 1000;
    while (remaining > 0) {
      const step = Math.min(dt, remaining);
      stepTruth(truth, step);
      modelDebt += step;
      while (modelDebt >= modelDt) { stepModel(model, modelDt); modelDebt -= modelDt; }
      tSim += step;
      remaining -= step;
    }
    // resync model clock roughly to truth's to compare states (drift shown in readout)
    divergence = Math.abs(truth.y - model.y) + Math.abs(truth.vy - model.vy) * 0.05;
    draw();
    el('d1-readout').textContent =
      'sim time      : ' + tSim.toFixed(2) + ' s\n' +
      'truth  y, vy  : ' + truth.y.toFixed(1) + ' px, ' + truth.vy.toFixed(0) + ' px/s\n' +
      'model  y, vy  : ' + model.y.toFixed(1) + ' px, ' + model.vy.toFixed(0) + ' px/s\n' +
      'state diff    : ' + divergence.toFixed(1) + '\n' +
      'model tick    : ' + el('d1-dt').value + ' ms (explicit Euler)';
    raf = requestAnimationFrame(frame);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // ground reference
    ctx.strokeStyle = '#e2e0da';
    ctx.beginPath(); ctx.moveTo(0, PADDLE_BASE + 12); ctx.lineTo(W, PADDLE_BASE + 12); ctx.stroke();

    // paddle
    const py = paddleY(tSim);
    ctx.fillStyle = '#166534';
    ctx.fillRect(80, py, W - 160, 10);

    // truth ball
    ctx.fillStyle = '#9a3412';
    ctx.beginPath(); ctx.arc(200, truth.y, 10, 0, Math.PI * 2); ctx.fill();
    // model ball
    ctx.fillStyle = '#1d4ed8';
    ctx.beginPath(); ctx.arc(200, model.y, 10, 0, Math.PI * 2); ctx.fill();
    // connector line between them
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(200, truth.y); ctx.lineTo(200, model.y); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#5a5a5a';
    ctx.font = '12px ui-monospace, monospace';
    ctx.fillText('t = ' + tSim.toFixed(2) + 's', 20, 22);
    ctx.fillText('paddle sin(ωt), ω=' + PADDLE_OMEGA.toFixed(1), 20, 38);
  }

  el('d1-run').addEventListener('click', function () {
    if (running) { running = false; el('d1-status').textContent = 'paused'; if (raf) cancelAnimationFrame(raf); return; }
    running = true; lastWall = performance.now(); el('d1-status').textContent = 'running';
    raf = requestAnimationFrame(frame);
  });
  el('d1-reset').addEventListener('click', reset);
  el('d1-dt').addEventListener('input', function () { el('d1-dt-val').textContent = this.value; });
  reset();
})();

/* ===================== DEMO 2 =====================
   Scene (shaded, "camera") vs property fields (friction/stiffness/pressure). */
(function () {
  const canvas = el('d2-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const HALF = W / 2;
  let lightAngle = 0.9, mode = 'camera', hover = null, raf = null, spinning = false;

  // four materials on a tabletop: rubber, steel, wood, gel (values are illustrative)
  const materials = [
    { name: 'rubber mat', mu: 0.95, k: 0.30, color: '#4a4a4a' },
    { name: 'steel plate', mu: 0.20, k: 0.98, color: '#8f9aa6' },
    { name: 'wood board', mu: 0.48, k: 0.55, color: '#a9825a' },
    { name: 'gel pad', mu: 0.75, k: 0.05, color: '#c9b8d8' },
  ];
  // regions (x0,y0,x1,y1) in scene coordinates
  const regions = [
    { x0: 30, y0: 40, x1: 300, y1: 140, m: 0 },
    { x0: 330, y0: 40, x1: 610, y1: 140, m: 1 },
    { x0: 30, y0: 170, x1: 300, y1: 330, m: 2 },
    { x0: 330, y0: 170, x1: 610, y1: 330, m: 3 },
  ];

  function materialAt(x, y) {
    for (const r of regions) {
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return materials[r.m];
    }
    return null;
  }

  function shade(baseX, baseY, mat, t) {
    // cheap lambert shading from a moving light — this is the "camera" view
    const lx = HALF / 2 + Math.cos(lightAngle) * 160;
    const ly = 180 + Math.sin(lightAngle) * 120;
    const dx = baseX - lx, dy = baseY - ly;
    const d = Math.sqrt(dx * dx + dy * dy);
    let lam = Math.max(0.25, 1 - d / 420);
    // slight time ripple so rotation is visible
    lam *= 0.92 + 0.08 * Math.sin(t * 2 + (baseX + baseY) / 60);
    const c = mat.color;
    const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    return 'rgb(' + Math.round(r * lam) + ',' + Math.round(g * lam) + ',' + Math.round(b * lam) + ')';
  }

  function fieldColor(v, hue) {
    // v in [0,1] -> heat-map-ish color per field
    const t = clamp(v, 0, 1);
    if (hue === 'friction') return 'rgb(' + Math.round(30 + 200 * t) + ',' + Math.round(80 + 60 * (1 - t)) + ',' + Math.round(120 + 100 * (1 - t)) + ')';
    if (hue === 'stiffness') return 'rgb(' + Math.round(40 * (1 - t) + 20) + ',' + Math.round(90 + 130 * t) + ',' + Math.round(70 + 40 * (1 - t)) + ')';
    return 'rgb(' + Math.round(160 + 90 * t) + ',' + Math.round(60 + 40 * (1 - t)) + ',' + Math.round(30 + 30 * t) + ')';
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    // divider
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(HALF, 0); ctx.lineTo(HALF, H); ctx.stroke();
    ctx.lineWidth = 1;

    for (const r of regions) {
      const mat = materials[r.m];
      // left: camera shading
      ctx.fillStyle = shade((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, mat, t);
      ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);

      // right: property fields — draw per-region fill from fieldColor
      const fx0 = r.x0 - HALF + HALF, fy0 = r.y0, fw = r.x1 - r.x0, fh = r.y1 - r.y0;
      // draw each field as a vertical band so all three are visible
      const bh = fh / 3;
      ctx.fillStyle = fieldColor(mat.mu, 'friction');
      ctx.fillRect(HALF + r.x0 - HALF + 0, fy0, fw, bh);
      ctx.fillStyle = fieldColor(mat.k, 'stiffness');
      ctx.fillRect(HALF + r.x0 - HALF + 0, fy0 + bh, fw, bh);
      // pressure: illustrative spatial gradient inside each region
      for (let i = 0; i < 10; i++) {
        const pv = 0.15 + 0.8 * (i / 9);
        ctx.fillStyle = fieldColor(pv, 'pressure');
        ctx.fillRect(HALF + r.x0, fy0 + 2 * bh + (i / 10) * bh, fw, bh / 10 + 1);
      }
      // labels on right half
      ctx.fillStyle = '#1a1a1a'; ctx.font = '11px ui-monospace, monospace';
      ctx.fillText('μ=' + mat.mu.toFixed(2), HALF + r.x0 + 6, fy0 + 13);
      ctx.fillText('k=' + mat.k.toFixed(2), HALF + r.x0 + 6, fy0 + bh + 13);
      ctx.fillText('p̄(x)', HALF + r.x0 + 6, fy0 + 2 * bh + 13);
      // name label on left
      ctx.fillStyle = '#fff'; ctx.font = '12px ui-monospace, monospace';
      ctx.fillText(mat.name, r.x0 + 6, r.y0 + 16);
    }

    // hover probe crosshair
    if (hover) {
      const mat = materialAt(hover.x, hover.y);
      if (mat) {
        ctx.strokeStyle = '#9a3412';
        ctx.beginPath(); ctx.arc(hover.x, hover.y, 6, 0, Math.PI * 2); ctx.stroke();
        el('d2-readout').textContent =
          'material      : ' + mat.name + '\n' +
          'μ friction    : ' + mat.mu.toFixed(2) + '\n' +
          'k stiffness   : ' + mat.k.toFixed(2) + '\n' +
          'p̄ pressure   : illustrative gradient (region)\n' +
          'x, y          : ' + hover.x + ', ' + hover.y;
      }
    }
    // captions
    ctx.fillStyle = '#5a5a5a'; ctx.font = '12px ui-monospace, monospace';
    ctx.fillText('camera view (pixels)', 10, H - 10);
    ctx.fillText('property head (μ / k / p̄)', HALF + 10, H - 10);
  }

  function loop(ts) { draw(ts / 1000); if (spinning) raf = requestAnimationFrame(loop); }

  canvas.addEventListener('mousemove', function (e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (canvas.height / rect.height));
    hover = { x, y };
    if (!spinning) draw(0);
  });
  canvas.addEventListener('mouseleave', function () { hover = null; if (!spinning) draw(0); });
  el('d2-rotate').addEventListener('click', function () {
    spinning = !spinning;
    el('d2-status').textContent = spinning ? 'rotating' : 'idle';
    if (spinning) raf = requestAnimationFrame(loop);
  });
  el('d2-light').addEventListener('click', function () {
    lightAngle += 0.7;
    if (!spinning) draw(0);
  });
  draw(0);
})();

/* ===================== DEMO 3 =====================
   1D push-box. ES-trained controller. Two anti-exploit modes:
   - temperature noise: train with noisy dream properties
   - contrastive gate:  train on honest + poisoned dreams, drop poisoned ones the policy exploits */
(function () {
  const canvas = el('d3-canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const FLOOR = H - 60, GOAL_X = 560, BOX_X0 = 120, BOX_W = 36, AGENT_W = 18;

  // physics params (real world): mass, friction, actuator lag
  const REAL = { mass: 1.0, mu: 0.55, lag: 0.10 };

  function simEpisode(policy, env, epLen) {
    // env = {mass, mu, lag}; policy = function(u) -> force in [-1, 1]
    // state: box position p, box velocity v, agent internal actuator state a
    let p = BOX_X0, v = 0, a = 0;
    let ret = 0;
    const dt = 0.05;
    for (let t = 0; t < epLen; t++) {
      const u = policy({ p, v, a, t });
      a += (u - a) * (1 - env.lag);       // actuator lag
      const F = a * 3.0 * env.mass;       // force scales with mass
      const friction = env.mu * 2.0;
      v += (F - friction * v) * dt;
      p += v * dt;
      // reward: progress toward goal, penalty for overspeed (slam)
      ret += (p - BOX_X0) / (GOAL_X - BOX_X0) * 0.1 - (v > 2.2 ? 0.5 : 0);
      if (p >= GOAL_X) { ret += 1.0; break; }
    }
    return { ret, p };
  }

  // tiny linear-ish policy net: features -> force. params length 6.
  const NP = 6;
  function policyFrom(theta) {
    return function (s) {
      const f = [1, s.v / 2, s.a, Math.max(0, (GOAL_X - s.p) / 400)];
      let z = 0;
      for (let i = 0; i < 4; i++) z += theta[i] * f[i];
      z += theta[4] * (s.v > 1.8 ? 1 : 0);       // exploits like slamming when fast
      z += theta[5] * (s.v * s.v / 6);           // quadratic velocity term (exploit-friendly)
      return Math.tanh(z);
    };
  }

  // --- dream generator ---
  function dreamEnv(rng, noiseScale, poisoned) {
    // property drift: friction can drift low in dreams (the exploit)
    const mu = clamp(REAL.mu + (rng() * 2 - 1) * 0.25 * noiseScale + (poisoned ? -0.30 : 0), 0.05, 1.2);
    const mass = clamp(REAL.mass + (rng() * 2 - 1) * 0.3 * noiseScale + (poisoned ? 0.4 : 0), 0.4, 2.5);
    const lag = clamp(REAL.lag + (rng() * 2 - 1) * 0.05 * noiseScale, 0.02, 0.3);
    return { mass, mu, lag };
  }

  // simple seeded RNG (mulberry32)
  function makeRng(seed) {
    let s = seed | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --- ES trainer ---
  let theta, sigma = 0.25, popSize = 12, lr = 0.08, gen = 0, rng = makeRng(42);
  let history = [], mode = 'noise', exploitStreak = 0, blockedCount = 0;

  function evaluate(thetaVec, env, epLen) { return simEpisode(policyFrom(thetaVec), env, epLen).ret; }

  function trainBatch(nBatches) {
    const useGate = (mode === 'gate');
    for (let b = 0; b < nBatches; b++) {
      gen++;
      // sample population perturbations
      const eps = [];
      for (let i = 0; i < popSize; i++) {
        const e = new Array(NP);
        for (let j = 0; j < NP; j++) e[j] = (rng() * 2 - 1);
        eps.push(e);
      }
      // dreams for this generation
      const honestEnv = dreamEnv(rng, 0.6, false);
      const poisonedEnv = useGate ? dreamEnv(rng, 0.6, true) : null;

      // fitness: honest dream return, minus poisoned return if policy exploits it
      const fits = eps.map(function (e) {
        const t2 = theta.map(function (v, j) { return v + sigma * e[j]; });
        let fit = evaluate(t2, honestEnv, 200);
        if (useGate) {
          const poisonedFit = evaluate(t2, poisonedEnv, 200);
          // gate: if the policy does *better* on the poisoned (unrealistic) dream
          // than on the honest one, treat that as suspicious and subtract it.
          if (poisonedFit > fit * 1.15) {
            fit -= (poisonedFit - fit) * 0.5;
          }
        }
        return fit;
      });

      // ES gradient estimate
      const mean = fits.reduce(function (a, b) { return a + b; }, 0) / fits.length;
      const std = Math.sqrt(fits.reduce(function (a, f) { return a + (f - mean) * (f - mean); }, 0) / fits.length) || 1;
      const grad = new Array(NP).fill(0);
      for (let i = 0; i < popSize; i++) {
        const w = (fits[i] - mean) / std;
        for (let j = 0; j < NP; j++) grad[j] += w * eps[i][j];
      }
      for (let j = 0; j < NP; j++) theta[j] += (lr / (popSize * sigma)) * grad[j];
      theta = theta.map(function (v) { return clamp(v, -3, 3); });

      // track real-world vs dream return of the *mean* policy
      const realRet = evaluate(theta, REAL, 200);
      const dreamRet = evaluate(theta, honestEnv, 200);
      history.push({ gen, real: realRet, dream: dreamRet });

      // exploit detection: dream >> real
      if (dreamRet > realRet * 1.3 + 0.2) exploitStreak++; else exploitStreak = 0;
      if (useGate && exploitStreak >= 2) blockedCount++;

      el('d3-status').textContent = 'gen ' + gen;
      el('d3-readout').textContent =
        'generation       : ' + gen + '\n' +
        'mode             : ' + (useGate ? 'contrastive gate' : 'temperature noise') + '\n' +
        'real-world return: ' + realRet.toFixed(2) + '\n' +
        'dream return     : ' + dreamRet.toFixed(2) + '\n' +
        'exploit streak   : ' + exploitStreak + (useGate ? '  (blocked dreams: ' + blockedCount + ')' : '') + '\n' +
        'final box pos    : ' + simEpisode(policyFrom(theta), REAL, 200).p.toFixed(0) + ' / goal ' + GOAL_X;
    }
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // floor
    ctx.strokeStyle = '#e2e0da';
    ctx.beginPath(); ctx.moveTo(0, FLOOR + 12); ctx.lineTo(W, FLOOR + 12); ctx.stroke();
    // goal
    ctx.fillStyle = '#166534';
    ctx.fillRect(GOAL_X, FLOOR - 40, 4, 52);
    ctx.fillStyle = '#5a5a5a'; ctx.font = '11px ui-monospace, monospace';
    ctx.fillText('goal', GOAL_X - 14, FLOOR - 48);

    // run one episode for visualization
    let p = BOX_X0, v = 0, a = 0; const dt = 0.05;
    const pol = policyFrom(theta);
    const traj = [];
    for (let t = 0; t < 200; t++) {
      const u = pol({ p, v, a, t });
      a += (u - a) * (1 - REAL.lag);
      const F = a * 3.0 * REAL.mass;
      v += (F - REAL.mu * 2.0 * v) * dt;
      p += v * dt;
      traj.push(p);
      if (p >= GOAL_X) break;
    }
    // box at final position
    const bx = clamp(traj[traj.length - 1], BOX_X0, W - 50);
    ctx.fillStyle = '#9a3412';
    ctx.fillRect(bx, FLOOR - BOX_W, BOX_W, BOX_W);
    ctx.fillStyle = '#1a1a1a'; ctx.font = '12px ui-monospace, monospace';
    ctx.fillText('box: ' + bx.toFixed(0), bx - 8, FLOOR - BOX_W - 6);

    // return curve (right panel area)
    const cx0 = 20, cy0 = 30, cw = W - 40, ch = 120;
    ctx.strokeStyle = '#e2e0da';
    ctx.strokeRect(cx0, cy0, cw, ch);
    if (history.length > 1) {
      const n = history.length;
      const maxY = Math.max(1.2, ...history.map(function (h) { return Math.max(h.real, h.dream); }));
      function lineFor(key, color) {
        ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const x = cx0 + (i / (n - 1)) * cw;
          const y = cy0 + ch - (history[i][key] / maxY) * ch;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.lineWidth = 1;
      }
      lineFor('real', '#166534');
      lineFor('dream', '#9a3412');
      ctx.fillStyle = '#166534'; ctx.fillText('real return', cx0 + 6, cy0 + 12);
      ctx.fillStyle = '#9a3412'; ctx.fillText('dream return', cx0 + 70, cy0 + 12);
      ctx.fillStyle = '#5a5a5a';
      ctx.fillText('gens: ' + n + '   maxY: ' + maxY.toFixed(2), cx0 + cw - 150, cy0 + 12);
    } else {
      ctx.fillStyle = '#8b8b8b';
      ctx.fillText('return curve appears after training starts', cx0 + 8, cy0 + ch / 2);
    }
  }

  el('d3-train').addEventListener('click', function () { mode = el('d3-mode').value; trainBatch(1); });
  el('d3-train10').addEventListener('click', function () { mode = el('d3-mode').value; trainBatch(10); });
  el('d3-reset').addEventListener('click', function () {
    theta = new Array(NP).fill(0); gen = 0; history = []; blockedCount = 0; exploitStreak = 0;
    rng = makeRng(42);
    el('d3-status').textContent = 'idle';
    el('d3-readout').textContent = 'Reset. Press train to start evolving the controller.';
    draw();
  });

  theta = new Array(NP).fill(0);
  draw();
})();
