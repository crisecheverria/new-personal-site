import * as THREE from 'three';
import { rng, canvasTexture, glowSprite } from './common.js';

// An editor and an AI agent working side by side: the agent reads the code,
// explains the bug and applies a fix, on a loop.

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

const CHAT = [
  { who: 'you', text: 'The timer drifts after a few minutes. Can you fix it?' },
  { who: 'note', text: 'Reading src/useTimer.ts…' },
  { who: 'ai', text: 'setInterval counts ticks, and late ticks add up. I’ll work out the time left from the start time instead.' },
  { who: 'diff' },
  { who: 'ok', text: '✓ 3 tests pass' },
];
const STEPS = [0.04, 0.16, 0.3, 0.55, 0.72];
const LOOP = 16; // seconds for one run of the story

const C = { bg: '#14151b', panel: '#191a22', line: '#24252f', text: '#d7d4cc', dim: '#6c6d78', kw: '#c3a6ff', str: '#9be3a8', fn: '#8cc8ff', num: '#ffbf80', accent: '#b9abff' };
const TOKEN = /('[^']*')|(\b\d+\b)|\b(import|from|export|function|const|return|number)\b|(\b[A-Za-z_]\w*(?=\())|([\s\S])/g;

// A tiny syntax highlighter: strings, numbers, keywords and calls.
function drawCode(ctx, x, y, line) {
  let cx = x;
  TOKEN.lastIndex = 0;
  let m;
  while ((m = TOKEN.exec(line))) {
    const [tk, str, num, kw, fn] = m;
    ctx.fillStyle = str ? C.str : num ? C.num : kw ? C.kw : fn ? C.fn : C.text;
    ctx.fillText(tk, cx, y);
    cx += ctx.measureText(tk).width;
  }
}

function wrap(ctx, text, width) {
  const lines = [];
  let cur = '';
  for (const w of text.split(' ')) {
    const next = cur ? cur + ' ' + w : w;
    if (ctx.measureText(next).width > width && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

function drawIDE(ctx, w, h, t = 0) {
  const p = (t % LOOP) / LOOP;
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);

  // Title bar.
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 0, w, 64);
  ['#ff6b6b', '#ffcf5c', '#5cd18a'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(36 + i * 30, 32, 9, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.font = '500 24px Inter, system-ui, sans-serif';
  ctx.fillStyle = C.dim;
  ctx.textAlign = 'center';
  ctx.fillText('timer — src/useTimer.ts', w / 2, 41);
  ctx.textAlign = 'left';

  // File tree.
  const treeW = 300;
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, 64, treeW, h - 64);
  ctx.font = '22px "JetBrains Mono", monospace';
  [['▾ src', 0], ['useTimer.ts', 1], ['Timer.tsx', 1], ['main.tsx', 1], ['▾ test', 0], ['useTimer.test.ts', 1], ['package.json', 0]].forEach(([name, depth], i) => {
    const y = 120 + i * 44;
    const open = name === 'useTimer.ts';
    if (open) {
      ctx.fillStyle = 'rgba(185,171,255,0.14)';
      ctx.fillRect(0, y - 30, treeW, 42);
    }
    ctx.fillStyle = open ? C.text : C.dim;
    ctx.fillText(name, 28 + depth * 26, y);
  });

  // Code.
  const chatX = 1180;
  ctx.save();
  ctx.beginPath();
  ctx.rect(treeW, 64, chatX - treeW, h - 64);
  ctx.clip();
  ctx.fillStyle = C.line;
  ctx.fillRect(treeW, 64, chatX - treeW, 52);
  ctx.fillStyle = C.text;
  ctx.font = '500 22px Inter, system-ui, sans-serif';
  ctx.fillText('useTimer.ts', treeW + 26, 98);
  ctx.font = '25px "JetBrains Mono", monospace';
  const fixed = p > 0.62;
  const lines = fixed ? [...CODE.slice(0, BUG_LINE), ...FIX, ...CODE.slice(BUG_LINE + 1)] : CODE;
  lines.forEach((ln, i) => {
    const y = 170 + i * 46;
    const added = fixed && (i === BUG_LINE || i === BUG_LINE + 1);
    const flagged = !fixed && i === BUG_LINE && p > 0.3;
    if (added || flagged) {
      ctx.fillStyle = added ? 'rgba(120, 220, 150, 0.14)' : 'rgba(255, 120, 120, 0.13)';
      ctx.fillRect(treeW, y - 32, chatX - treeW, 44);
    }
    ctx.fillStyle = C.dim;
    ctx.fillText(String(i + 1).padStart(2, ' '), treeW + 30, y);
    drawCode(ctx, treeW + 94, y, ln);
  });
  ctx.restore();

  // Agent panel.
  ctx.fillStyle = C.panel;
  ctx.fillRect(chatX, 64, w - chatX, h - 64);
  ctx.fillStyle = C.line;
  ctx.fillRect(chatX, 64, 2, h - 64);
  ctx.fillStyle = C.accent;
  ctx.beginPath();
  ctx.arc(chatX + 34, 98, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.text;
  ctx.font = '600 23px Inter, system-ui, sans-serif';
  ctx.fillText('AI agent', chatX + 54, 106);

  const pad = 26;
  const bw = w - chatX - pad * 2;
  let y = 160;
  ctx.font = '23px Inter, system-ui, sans-serif';
  CHAT.forEach((m, i) => {
    if (p < STEPS[i]) return;
    if (m.who === 'diff') {
      ctx.font = '21px "JetBrains Mono", monospace';
      const rows = [['- setLeft((l) => l - 1);', '#ff8f8f'], ['+ const ms = now() - start;', '#8fe3a6'], ['+ setLeft(seconds - ms / 1000);', '#8fe3a6']];
      ctx.fillStyle = '#111218';
      ctx.beginPath();
      ctx.roundRect(chatX + pad, y - 8, bw, rows.length * 36 + 24, 12);
      ctx.fill();
      rows.forEach(([code, c], k) => {
        ctx.fillStyle = c;
        ctx.fillText(code, chatX + pad + 18, y + 26 + k * 36);
      });
      y += rows.length * 36 + 44;
      ctx.font = '23px Inter, system-ui, sans-serif';
      return;
    }
    // The agent's explanation types out.
    const k = m.who === 'ai' ? Math.min(1, (p - STEPS[i]) / 0.18) : 1;
    const text = m.text.slice(0, Math.floor(m.text.length * k));
    const wrapped = wrap(ctx, text, bw - 36);
    const bh = Math.max(1, wrapped.length) * 32 + 24;
    if (m.who === 'you') {
      ctx.fillStyle = 'rgba(185,171,255,0.16)';
      ctx.beginPath();
      ctx.roundRect(chatX + pad + 40, y - 6, bw - 40, bh, 14);
      ctx.fill();
      ctx.fillStyle = C.text;
      wrapped.forEach((ln, j) => ctx.fillText(ln, chatX + pad + 58, y + 26 + j * 32));
    } else {
      ctx.fillStyle = m.who === 'ok' ? '#8fe3a6' : m.who === 'note' ? C.dim : C.text;
      wrapped.forEach((ln, j) => ctx.fillText(ln, chatX + pad, y + 26 + j * 32));
      if (m.who === 'ai' && k < 1 && Math.floor(t * 2) % 2 === 0) {
        const last = wrapped[wrapped.length - 1] || '';
        ctx.fillStyle = C.accent;
        ctx.fillRect(chatX + pad + ctx.measureText(last).width + 4, y + 6 + (wrapped.length - 1) * 32, 12, 26);
      }
    }
    y += bh + 18;
  });

  // Prompt box.
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(chatX + pad, h - 110, bw, 70, 14);
  ctx.stroke();
  ctx.fillStyle = C.dim;
  ctx.fillText('Ask the agent…', chatX + pad + 22, h - 66);
}

export function buildTitan() {
  const r = rng(91);
  const group = new THREE.Group();

  const CW = 1800, CH = 1100;
  const screen = canvasTexture(CW, CH, drawIDE);

  const W = 21, H = W * (CH / CW);
  const win = new THREE.Group();
  win.position.y = 5;
  const frame = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roundedRect(W + 0.5, H + 0.5, 0.5), { depth: 0.4, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 2 }),
    new THREE.MeshStandardMaterial({ color: '#1b1c27', roughness: 0.35, metalness: 0.5 })
  );
  frame.position.z = -0.45;
  win.add(frame);
  const screenGeo = new THREE.ShapeGeometry(roundedRect(W, H, 0.35));
  const uv = screenGeo.attributes.uv;
  const pp = screenGeo.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / W + 0.5, pp.getY(i) / H + 0.5);
  const scr = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false }));
  scr.position.z = 0.05;
  win.add(scr);
  const glow = glowSprite('#7d6bff', 50, 0.4);
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
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.3, 5), orbMat);
  const orbGlow = glowSprite('#9d8bff', 12, 0.55);
  const orbGroup = new THREE.Group();
  orbGroup.add(orb, orbGlow);
  const ORB = new THREE.Vector3(7.5, 15.2, 1.5);
  orbGroup.position.copy(ORB);
  group.add(orbGroup);

  // A thread of light from the orb to the agent panel.
  const linkCurve = new THREE.QuadraticBezierCurve3(ORB.clone(), new THREE.Vector3(5.2, 13.2, 1.2), new THREE.Vector3(4.2, 10.5, 0.2));
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

  let lastFrame = -1;
  function update(t) {
    const frameNo = Math.floor(t * 12);
    if (frameNo !== lastFrame) {
      lastFrame = frameNo;
      screen.redraw(t);
    }
    win.rotation.y = -0.06 + Math.sin(t * 0.25) * 0.03;
    win.position.y = 5 + Math.sin(t * 0.6) * 0.15;
    orbMat.uniforms.uTime.value = t;
    orbGroup.position.y = ORB.y + Math.sin(t * 1.1) * 0.35;
    orb.rotation.y = t * 0.3;
    orbGlow.material.opacity = 0.45 + Math.sin(t * 2.2) * 0.12;
    spark.position.copy(linkCurve.getPoint((t * 0.5) % 1));
    sparks.rotation.y = t * 0.01;
  }

  return { group, update };
}
