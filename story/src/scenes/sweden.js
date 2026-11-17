import * as THREE from 'three';
import { rng, mat, mesh, island, pine, person, gableRoof, bake } from './common.js';

// Göteborg in winter: red wooden houses, pines, snow and the northern lights.
export function buildSweden() {
  const r = rng(41);
  const group = new THREE.Group();
  group.add(island(17, '#eef3f8', '#5d6b7a', 13));

  // Snow drifts.
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, d = 4 + r() * 11;
    const drift = mesh(new THREE.IcosahedronGeometry(0.8 + r() * 1.2, 0), mat('#f6f9fc'), { x: Math.cos(a) * d, y: -0.2, z: Math.sin(a) * d, ry: r() * 3 });
    drift.scale.y = 0.35;
    group.add(drift);
  }

  // A frozen canal with a little bridge.
  group.add(mesh(new THREE.BoxGeometry(30, 0.08, 2.6), mat('#a9cde6', { roughness: 0.15, metalness: 0.2 }), { y: 0.02, z: 3.2, ry: 0.08 }));
  const bridge = new THREE.Group();
  bridge.add(mesh(new THREE.BoxGeometry(2.4, 0.2, 3.6), mat('#6b4d34'), { y: 0.45 }));
  for (const sx of [-1, 1]) {
    bridge.add(mesh(new THREE.BoxGeometry(0.1, 0.6, 3.6), mat('#3a2b20'), { x: sx * 1.15, y: 0.85 }));
    bridge.add(mesh(new THREE.BoxGeometry(2.4, 0.08, 3.6), mat('#f6f9fc'), { y: 0.58 }));
  }
  bridge.position.set(-3, 0, 3.4);
  bridge.rotation.y = 0.08;
  group.add(bridge);

  // Falu-red houses with white trims and warm windows.
  const windowMat = mat('#ffd27a', { emissive: '#ffb84a', emissiveIntensity: 1.4 });
  const houses = [
    { x: -6.5, z: -4, w: 4.2, d: 3.4, h: 2.8, ry: 0.2, c: '#8e2a22' },
    { x: 0, z: -6.5, w: 5, d: 3.6, h: 3.2, ry: -0.05, c: '#9a3127' },
    { x: 6.8, z: -3.5, w: 3.8, d: 3.2, h: 2.6, ry: -0.3, c: '#d9a441' },
    { x: 9, z: 7.5, w: 3.4, d: 3, h: 2.5, ry: -0.6, c: '#8e2a22' },
    { x: -10.5, z: 6.5, w: 3.2, d: 2.8, h: 2.4, ry: 0.7, c: '#3f5f7a' },
  ];
  const lights = [];
  for (const h of houses) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.BoxGeometry(h.w, h.h, h.d), mat(h.c), { y: h.h / 2 }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.16, h.h, 0.16), mat('#f4f1e8'), { x: (sx * h.w) / 2, y: h.h / 2, z: (sz * h.d) / 2 }));
    const roof = gableRoof(h.w + 0.7, 1.7, h.d + 0.5, '#2b2f36');
    roof.position.y = h.h;
    g.add(roof);
    const snow = gableRoof(h.w + 0.8, 1.75, h.d + 0.55, '#f6f9fc');
    snow.position.y = h.h + 0.12;
    snow.scale.set(0.98, 1, 0.98);
    g.add(snow);
    g.add(mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), mat('#6d3a2c'), { x: h.w / 4, y: h.h + 1.4, z: -0.4 }));
    for (const wx of [-h.w / 3.2, h.w / 3.2]) {
      g.add(mesh(new THREE.BoxGeometry(0.85, 0.85, 0.06), windowMat, { x: wx, y: h.h * 0.55, z: h.d / 2 + 0.02 }));
      g.add(mesh(new THREE.BoxGeometry(1.05, 1.05, 0.04), mat('#f4f1e8'), { x: wx, y: h.h * 0.55, z: h.d / 2 + 0.005 }));
    }
    g.add(mesh(new THREE.BoxGeometry(0.75, 1.5, 0.06), mat('#3a2b20'), { y: 0.75, z: h.d / 2 + 0.02 }));
    g.position.set(h.x, 0, h.z);
    g.rotation.y = h.ry;
    group.add(g);
    const l = new THREE.PointLight('#ffb84a', 6, 7, 2);
    l.position.set(h.x, 1.6, h.z + 2.5);
    group.add(l);
    lights.push(l);
  }

  // Pines.
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, d = 10 + r() * 5;
    const p = pine(r, 3.5 + r() * 3);
    p.position.set(Math.cos(a) * d, 0, Math.sin(a) * d * 0.85 - 1);
    if (Math.abs(p.position.z - 3.2) < 2.2) continue;
    group.add(p);
  }

  // A harbour crane for Göteborg.
  const crane = new THREE.Group();
  const cm = mat('#c9472f');
  for (const sx of [-1, 1]) crane.add(mesh(new THREE.BoxGeometry(0.4, 9, 0.4), cm, { x: sx * 1.4, y: 4.5 }));
  crane.add(mesh(new THREE.BoxGeometry(3.4, 0.5, 0.6), cm, { y: 9 }));
  crane.add(mesh(new THREE.BoxGeometry(1.6, 1.4, 1.4), mat('#e9e4da'), { y: 10 }));
  const boom = mesh(new THREE.BoxGeometry(9, 0.35, 0.35), cm, { x: 3.6, y: 10.6, rz: 0.12 });
  crane.add(boom);
  crane.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 4, 3), mat('#2b2b33'), { x: 7.5, y: 9, z: 0 }));
  crane.position.set(-12, 0, -9);
  crane.rotation.y = 0.7;
  group.add(crane);

  // Someone walking over the bridge.
  const walker = person('#2f5f8a', '#8d5a3b');
  walker.userData.dynamic = true;
  walker.add(mesh(new THREE.ConeGeometry(0.35, 0.4, 8), mat('#c9472f'), { y: 2.2 }));
  group.add(walker);

  // Falling snow, animated on the GPU.
  const SNOW = 1400;
  const snowPos = new Float32Array(SNOW * 3);
  const snowSpeed = new Float32Array(SNOW);
  for (let i = 0; i < SNOW; i++) {
    snowPos[i * 3] = (r() - 0.5) * 60;
    snowPos[i * 3 + 1] = r() * 30;
    snowPos[i * 3 + 2] = (r() - 0.5) * 60;
    snowSpeed[i] = 0.9 + r() * 1.8;
  }
  const snowGeo = new THREE.BufferGeometry();
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
  snowGeo.setAttribute('aSpeed', new THREE.BufferAttribute(snowSpeed, 1));
  const snowMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 } },
    vertexShader: `attribute float aSpeed; uniform float uTime; uniform float uScale;
      void main() {
        vec3 p = position;
        p.y = mod(p.y - uTime * aSpeed, 30.0);
        p.x += sin(uTime * 0.8 + position.z) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = 150.0 * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.8 * (1.0 - d * 1.6));
      }`,
  });
  const flakes = new THREE.Points(snowGeo, snowMat);
  flakes.frustumCulled = false;
  group.add(flakes);

  // Northern lights.
  const auroraMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: `varying vec2 vUv; uniform float uTime;
      void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x*0.06 + uTime*0.25)*6.0 + sin(p.x*0.17 - uTime*0.4)*1.5;
      gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uOpacity;
      void main(){
        float bands = 0.55 + 0.45*sin(vUv.x*38.0 + uTime*0.8 + sin(vUv.x*9.0 - uTime*0.3)*3.0);
        float fade = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
        float edge = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
        vec3 col = mix(vec3(0.15,1.0,0.55), vec3(0.55,0.35,1.0), smoothstep(0.35, 0.95, vUv.y));
        gl_FragColor = vec4(col * bands * bands * fade * edge * uOpacity * 0.3, 1.0);
      }`,
  });
  const auroras = [];
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(130, 26, 120, 1), auroraMat);
    a.position.set(-10 + i * 14, 34 + i * 5, -70 - i * 14);
    a.rotation.y = -0.2 + i * 0.15;
    group.add(a);
    auroras.push(a);
  }

  bake(group);

  function update(t, dt, info) {
    snowMat.uniforms.uTime.value = t;
    // Same apparent flake size on any screen.
    snowMat.uniforms.uScale.value = info.pixelH / 900;
    auroraMat.uniforms.uTime.value = t;
    auroraMat.uniforms.uOpacity.value = info.palette.aurora;
    const w = (t * 0.12) % 2;
    const s = w < 1 ? w : 2 - w;
    const dz = (s - 0.5) * 8;
    walker.position.set(-3 - Math.sin(0.08) * dz, Math.abs(dz) < 1.8 ? 0.55 : 0, 3.4 + dz);
    walker.rotation.y = w < 1 ? 0 : Math.PI;
    for (const l of lights) l.intensity = 5.5 + Math.sin(t * 7 + l.position.x) * 0.4;
  }

  return { group, update, radius: 40 };
}
