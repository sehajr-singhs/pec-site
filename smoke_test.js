/* Headless smoke test for demos.js: stubs the DOM/canvas, loads the demos,
   fires the control handlers, and asserts the demos run and the ES training loop improves. */
'use strict';
const fs = require('fs');
const vm = require('vm');

const listeners = {};
const els = {};

/* --- clock + rAF queue so demo 1's animation loop actually executes --- */
let clock = 0;
let rafQueue = [];
let rafId = 1;
const sandbox = {
  console,
  Math,
  performance: { now: () => clock },
  requestAnimationFrame(cb) { rafQueue.push({ cb, id: rafId }); return rafId++; },
  cancelAnimationFrame(id) { rafQueue = rafQueue.filter(r => r.id !== id); },
  document: { getElementById: (id) => (els[id] ||= makeEl(id)) }
};
function flushFrames(n) {
  for (let i = 0; i < n; i++) {
    clock += 16; // ~60fps
    const q = rafQueue; rafQueue = [];
    for (const r of q) r.cb(clock);
  }
}

function makeCtx() {
  return new Proxy({}, {
    get(t, p) {
      if (p === 'canvas') return { width: 640, height: 360 };
      if (p === 'lineWidth') return 1;
      return function () {};
    },
    set() { return true; }
  });
}
function makeEl(id) {
  return {
    id,
    value: id === 'd1-dt' ? '16' : id === 'd3-mode' ? 'noise' : undefined,
    textContent: '',
    width: 640,
    height: 360,
    addEventListener(type, fn) { listeners[id + ':' + type] = fn; },
    getContext() { return makeCtx(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 640, height: 360 }; }
  };
}

vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname + '/demos.js', 'utf8'), sandbox, { filename: 'demos.js' });

let failures = 0;
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name);
  if (!cond) failures++;
}

/* ---- Demo 1: run, animate ~20 frames, readout must update ---- */
listeners['d1-run:click']();
flushFrames(20);
const d1txt = els['d1-readout'].textContent;
console.log('d1 readout:\n' + d1txt);
check('demo1 readout updated after frames', d1txt.includes('sim time') && d1txt.includes('state diff'));
check('demo1 sim time advanced', parseFloat(d1txt.match(/sim time\s*: ([\d.]+)/)[1]) > 0.1);
listeners['d1-reset:click']();
check('demo1 reset clears status', els['d1-status'].textContent === 'idle');
listeners['d1-dt:input'].call({ value: '60' });
check('demo1 dt slider label syncs', els['d1-dt-val'].textContent === '60');

/* ---- Demo 2: light move + hover probe ---- */
listeners['d2-light:click']();
els['d2-canvas'].getBoundingClientRect = () => ({ left: 0, top: 0, width: 640, height: 360 });
// simulate hover via the mousemove listener we can't fire directly; instead call draw path via light clicks
listeners['d2-rotate:click']();
flushFrames(5);
listeners['d2-rotate:click'](); // stop spinning
check('demo2 rotate toggles status', els['d2-status'].textContent === 'idle');

/* ---- Demo 3: ES training improves real return ---- */
function readReturn(txt) {
  const m = txt.match(/real-world return: (-?[\d.]+)/);
  return m ? parseFloat(m[1]) : NaN;
}
const d3mode = sandbox.document.getElementById('d3-mode'); // lazily created stub
d3mode.value = 'noise';
listeners['d3-train:click']();               // gen 1
const noiseFirst = readReturn(els['d3-readout'].textContent);
listeners['d3-train10:click']();             // gens 2-11
const noiseAfter = readReturn(els['d3-readout'].textContent);
console.log('noise mode: gen1 real =', noiseFirst, ' gen11 real =', noiseAfter);
check('demo3 ES improves real return (noise mode)', noiseAfter > noiseFirst);
check('demo3 status shows generation', els['d3-status'].textContent === 'gen 11');

listeners['d3-reset:click']();
d3mode.value = 'gate';
listeners['d3-train10:click']();
const gateAfter = readReturn(els['d3-readout'].textContent);
console.log('gate mode: after 10 gens real return =', gateAfter);
check('demo3 gate mode trains without crashing', !isNaN(gateAfter));
check('demo3 gate readout mentions blocked dreams', els['d3-readout'].textContent.includes('blocked dreams'));

console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : '\n' + failures + ' TEST(S) FAILED');
process.exit(failures === 0 ? 0 : 1);
