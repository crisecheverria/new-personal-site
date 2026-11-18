import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Phones and tablets get lighter settings: smaller shadow and reflection
// maps, and no ambient-occlusion pass.
export const LOW_POWER = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 700;

// Small deterministic random so every visit builds the same world.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Noise ───────────────────────────────────────────────────────────────────

function hash(x, y, s) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function valueNoise(seed = 1) {
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
export function fbm(n, x, y, octaves = 4) {
  let s = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    s += amp * n(x * f, y * f);
    norm += amp;
    amp *= 0.5;
    f *= 2.03;
  }
  return s / norm;
}

// Noise that repeats every `period` cells, so textures made from it tile.
function tileNoise(seed, x, y, period) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (k) => ((k % period) + period) % period;
  const a = hash(m(xi), m(yi), seed), b = hash(m(xi + 1), m(yi), seed), c = hash(m(xi), m(yi + 1), seed), d = hash(m(xi + 1), m(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// x and y run 0..1 across the texture.
function tileFbm(seed, x, y, period = 8, octaves = 4) {
  let sum = 0, amp = 0.5, norm = 0, per = period;
  for (let i = 0; i < octaves; i++) {
    sum += amp * tileNoise(seed + i, x * per, y * per, per);
    norm += amp;
    amp *= 0.5;
    per *= 2;
  }
  return sum / norm;
}

// ── Materials and textures ──────────────────────────────────────────────────

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...opts });
  matCache.set(key, m);
  return m;
}

export function mesh(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (s !== undefined) Array.isArray(s) ? m.scale.set(...s) : m.scale.setScalar(s);
  return m;
}

function paint(size, draw, { srgb = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function grain(ctx, size, r, alpha, count, colors) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[(r() * colors.length) | 0];
    ctx.globalAlpha = alpha * (0.4 + r() * 0.6);
    ctx.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
  ctx.globalAlpha = 1;
}

// Each texture is near-white with its own detail, so a material's colour
// tints it; a few (grass, sand, snow) carry their own colour.
const PAINTERS = {
  planks(ctx, s) {
    const r = rng(3);
    const boards = 6;
    const w = s / boards;
    for (let i = 0; i < boards; i++) {
      const v = 200 + r() * 55;
      ctx.fillStyle = `rgb(${v},${v * 0.97},${v * 0.92})`;
      ctx.fillRect(i * w, 0, w, s);
      ctx.strokeStyle = 'rgba(60,40,25,0.18)';
      for (let k = 0; k < 7; k++) {
        ctx.lineWidth = 0.6 + r();
        const x = i * w + r() * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + r() * 6 - 3, s * 0.3, x + r() * 6 - 3, s * 0.7, x + r() * 4 - 2, s);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30,20,12,0.55)';
      ctx.fillRect(i * w, 0, 3, s);
    }
    grain(ctx, s, r, 0.15, 3000, ['#3a2a1c', '#fff']);
  },
  siding(ctx, s) {
    const r = rng(5);
    const rows = 10;
    const h = s / rows;
    for (let i = 0; i < rows; i++) {
      const v = 225 + r() * 30;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, i * h, s, h);
      const g = ctx.createLinearGradient(0, i * h, 0, (i + 1) * h);
      g.addColorStop(0, 'rgba(255,255,255,0.15)');
      g.addColorStop(0.85, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = g;
      ctx.fillRect(0, i * h, s, h);
    }
    grain(ctx, s, r, 0.12, 2500, ['#000', '#fff']);
  },
  thatch(ctx, s) {
    const r = rng(7);
    ctx.fillStyle = '#9a8152';
    ctx.fillRect(0, 0, s, s);
    const rows = 9;
    for (let row = 0; row < rows; row++) {
      const y0 = (row / rows) * s;
      ctx.fillStyle = 'rgba(40,28,10,0.35)';
      ctx.fillRect(0, y0, s, 4);
      for (let i = 0; i < 420; i++) {
        const x = r() * s;
        const y = y0 + r() * 8;
        const len = s / rows + 6 + r() * 14;
        const c = 120 + r() * 90;
        ctx.strokeStyle = `rgba(${c},${c * 0.82},${c * 0.5},${0.5 + r() * 0.5})`;
        ctx.lineWidth = 0.8 + r() * 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (r() - 0.5) * 6, y + len);
        ctx.stroke();
      }
    }
  },
  plaster(ctx, s) {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = 228 + (tileFbm(11, x / s, y / s, 12, 4) - 0.5) * 40 + (Math.random() - 0.5) * 10;
      const i = (y * s + x) * 4;
      img.data[i] = v; img.data[i + 1] = v * 0.99; img.data[i + 2] = v * 0.96; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  },
  tiles(ctx, s) {
    const r = rng(13);
    const rows = 8, cols = 8;
    const h = s / rows, w = s / cols;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols + 1; col++) {
      const x = col * w - (row % 2) * w * 0.5;
      const v = 0.8 + r() * 0.25;
      const g = ctx.createLinearGradient(0, row * h, 0, row * h + h);
      g.addColorStop(0, `rgb(${255 * v},${255 * v},${255 * v})`);
      g.addColorStop(1, `rgb(${170 * v},${170 * v},${170 * v})`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x + 1, row * h + 1, w - 2, h - 1, [0, 0, w / 2, w / 2]);
      ctx.fill();
    }
  },
  floor(ctx, s) {
    const r = rng(17);
    const rows = 8;
    const h = s / rows;
    for (let row = 0; row < rows; row++) {
      let x = -r() * s * 0.5;
      while (x < s) {
        const len = s * (0.35 + r() * 0.5);
        const v = 0.78 + r() * 0.22;
        ctx.fillStyle = `rgb(${255 * v},${236 * v},${210 * v})`;
        ctx.fillRect(x, row * h, len, h);
        ctx.fillStyle = 'rgba(40,25,10,0.5)';
        ctx.fillRect(x, row * h, 2, h);
        x += len;
      }
      ctx.fillStyle = 'rgba(40,25,10,0.45)';
      ctx.fillRect(0, row * h, s, 2);
    }
    ctx.strokeStyle = 'rgba(80,50,20,0.12)';
    for (let i = 0; i < 260; i++) {
      const y = r() * s;
      ctx.lineWidth = 0.5 + r();
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(s, y + (r() - 0.5) * 6);
      ctx.stroke();
    }
  },
  grass(ctx, s) {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const k = tileFbm(19, x / s, y / s, 16, 5);
      const d = (Math.random() - 0.5) * 0.12;
      const i = (y * s + x) * 4;
      img.data[i] = (78 + k * 60) * (1 + d);
      img.data[i + 1] = (112 + k * 58) * (1 + d);
      img.data[i + 2] = (52 + k * 28) * (1 + d);
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  },
  sand(ctx, s) {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const k = tileFbm(23, x / s, y / s, 10, 4);
      const d = (Math.random() - 0.5) * 0.18;
      const i = (y * s + x) * 4;
      img.data[i] = (205 + k * 40) * (1 + d);
      img.data[i + 1] = (178 + k * 36) * (1 + d);
      img.data[i + 2] = (128 + k * 30) * (1 + d);
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  },
  snow(ctx, s) {
    const img = ctx.createImageData(s, s);
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const k = tileFbm(29, x / s, y / s, 8, 4);
      const sparkle = Math.random() > 0.996 ? 30 : 0;
      const i = (y * s + x) * 4;
      img.data[i] = Math.min(255, 222 + k * 26 + sparkle);
      img.data[i + 1] = Math.min(255, 230 + k * 22 + sparkle);
      img.data[i + 2] = Math.min(255, 242 + k * 13 + sparkle);
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  },
  leaves(ctx, s) {
    const r = rng(47);
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const v = 70 + r() * 185;
      ctx.fillStyle = `rgba(${v},${v},${v},${0.5 + r() * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(r() * s, r() * s, 3 + r() * 6, 1.5 + r() * 3, r() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  bark(ctx, s) {
    const r = rng(31);
    ctx.fillStyle = '#c9b49a';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      const y = (i / 26) * s + r() * 4;
      ctx.fillStyle = `rgba(60,40,24,${0.35 + r() * 0.3})`;
      ctx.fillRect(0, y, s, 3 + r() * 4);
    }
    grain(ctx, s, r, 0.25, 4000, ['#3a2a1c', '#e8dcc8']);
  },
  frond(ctx, s) {
    // A palm frond: a rib with leaflets, on transparent ground.
    const r = rng(37);
    ctx.clearRect(0, 0, s, s);
    const cx = s / 2;
    ctx.strokeStyle = '#d9d2a0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, s);
    ctx.lineTo(cx, 6);
    ctx.stroke();
    for (let i = 0; i < 48; i++) {
      const t = i / 48;
      const y = s - t * (s - 20);
      const len = (s * 0.46) * Math.sin(Math.PI * (0.12 + t * 0.85)) * (0.8 + r() * 0.25);
      for (const side of [-1, 1]) {
        const g = 150 + r() * 70;
        ctx.strokeStyle = `rgb(${g * 0.55},${g},${g * 0.45})`;
        ctx.lineWidth = 5 + r() * 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.quadraticCurveTo(cx + side * len * 0.5, y - len * 0.25, cx + side * len, y - len * 0.55 + r() * 10);
        ctx.stroke();
      }
    }
  },
};
const texCache = new Map();
export function tex(kind, rx = 1, ry = rx) {
  const key = `${kind}:${rx}:${ry}`;
  if (texCache.has(key)) return texCache.get(key);
  let base = texCache.get(kind);
  if (!base) {
    base = paint(kind === 'frond' ? 512 : 512, PAINTERS[kind]);
    texCache.set(kind, base);
  }
  const t = rx === 1 && ry === 1 ? base : base.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  texCache.set(key, t);
  return t;
}

// A tileable normal map of crossing waves, for water: many sine waves with
// whole-number frequencies, so the texture repeats without seams.
export function waveNormals(size = 256, seed = 41) {
  const r = rng(seed);
  const waves = [];
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const k = 2 + Math.floor(r() * r() * 40);
    waves.push({ kx: Math.round(Math.cos(a) * k), ky: Math.round(Math.sin(a) * k), amp: 1 / (k * (0.6 + r())), ph: r() * Math.PI * 2 });
  }
  return paint(size, (ctx) => {
    const img = ctx.createImageData(size, size);
    const v = new THREE.Vector3();
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let dx = 0, dy = 0;
      const u = (x / size) * Math.PI * 2, w = (y / size) * Math.PI * 2;
      for (const wv of waves) {
        const c = Math.cos(wv.kx * u + wv.ky * w + wv.ph) * wv.amp;
        dx += c * wv.kx;
        dy += c * wv.ky;
      }
      v.set(-dx * 0.35, -dy * 0.35, 1).normalize();
      const i = (y * size + x) * 4;
      img.data[i] = (v.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (v.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (v.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, { srgb: false });
}

// Ground that runs to the horizon, shaped by a height function.
export function terrain(size, segments, height, material, tint) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
  if (tint) {
    // Large patches of lighter and darker ground, so it doesn't look tiled.
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const k = tint(p.getX(i), p.getZ(i));
      colors[i * 3] = k; colors[i * 3 + 1] = k; colors[i * 3 + 2] = k;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.receiveShadow = true;
  return m;
}

// Merge every static mesh into one mesh per material, so a scene costs a
// handful of draw calls. Anything under a node with userData.dynamic (or a
// mesh with userData.keep) is left alone so it can still move.
export function bake(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  group.traverse((o) => {
    if (!o.isMesh || o.userData.keep) return;
    for (let p = o; p && p !== group; p = p.parent) if (p.userData.dynamic) return;
    if (o.children.length) return;
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (o.material.vertexColors && !geo.attributes.color) geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
    if (!o.material.vertexColors && geo.attributes.color) geo.deleteAttribute('color');
    geo.clearGroups();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + (o.castShadow ? 'c' : '') + (o.receiveShadow ? 'r' : '');
    if (!buckets.has(key)) buckets.set(key, { material: o.material, geos: [], cast: o.castShadow, receive: o.receiveShadow });
    buckets.get(key).geos.push(geo);
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  for (const { material, geos, cast, receive } of buckets.values()) {
    const m = new THREE.Mesh(mergeGeometries(geos, false), material);
    m.castShadow = cast;
    m.receiveShadow = receive;
    group.add(m);
  }
}

export function shadows(object, cast = true, receive = true) {
  object.traverse((o) => {
    if (o.isMesh && !o.userData.noShadow) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}

export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const redraw = (...args) => {
    draw(ctx, width, height, ...args);
    texture.needsUpdate = true;
  };
  redraw(0);
  return { texture, canvas, ctx, redraw };
}

export function glowSprite(color, size, opacity = 1) {
  const { texture } = canvasTexture(128, 128, (ctx, w, h) => {
    const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);
  });
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  );
  sprite.scale.setScalar(size);
  return sprite;
}

// ── Vegetation ──────────────────────────────────────────────────────────────

// A coconut palm: a tapering, ringed trunk and a crown of leaflet fronds.
export function palm(r, height = 7) {
  const g = new THREE.Group();
  const lean = 0.8 + r() * 1.8;
  const dir = r() * Math.PI * 2;
  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.1, height * 0.35, 0),
    new THREE.Vector3(lean * 0.55, height * 0.7, 0),
    new THREE.Vector3(lean, height, 0)
  );
  const trunkGeo = new THREE.TubeGeometry(curve, 24, 0.24, 8);
  const p = trunkGeo.attributes.position, uv = trunkGeo.attributes.uv;
  const c = new THREE.Vector3(), off = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const t = uv.getX(i);
    curve.getPoint(t, c);
    off.set(p.getX(i), p.getY(i), p.getZ(i)).sub(c).multiplyScalar(1.25 - t * 0.55);
    p.setXYZ(i, c.x + off.x, c.y + off.y, c.z + off.z);
    uv.setXY(i, uv.getY(i), t * height * 0.6);
  }
  trunkGeo.computeVertexNormals();
  g.add(mesh(trunkGeo, mat('#8a7458', { map: tex('bark') })));

  const crown = new THREE.Group();
  crown.position.copy(curve.getPoint(1));
  const frondMat = mat('#6f9a4a', { map: tex('frond'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.8 });
  const n = 12;
  for (let i = 0; i < n; i++) {
    const len = 3.6 + r() * 1.2;
    const geo = new THREE.PlaneGeometry(2.2, len, 4, 12);
    const fp = geo.attributes.position;
    const droop = 0.9 + r() * 0.9;
    for (let k = 0; k < fp.count; k++) {
      const x = fp.getX(k);
      const t = (fp.getY(k) + len / 2) / len;
      // Lay the frond out along +z, arch it, and fold the leaflets into a V.
      fp.setXYZ(k, x, t * len * 0.45 - t * t * len * droop * 0.55 - Math.abs(x) * 0.35, t * len);
    }
    geo.computeVertexNormals();
    const f = new THREE.Mesh(geo, frondMat);
    f.rotation.y = (i / n) * Math.PI * 2 + r() * 0.4;
    f.rotation.x = -0.15 + r() * 0.25;
    f.userData.noShadow = false;
    crown.add(f);
  }
  for (let i = 0; i < 4; i++) crown.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), mat('#4a3520', { roughness: 0.7 }), { x: Math.cos(i * 1.7) * 0.28, y: -0.32, z: Math.sin(i * 1.7) * 0.28 }));
  g.add(crown);
  g.rotation.y = dir;
  g.userData.crown = crown;
  g.userData.phase = r() * 10;
  return g;
}

// A spruce: many jagged tiers, darker inside, optionally carrying snow.
export function pine(r, height = 7, snowy = true) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.26, height * 0.5, 7), mat('#4a3a2c', { map: tex('bark', 1, 3) }), { y: height * 0.25 }));
  const tiers = 7;
  const needle = mat('#ffffff', { vertexColors: true, roughness: 0.95 });
  const snowMat = mat('#f4f7fb', { map: tex('snow'), roughness: 0.8 });
  const tint = new THREE.Color();
  for (let i = 0; i < tiers; i++) {
    const k = i / (tiers - 1);
    const rad = (1 - k * 0.82) * height * 0.24;
    const h = height * (0.26 - k * 0.08);
    const y = height * 0.18 + k * height * 0.68;
    const geo = new THREE.ConeGeometry(rad, h, 14, 2, true);
    const p = geo.attributes.position;
    const colors = [];
    for (let v = 0; v < p.count; v++) {
      const py = p.getY(v);
      if (py < -h / 2 + 0.01) {
        const f = 0.75 + r() * 0.45;
        p.setX(v, p.getX(v) * f);
        p.setZ(v, p.getZ(v) * f);
        p.setY(v, py - r() * h * 0.25);
      }
      tint.set('#1f3d2c').lerp(new THREE.Color('#3b5e41'), (py / h + 0.5) * 0.6 + r() * 0.25);
      colors.push(tint.r, tint.g, tint.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    g.add(mesh(geo, needle, { y: y + h / 2, ry: r() * 6 }));
    if (snowy) {
      const sg = new THREE.ConeGeometry(rad * 0.82, h * 0.5, 14, 1, true);
      const sp = sg.attributes.position;
      for (let v = 0; v < sp.count; v++) if (sp.getY(v) < 0) { const f = 0.7 + r() * 0.35; sp.setX(v, sp.getX(v) * f); sp.setZ(v, sp.getZ(v) * f); }
      sg.computeVertexNormals();
      g.add(mesh(sg, snowMat, { y: y + h * 0.78, ry: r() * 6 }));
    }
  }
  return g;
}

// A broadleaf tree: a trunk with boughs and a canopy of smooth, overlapping
// leaf masses, lighter on top and darker underneath and inside.
export function leafyTree(r, height = 7, hue = '#56804a') {
  const g = new THREE.Group();
  const barkMat = mat('#4a3b2e', { roughness: 1 });
  g.add(mesh(new THREE.CylinderGeometry(0.14, 0.32, height * 0.55, 10), barkMat, { y: height * 0.27 }));
  const n = valueNoise(Math.floor(r() * 1000));
  const base = new THREE.Color(hue);
  const dark = base.clone().multiplyScalar(0.45);
  const light = base.clone().lerp(new THREE.Color('#dfe88f'), 0.5);
  const leaves = mat('#ffffff', { vertexColors: true, map: tex('leaves', 3, 3), roughness: 0.9 });
  const blobs = 11;
  const crownY = height * 0.74, crownR = height * 0.3;
  const v = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < blobs; i++) {
    const a = r() * Math.PI * 2, el = (r() - 0.35) * 1.4, d = i ? crownR * (0.45 + r() * 0.55) : 0;
    const cx = Math.cos(a) * Math.cos(el) * d, cy = Math.sin(el) * d * 0.7, cz = Math.sin(a) * Math.cos(el) * d;
    const rad = crownR * (0.5 + r() * 0.3);
    let geo = new THREE.IcosahedronGeometry(rad, 4);
    geo.deleteAttribute('normal');
    geo.deleteAttribute('uv');
    geo = mergeVertices(geo, 1e-3);
    const p = geo.attributes.position;
    const colors = [], uvs = [];
    for (let k = 0; k < p.count; k++) {
      v.set(p.getX(k), p.getY(k), p.getZ(k));
      const bump = 1 + (fbm(n, v.x * 2.2 + i * 7, v.y * 2.2 + v.z * 1.7, 4) - 0.5) * 0.7;
      v.multiplyScalar(bump);
      v.y *= 0.82;
      p.setXYZ(k, v.x, v.y, v.z);
      // Shade by height within the whole crown and by distance from its core.
      const up = THREE.MathUtils.clamp((cy + v.y) / crownR * 0.5 + 0.5, 0, 1);
      const out = THREE.MathUtils.clamp(Math.hypot(cx + v.x, cy + v.y, cz + v.z) / crownR, 0, 1);
      col.copy(dark).lerp(base, out * 0.9).lerp(light, up * up * 0.75).multiplyScalar(0.85 + r() * 0.3);
      colors.push(col.r, col.g, col.b);
      uvs.push((v.x + v.z) / rad, v.y / rad);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    g.add(mesh(geo.toNonIndexed(), leaves, { x: cx, y: crownY + cy, z: cz }));
    if (i && i < 5) {
      // A bough reaching into this leaf mass.
      const from = new THREE.Vector3(0, height * 0.5, 0), to = new THREE.Vector3(cx, crownY + cy - rad * 0.3, cz);
      const len = from.distanceTo(to);
      const bough = mesh(new THREE.CylinderGeometry(0.05, 0.11, len, 6), barkMat);
      bough.position.copy(from).lerp(to, 0.5);
      bough.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
      g.add(bough);
    }
  }
  return g;
}

export function book(color, w = 1.2, h = 0.22, d = 0.9) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(color)));
  g.add(mesh(new THREE.BoxGeometry(w * 0.96, h * 0.8, d * 0.9), mat('#f4efe2'), { x: 0.03 }));
  return g;
}

// A triangular gable roof: width across the ridge, depth along it.
export function gableRoof(width, height, depth, material) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return mesh(geo, typeof material === 'string' ? mat(material) : material);
}

// A pitched roof made of two sloped slabs, so textures run down the slope.
export function pitchedRoof(width, rise, depth, material, thickness = 0.18) {
  const g = new THREE.Group();
  const slope = Math.hypot(width / 2, rise);
  const angle = Math.atan2(rise, width / 2);
  for (const side of [-1, 1]) {
    const slab = mesh(new THREE.BoxGeometry(slope + 0.35, thickness, depth), material, { x: (side * width) / 4, y: rise / 2, rz: -side * angle });
    g.add(slab);
  }
  return g;
}
