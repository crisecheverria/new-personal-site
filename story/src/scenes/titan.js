import * as THREE from 'three';
import { rng, glowSprite } from './common.js';

// An editor and an AI agent working side by side: the agent reads the code,
// explains the bug and applies a fix, on a loop. The window is HTML placed
// over the scene, so its text stays sharp; the scene supplies the glow, the
// AI orb and the sparks around it.

const CODE = [
  "import { useEffect, useState } from 'react';",
  '',
  'export function useTimer(seconds: number) {',
  '  const [left, setLeft] = useState(seconds);',
  '',
  '  useEffect(() => {',
  '    const start = performance.now();',
  '    const id = setInterval(() => {',
  '      setLeft((l) => l - 1);',
  '    }, 1000);',
  '    return () => clearInterval(id);',
  '  }, [seconds]);',
  '',
  '  return Math.max(0, left);',
  '}',
];
const BUG_LINE = 8;
const FIX = ['      const ms = performance.now() - start;', '      setLeft(seconds - Math.floor(ms / 1000));'];
const FIXED = [...CODE.slice(0, BUG_LINE), ...FIX, ...CODE.slice(BUG_LINE + 1)];
const AI_TEXT = 'setInterval counts ticks, and late ticks add up. I’ll work out the time left from the start time instead.';
const STEPS = [0.04, 0.16, 0.3, 0.55, 0.72]; // when each chat entry appears
const LOOP = 16; // seconds for one run of the story

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TOKEN = /('[^']*')|(\b\d+\b)|\b(import|from|export|function|const|return|number)\b|(\b[A-Za-z_]\w*(?=\())|([\s\S])/g;
function highlight(line) {
  let out = '';
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(line))) {
    const [tk, str, num, kw, fn] = m;
    const cls = str ? 's' : num ? 'n' : kw ? 'k' : fn ? 'f' : '';
    out += cls ? `<span class="${cls}">${esc(tk)}</span>` : esc(tk);
  }
  return out;
}
function codeHtml(lines, mark) {
  return lines.map((ln, i) => `<div class="${mark(i)}"><span class="ln">${i + 1}</span>${highlight(ln) || ' '}</div>`).join('');
}

export function buildTitan() {
  const r = rng(91);
  const group = new THREE.Group();

  const el = document.createElement('div');
  el.className = 'mock ide';
  el.innerHTML = `<div class="mock-win">
    <div class="mock-bar"><i></i><i></i><i></i><span>timer — src/useTimer.ts</span></div>
    <div class="ide-body">
      <div class="ide-tree"><p>▾ src</p><p class="open in">useTimer.ts</p><p class="in">Timer.tsx</p><p class="in">main.tsx</p><p>▾ test</p><p class="in">useTimer.test.ts</p><p>package.json</p></div>
      <div class="ide-code"><div class="ide-tab">useTimer.ts</div><div class="ide-lines"></div></div>
      <div class="ide-chat">
        <div class="chat-head"><b></b>AI agent</div>
        <div class="chat-log">
          <p class="you">The timer drifts after a few minutes. Can you fix it?</p>
          <p class="note">Reading src/useTimer.ts…</p>
          <p class="ai"><span></span></p>
          <pre class="diff"><span class="del">- setLeft((l) =&gt; l - 1);</span>\n<span class="add">+ const ms = now() - start;</span>\n<span class="add">+ setLeft(seconds - ms / 1000);</span></pre>
          <p class="ok">✓ 3 tests pass</p>
        </div>
        <div class="chat-input">Ask the agent…</div>
      </div>
    </div>
  </div>`;
  document.getElementById('screens').appendChild(el);
  const linesEl = el.querySelector('.ide-lines');
  const entries = [...el.querySelector('.chat-log').children];
  const aiText = el.querySelector('.ai span');

  const W = 21;
  const win = new THREE.Group();
  win.position.y = 5;
  const glow = glowSprite('#7d6bff', 54, 0.42);
  glow.position.z = -3;
  win.add(glow);
  group.add(win);

  // The AI: an orb with a slowly shifting gradient, linked to the agent panel.
  const orbMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); vP = position; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vP; uniform float uTime;
      void main(){
        float f = pow(1.0 - max(dot(vN, vV), 0.0), 2.0);
        float swirl = 0.5 + 0.5 * sin(vP.y * 3.0 + uTime * 1.4 + sin(vP.x * 2.5 - uTime) * 1.5);
        vec3 col = mix(mix(vec3(0.45, 0.36, 1.0), vec3(0.35, 0.9, 1.0), swirl), vec3(1.0, 0.55, 0.85), f * 0.6);
        gl_FragColor = vec4(col * (0.55 + f * 1.2), 1.0);
      }`,
  });
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 5), orbMat);
  const orbGlow = glowSprite('#9d8bff', 12, 0.55);
  const orbGroup = new THREE.Group();
  orbGroup.add(orb, orbGlow);
  const ORB = new THREE.Vector3(7.6, 13.4, 1.5);
  orbGroup.position.copy(ORB);
  group.add(orbGroup);

  // A thread of light from the orb to the agent panel.
  const linkCurve = new THREE.QuadraticBezierCurve3(ORB.clone(), new THREE.Vector3(5.6, 12.6, 1.2), new THREE.Vector3(5, 11.2, 0.2));
  group.add(new THREE.Mesh(new THREE.TubeGeometry(linkCurve, 40, 0.035, 5, false), new THREE.MeshBasicMaterial({ color: '#b9abff', transparent: true, opacity: 0.55 })));
  const spark = glowSprite('#ffffff', 1.2, 0.9);
  group.add(spark);

  // Drifting sparks.
  const N = 400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (r() - 0.5) * 80;
    pos[i * 3 + 1] = (r() - 0.3) * 34;
    pos[i * 3 + 2] = (r() - 0.6) * 40;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const sparks = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#9fb4ff', size: 0.1, transparent: true, opacity: 0.6, depthWrite: false }));
  group.add(sparks);

  let state = '';
  let typedShown = -1;
  function update(t) {
    const p = (t % LOOP) / LOOP;
    const step = STEPS.filter((s) => p >= s).length;
    const fixed = p > 0.62;
    const flagged = !fixed && p > 0.3;
    const key = `${step}:${fixed}:${flagged}`;
    if (key !== state) {
      state = key;
      entries.forEach((e, i) => { e.hidden = i >= step; });
      linesEl.innerHTML = fixed
        ? codeHtml(FIXED, (i) => (i === BUG_LINE || i === BUG_LINE + 1 ? 'added' : ''))
        : codeHtml(CODE, (i) => (flagged && i === BUG_LINE ? 'flagged' : ''));
    }
    // The agent's explanation types out.
    const typed = Math.floor(AI_TEXT.length * THREE.MathUtils.clamp((p - STEPS[2]) / 0.18, 0, 1));
    if (typed !== typedShown) {
      typedShown = typed;
      aiText.textContent = AI_TEXT.slice(0, typed);
      aiText.parentNode.classList.toggle('typing', typed < AI_TEXT.length);
    }
    win.position.y = 5 + Math.sin(t * 0.6) * 0.15;
    orbMat.uniforms.uTime.value = t;
    orbGroup.position.y = ORB.y + Math.sin(t * 1.1) * 0.35;
    orb.rotation.y = t * 0.3;
    orbGlow.material.opacity = 0.45 + Math.sin(t * 2.2) * 0.12;
    spark.position.copy(linkCurve.getPoint((t * 0.5) % 1));
    sparks.rotation.y = t * 0.01;
  }

  return { group, update, overlay: { el, anchor: win, width: W, station: 'titan' } };
}
