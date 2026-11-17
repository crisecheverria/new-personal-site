import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!opts.noCache && matCache.has(key)) return matCache.get(key);
  const { noCache, ...rest } = opts;
  const m = new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1, metalness: 0, ...rest });
  if (!noCache) matCache.set(key, m);
  return m;
}

export function mesh(geo, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  if (s !== undefined) Array.isArray(s) ? m.scale.set(...s) : m.scale.setScalar(s);
  return m;
}

// A clean round tile for each scene: a coloured top on a plinth.
export function island(radius, topColor, rockColor) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(radius, radius, 0.4, 72), mat(topColor), { y: -0.2 }));
  g.add(mesh(new THREE.CylinderGeometry(radius * 0.995, radius * 0.97, 2.4, 72), mat(rockColor), { y: -1.6 }));
  return g;
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
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    geo.clearGroups();
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { material: o.material, geos: [] });
    buckets.get(key).geos.push(geo);
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  for (const { material, geos } of buckets.values()) group.add(new THREE.Mesh(mergeGeometries(geos, false), material));
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

// ── Reusable props ──────────────────────────────────────────────────────────

export function palm(r, height = 6) {
  const g = new THREE.Group();
  const lean = 0.6 + r() * 1.4;
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.2, height * 0.5, 0),
    new THREE.Vector3(lean, height, 0)
  );
  g.add(mesh(new THREE.TubeGeometry(curve, 8, 0.2, 6), mat('#8b6a45')));
  const crown = new THREE.Group();
  crown.position.copy(curve.getPoint(1));
  const leaves = 7;
  for (let i = 0; i < leaves; i++) {
    const geo = new THREE.BoxGeometry(0.75, 0.06, 3.4, 1, 1, 5);
    const p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const z = p.getZ(k) + 1.7;
      const t = z / 3.4;
      p.setZ(k, z);
      p.setY(k, p.getY(k) + t * 0.9 - t * t * 2.2);
      p.setX(k, p.getX(k) * (1 - t * 0.75));
    }
    geo.computeVertexNormals();
    const leaf = mesh(geo, mat(i % 2 ? '#3f8a3a' : '#4fa04a'));
    leaf.rotation.y = (i / leaves) * Math.PI * 2 + r() * 0.3;
    crown.add(leaf);
  }
  for (let i = 0; i < 3; i++) {
    crown.add(mesh(new THREE.IcosahedronGeometry(0.22, 0), mat('#5a3d22'), { x: Math.cos(i * 2.1) * 0.25, y: -0.25, z: Math.sin(i * 2.1) * 0.25 }));
  }
  g.add(crown);
  g.userData.crown = crown;
  g.userData.phase = r() * 10;
  return g;
}

export function pine(r, height = 5, snowy = true) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.22, height * 0.3, 5), mat('#5b4232'), { y: height * 0.15 }));
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const rad = (1.35 - i * 0.33) * (height / 5);
    const h = (1.9 - i * 0.25) * (height / 5);
    const y = height * 0.25 + i * h * 0.62;
    g.add(mesh(new THREE.ConeGeometry(rad, h, 7), mat(i % 2 ? '#24533f' : '#1d4836'), { y: y + h / 2, ry: r() }));
    if (snowy) g.add(mesh(new THREE.ConeGeometry(rad * 0.55, h * 0.42, 7), mat('#f3f7fb'), { y: y + h * 0.79, ry: r() }));
  }
  return g;
}

export function roundTree(r, height = 4, color = '#5c9e4a') {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.16, 0.24, height * 0.5, 5), mat('#6b4a32'), { y: height * 0.25 }));
  const c = mesh(new THREE.IcosahedronGeometry(height * 0.38, 0), mat(color), { y: height * 0.7, ry: r() * 3 });
  c.scale.y = 1.1;
  g.add(c);
  return g;
}

export function person(shirt, skin = '#8d5a3b', seated = false) {
  const g = new THREE.Group();
  const bodyH = seated ? 0.7 : 1.0;
  g.add(mesh(new THREE.CapsuleGeometry(0.32, bodyH, 3, 8), mat(shirt), { y: bodyH / 2 + 0.32 }));
  g.add(mesh(new THREE.IcosahedronGeometry(0.3, 1), mat(skin), { y: bodyH + 0.95 }));
  return g;
}

export function gradCap() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.6, 0.08, 1.6), mat('#1c1f2b'), { y: 0.42 }));
  g.add(mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.45, 12), mat('#1c1f2b'), { y: 0.18 }));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 4), mat('#f2c14e'), { x: 0.7, y: 0.15, z: 0.7 }));
  g.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), mat('#f2c14e'), { y: 0.48 }));
  return g;
}

export function book(color, w = 1.2, h = 0.22, d = 0.9) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(w, h, d), mat(color)));
  g.add(mesh(new THREE.BoxGeometry(w * 0.96, h * 0.8, d * 0.9), mat('#f4efe2'), { x: 0.03 }));
  return g;
}

// A triangular gable roof: width across the ridge, depth along it.
export function gableRoof(width, height, depth, color) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  return mesh(geo, mat(color));
}

export function shadows(object, cast = true, receive = true) {
  object.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
}
