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
  kaukira: { lat: 15.33, lon: -83.6, label: 'Kaukira, Honduras', color: '#ffb36b' },
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

function arc(from, to, color) {
  const a = latLon(from.lat, from.lon, 1);
  const b = latLon(to.lat, to.lon, 1);
  const angle = a.angleTo(b);
  const pts = [];
  const n = 80;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const v = new THREE.Vector3().copy(a).lerp(b, t).normalize();
    // Proper slerp so long arcs keep their shape.
    const s = Math.sin(angle);
    v.copy(a).multiplyScalar(Math.sin((1 - t) * angle) / s).add(b.clone().multiplyScalar(Math.sin(t * angle) / s));
    v.multiplyScalar(GLOBE_RADIUS + 0.15 + Math.sin(Math.PI * t) * angle * 3.2);
    pts.push(v);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tubular = 160, radial = 6;
  const geo = new THREE.TubeGeometry(curve, tubular, 0.09, radial, false);
  geo.setDrawRange(0, 0);
  const tube = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, fog: true }));
  const pulse = glowSprite(color, 2.4, 0);
  return {
    tube,
    pulse,
    curve,
    set(progress, t) {
      const p = THREE.MathUtils.clamp(progress, 0, 1);
      geo.setDrawRange(0, Math.floor(p * tubular) * radial * 6);
      if (p >= 1) {
        pulse.material.opacity = 1;
        pulse.position.copy(curve.getPoint((t * 0.35) % 1));
      } else if (p > 0) {
        pulse.material.opacity = 1;
        pulse.position.copy(curve.getPoint(p));
      } else {
        pulse.material.opacity = 0;
      }
    },
  };
}

// A dotted globe with the trips that shaped the story.
export function buildGlobe() {
  const group = new THREE.Group();

  group.add(new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS - 0.08, 64, 48), new THREE.MeshBasicMaterial({ color: '#0b1630', fog: true })));

  // Land as dots.
  const isLand = landMask(1024, 512);
  const N = 26000;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const positions = [];
  const colors = [];
  const c1 = new THREE.Color('#5d8fd6');
  const c2 = new THREE.Color('#9fd4ff');
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const theta = golden * i;
    const rr = Math.sqrt(1 - y * y);
    const x = Math.cos(theta) * rr, z = Math.sin(theta) * rr;
    const lat = Math.asin(y) / DEG;
    let lon = Math.atan2(z, -x) / DEG - 180;
    if (lon < -180) lon += 360;
    if (!isLand(lat, lon)) continue;
    const v = latLon(lat, lon, GLOBE_RADIUS);
    positions.push(v.x, v.y, v.z);
    const c = c1.clone().lerp(c2, (lat + 60) / 150);
    colors.push(c.r, c.g, c.b);
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  dotGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const dotTex = new THREE.CanvasTexture((() => {
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(16, 16, 14, 0, Math.PI * 2);
    x.fill();
    return c;
  })());
  group.add(new THREE.Points(dotGeo, new THREE.PointsMaterial({ size: 0.2, map: dotTex, vertexColors: true, transparent: true, alphaTest: 0.5, fog: true })));

  // Atmosphere rim.
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.12, 64, 48),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: { uOpacity: { value: 1 } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; uniform float uOpacity;
        void main(){ float f = pow(clamp(0.62 + dot(vN, vV), 0.0, 1.0), 3.0); gl_FragColor = vec4(0.35,0.62,1.0,1.0) * f * 0.9 * uOpacity; }`,
    })
  );
  group.add(atmo);

  // Pins.
  const pins = {};
  for (const [key, p] of Object.entries(PLACES)) {
    const pos = latLon(p.lat, p.lon, GLOBE_RADIUS + 0.12);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: p.color, fog: true }));
    pin.position.copy(pos);
    const halo = glowSprite(p.color, 2.2, 0.9);
    halo.position.copy(pos);
    group.add(pin, halo);
    pins[key] = { ...p, local: pos, mesh: pin, halo };
  }

  const toUS = arc(PLACES.kaukira, PLACES.usa, '#7fd1ff');
  const toSweden = arc(PLACES.kaukira, PLACES.goteborg, '#8ff0c4');
  for (const a of [toUS, toSweden]) group.add(a.tube, a.pulse);

  function update(t, dt, info) {
    const { f, idx } = info;
    const k = (name, start, len) => (f - (idx[name] + start)) / len;
    toUS.set(k('remote', -0.55, 0.6), t);
    toSweden.set(k('move', -0.55, 0.65), t);
    for (const p of Object.values(pins)) p.halo.scale.setScalar(2 + Math.sin(t * 3 + p.lat) * 0.35);
  }

  return { group, update, radius: 40, pins };
}
