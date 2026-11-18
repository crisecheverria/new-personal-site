import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import land from 'world-atlas/land-110m.json';
import { glowSprite } from './common.js';

export const GLOBE_RADIUS = 12;
const DEG = Math.PI / 180;

export function latLon(lat, lon, radius = 1) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta));
}

export const PLACES = {
  sanPedroSula: { lat: 15.5, lon: -88.03, label: 'San Pedro Sula, Honduras', color: '#ffb36b' },
  usa: { lat: 36.2, lon: -86.8, label: 'US clients', color: '#7fd1ff' },
  goteborg: { lat: 57.71, lon: 11.97, label: 'Göteborg, Sweden', color: '#8ff0c4' },
};

function landMask(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const projection = geoEquirectangular().scale(width / (2 * Math.PI)).translate([width / 2, height / 2]);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  geoPath(projection, ctx)(feature(land, land.objects.land));
  ctx.fill();
  const data = ctx.getImageData(0, 0, width, height).data;
  return (lat, lon) => {
    const x = Math.min(width - 1, Math.floor(((lon + 180) / 360) * width));
    const y = Math.min(height - 1, Math.floor(((90 - lat) / 180) * height));
    return data[(y * width + x) * 4 + 3] > 128;
  };
}

const SUN = new THREE.Vector3(-0.55, 0.45, 0.7).normalize(); // where the globe's daylight comes from

function arc(from, to, color) {
  const a = latLon(from.lat, from.lon, 1);
  const b = latLon(to.lat, to.lon, 1);
  const angle = a.angleTo(b);
  const pts = [];
  const n = 80;
  const s = Math.sin(angle);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // Slerp along the great circle, lifted off the surface in the middle.
    const v = a.clone().multiplyScalar(Math.sin((1 - t) * angle) / s).add(b.clone().multiplyScalar(Math.sin(t * angle) / s));
    v.multiplyScalar(GLOBE_RADIUS + 0.12 + Math.sin(Math.PI * t) * angle * 2.6);
    pts.push(v);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tubular = 200, radial = 6;
  const core = new THREE.TubeGeometry(curve, tubular, 0.055, radial, false);
  const halo = new THREE.TubeGeometry(curve, tubular, 0.2, radial, false);
  core.setDrawRange(0, 0);
  halo.setDrawRange(0, 0);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, fog: true })));
  group.add(new THREE.Mesh(halo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, fog: true })));
  const pulse = glowSprite(color, 1.5, 0);
  group.add(pulse);
  return {
    group,
    set(progress, t) {
      const p = THREE.MathUtils.clamp(progress, 0, 1);
      const count = Math.floor(p * tubular) * radial * 6;
      core.setDrawRange(0, count);
      halo.setDrawRange(0, count);
      pulse.material.opacity = p > 0 ? 1 : 0;
      // While drawing, the light leads the line; afterwards it keeps travelling.
      if (p > 0) pulse.position.copy(curve.getPoint(p >= 1 ? (t * 0.3) % 1 : p));
    },
  };
}

// The Earth as a data globe: a softly lit ocean, continents as fine dots
// (brighter on the day side), a faint grid, an atmosphere, and the journeys.
export function buildGlobe() {
  const group = new THREE.Group();
  const R = GLOBE_RADIUS;
  const fade = { value: 1 }; // lets the whole globe dissolve into the haze between chapters

  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(R - 0.06, 96, 64),
    new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uFade: fade,
        uSun: { value: SUN },
        uNight: { value: new THREE.Color('#050912') },
        uDay: { value: new THREE.Color('#0d2550') },
        uRim: { value: new THREE.Color('#4f8dff') },
      },
      vertexShader: `varying vec3 vWorldN; varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          vWorldN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vWorldN; varying vec3 vN; varying vec3 vV;
        uniform float uFade; uniform vec3 uSun; uniform vec3 uNight; uniform vec3 uDay; uniform vec3 uRim;
        void main(){
          float day = smoothstep(-0.25, 0.85, dot(vWorldN, uSun));
          float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
          vec3 col = mix(uNight, uDay, day) + uRim * rim * (0.12 + 0.3 * day);
          gl_FragColor = vec4(col, uFade);
        }`,
    })
  );
  group.add(ocean);

  // A faint grid of parallels and meridians.
  const grid = [];
  const ring = (fn) => { for (let i = 0; i < 120; i++) grid.push(...fn((i / 120) * 360).toArray(), ...fn(((i + 1) / 120) * 360).toArray()); };
  for (let lat = -60; lat <= 60; lat += 30) ring((d) => latLon(lat, d - 180, R + 0.01));
  for (let lon = -180; lon < 180; lon += 30) ring((d) => latLon(d / 2 - 90, lon, R + 0.01));
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute('position', new THREE.Float32BufferAttribute(grid, 3));
  group.add(new THREE.LineSegments(gridGeo, new THREE.LineBasicMaterial({ color: '#6f9bff', transparent: true, opacity: 0.1, fog: true })));

  // Land as dots, evenly spread, lit by the same sun as the ocean.
  const isLand = landMask(2048, 1024);
  const N = 52000;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const positions = [], colors = [];
  const night = new THREE.Color('#5d8fe0'), dayCol = new THREE.Color('#ffffff'), c = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const theta = golden * i;
    const rr = Math.sqrt(1 - y * y);
    const x = Math.cos(theta) * rr, z = Math.sin(theta) * rr;
    const lat = Math.asin(y) / DEG;
    let lon = Math.atan2(z, -x) / DEG - 180;
    if (lon < -180) lon += 360;
    if (!isLand(lat, lon)) continue;
    const v = latLon(lat, lon, 1);
    const lit = THREE.MathUtils.smoothstep(v.dot(SUN), -0.3, 0.8);
    c.copy(night).lerp(dayCol, lit).multiplyScalar(0.7 + lit * 1.1);
    positions.push(v.x * R, v.y * R, v.z * R);
    colors.push(c.r, c.g, c.b);
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  dotGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const dotCanvas = document.createElement('canvas');
  dotCanvas.width = dotCanvas.height = 32;
  const dctx = dotCanvas.getContext('2d');
  dctx.fillStyle = '#fff';
  dctx.beginPath();
  dctx.arc(16, 16, 14, 0, Math.PI * 2);
  dctx.fill();
  group.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({ size: 0.19, map: new THREE.CanvasTexture(dotCanvas), vertexColors: true, transparent: true, alphaTest: 0.5, fog: true })));

  // Atmosphere: a soft halo around the limb, stronger on the day side.
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.16, 96, 64),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uFade: fade, uSun: { value: SUN } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec3 vWorldN;
        void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
          vWorldN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; varying vec3 vWorldN; uniform float uFade; uniform vec3 uSun;
        void main(){
          // Zero at the outer edge, strongest right at the globe's limb.
          float f = pow(clamp(-dot(vN, vV) / 0.507, 0.0, 1.0), 4.0);
          float day = 0.35 + 0.65 * smoothstep(-0.4, 0.7, dot(vWorldN, uSun));
          gl_FragColor = vec4(vec3(0.3, 0.55, 1.0) * f * day * 0.6 * uFade, 1.0);
        }`,
    })
  );
  group.add(atmo);

  // Places: a bright point with a small halo and a ring that pulses outward.
  const pins = {};
  const rings = [];
  for (const [key, p] of Object.entries(PLACES)) {
    const pos = latLon(p.lat, p.lon, R + 0.1);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: true }));
    pin.position.copy(pos);
    const halo = glowSprite(p.color, 1.3, 0.9);
    halo.position.copy(pos);
    const ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: true }));
    ringMesh.position.copy(pos);
    ringMesh.lookAt(pos.clone().multiplyScalar(2));
    ringMesh.userData.phase = rings.length * 0.37;
    rings.push(ringMesh);
    group.add(pin, halo, ringMesh);
    pins[key] = { ...p, local: pos };
  }

  const toUS = arc(PLACES.sanPedroSula, PLACES.usa, '#7fd1ff');
  const toSweden = arc(PLACES.sanPedroSula, PLACES.goteborg, '#8ff0c4');
  group.add(toUS.group, toSweden.group);

  function update(t, dt, info) {
    const { f, idx } = info;
    // Dissolve near the ends of the globe's two chapters.
    fade.value = THREE.MathUtils.clamp(Math.min(f - (idx.remote - 0.5), idx.move + 0.5 - f) / 0.2, 0, 1);
    toUS.set((f - (idx.remote - 0.4)) / 0.4, t);
    toSweden.set((f - (idx.move - 0.45)) / 0.45, t);
    for (const ring of rings) {
      const k = (t * 0.45 + ring.userData.phase) % 1;
      ring.scale.setScalar(0.25 + k * 1.1);
      ring.material.opacity = (1 - k) * 0.7 * fade.value;
    }
  }

  return { group, update, pins };
}
