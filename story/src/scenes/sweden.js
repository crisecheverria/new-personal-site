import * as THREE from 'three';
import { rng, mat, mesh, tex, terrain, valueNoise, fbm, pine, pitchedRoof, glowSprite, bake, shadows } from './common.js';

// Göteborg in winter: Falu-red wooden houses, spruce, a frozen canal, warm
// windows, falling snow and the northern lights.
export function buildSweden() {
  const r = rng(41);
  const group = new THREE.Group();
  const n = valueNoise(43);

  const canalZ = 4;
  const height = (x, z) => {
    const drift = (fbm(n, x * 0.05, z * 0.05, 4) - 0.5) * 1.6;
    const canal = Math.max(0, 1 - Math.abs(z - canalZ - x * 0.05) / 2.2);
    return drift * Math.min(1, Math.hypot(x, z) / 18) - canal * 0.9;
  };
  const ground = terrain(420, 160, height, mat('#ffffff', { map: tex('snow', 30), roughness: 0.75 }));
  group.add(ground);

  // The frozen canal and a small bridge.
  const ice = new THREE.MeshPhysicalMaterial({ color: '#9fb9cc', roughness: 0.12, metalness: 0, envMapIntensity: 1.2 });
  const iceMesh = mesh(new THREE.PlaneGeometry(200, 3.6), ice, { y: -0.75, z: canalZ, rx: -Math.PI / 2, rz: -0.05 });
  group.add(iceMesh);
  const bridgeWood = mat('#5d4532', { map: tex('planks', 3, 1) });
  const bridge = new THREE.Group();
  bridge.add(mesh(new THREE.BoxGeometry(2.6, 0.2, 5), bridgeWood, { y: 0.2 }));
  bridge.add(mesh(new THREE.BoxGeometry(2.6, 0.08, 5), mat('#f1f4f8', { map: tex('snow', 1) }), { y: 0.34 }));
  for (const sx of [-1.25, 1.25]) {
    bridge.add(mesh(new THREE.BoxGeometry(0.1, 0.1, 5), bridgeWood, { x: sx, y: 1.1 }));
    for (let k = 0; k < 6; k++) bridge.add(mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), bridgeWood, { x: sx, y: 0.65, z: -2.4 + k * 0.96 }));
  }
  bridge.position.set(-4, 0, canalZ - 0.2);
  bridge.rotation.y = 0.05;
  group.add(bridge);

  // Houses.
  const siding = (c) => mat(c, { map: tex('siding', 3, 3) });
  const trim = mat('#f3f1ea');
  const roofMat = mat('#2e3238', { map: tex('siding', 1, 4), roughness: 0.7 });
  const roofSnow = mat('#f4f7fb', { map: tex('snow', 2), roughness: 0.7 });
  const warm = mat('#ffd38a', { emissive: '#ffae4a', emissiveIntensity: 1.6 });
  const door = mat('#3a2a20', { map: tex('planks', 1, 1) });
  const houses = [
    { x: -9, z: -5, w: 5, d: 4, h: 3.2, ry: 0.2, c: '#8b2a20' },
    { x: -1, z: -8.5, w: 6, d: 4.4, h: 3.8, ry: -0.05, c: '#962f24' },
    { x: 7.5, z: -5, w: 4.6, d: 4, h: 3.1, ry: -0.3, c: '#c99a3f' },
    { x: 10.5, z: 11, w: 4.2, d: 3.8, h: 3, ry: -0.6, c: '#8b2a20' },
    { x: -13, z: 11.5, w: 4, d: 3.4, h: 2.9, ry: 0.65, c: '#3f5d78' },
    { x: 3, z: -16, w: 5.5, d: 4.2, h: 3.5, ry: 0.1, c: '#e8e3d6' },
  ];
  const glows = [];
  for (const hs of houses) {
    const g = new THREE.Group();
    const walls = siding(hs.c);
    g.add(mesh(new THREE.BoxGeometry(hs.w, hs.h, hs.d), walls, { y: hs.h / 2 }));
    g.add(mesh(new THREE.BoxGeometry(hs.w + 0.1, 0.4, hs.d + 0.1), mat('#4b4f55', { map: tex('plaster', 2, 1) }), { y: 0.2 }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.18, hs.h, 0.18), trim, { x: (sx * hs.w) / 2, y: hs.h / 2, z: (sz * hs.d) / 2 }));
    const rise = hs.w * 0.42;
    const roof = pitchedRoof(hs.w + 0.8, rise, hs.d + 0.7, roofMat, 0.16);
    roof.position.y = hs.h;
    g.add(roof);
    const snowRoof = pitchedRoof(hs.w + 0.85, rise, hs.d + 0.72, roofSnow, 0.2);
    snowRoof.position.y = hs.h + 0.16;
    g.add(snowRoof);
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape([new THREE.Vector2(-hs.w / 2, 0), new THREE.Vector2(hs.w / 2, 0), new THREE.Vector2(0, rise)]);
      g.add(mesh(new THREE.ShapeGeometry(shape), walls, { y: hs.h, z: (side * hs.d) / 2, ry: side < 0 ? Math.PI : 0 }));
    }
    g.add(mesh(new THREE.BoxGeometry(0.55, 1.6, 0.55), mat('#6b4a3c', { map: tex('plaster', 1, 1) }), { x: hs.w * 0.22, y: hs.h + rise * 0.7, z: -0.5 }));
    // Lit windows with white frames, and a door.
    for (const wx of [-hs.w / 3.4, hs.w / 3.4]) {
      g.add(mesh(new THREE.BoxGeometry(1.1, 1.15, 0.08), trim, { x: wx, y: hs.h * 0.55, z: hs.d / 2 + 0.02 }));
      g.add(mesh(new THREE.BoxGeometry(0.85, 0.9, 0.1), warm, { x: wx, y: hs.h * 0.55, z: hs.d / 2 + 0.03 }));
      g.add(mesh(new THREE.BoxGeometry(0.05, 0.9, 0.12), trim, { x: wx, y: hs.h * 0.55, z: hs.d / 2 + 0.04 }));
      g.add(mesh(new THREE.BoxGeometry(0.85, 0.05, 0.12), trim, { x: wx, y: hs.h * 0.55, z: hs.d / 2 + 0.04 }));
    }
    g.add(mesh(new THREE.BoxGeometry(0.85, 1.8, 0.08), door, { y: 0.9, z: hs.d / 2 + 0.03 }));
    g.position.set(hs.x, height(hs.x, hs.z), hs.z);
    g.rotation.y = hs.ry;
    group.add(g);
    // Warm light spilling onto the snow.
    const front = new THREE.Vector3(0, 1.4, hs.d / 2 + 1.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), hs.ry).add(g.position);
    const l = new THREE.PointLight('#ffb15c', 9, 9, 2);
    l.position.copy(front);
    group.add(l);
    const halo = glowSprite('#ffb15c', 4, 0.25);
    halo.position.copy(front).setY(front.y + 0.4);
    group.add(halo);
    glows.push(l);
  }

  // Spruce all around.
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2, d = 15 + r() * 24;
    const x = Math.cos(a) * d, z = Math.sin(a) * d * 0.8 - 6;
    if (Math.abs(z - canalZ) < 3.5 || z > 22) continue;
    const p = pine(r, 6 + r() * 6);
    p.position.set(x, height(x, z) - 0.1, z);
    group.add(p);
  }

  // Street lamps along the canal.
  const iron = mat('#24262a', { metalness: 0.6, roughness: 0.45 });
  for (const x of [-14, -2, 10]) {
    const z = canalZ - 3;
    group.add(mesh(new THREE.CylinderGeometry(0.07, 0.1, 4.2, 8), iron, { x, y: 2.1, z }));
    group.add(mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), mat('#fff0cc', { emissive: '#ffcf80', emissiveIntensity: 2 }), { x, y: 4.3, z }));
    const l = new THREE.PointLight('#ffc977', 12, 11, 2);
    l.position.set(x, 4.1, z);
    group.add(l);
    const halo = glowSprite('#ffcf80', 3.2, 0.5);
    halo.position.set(x, 4.3, z);
    group.add(halo);
  }

  // Falling snow, animated on the GPU.
  const SNOW = 1600;
  const snowPos = new Float32Array(SNOW * 3);
  const snowSpeed = new Float32Array(SNOW);
  for (let i = 0; i < SNOW; i++) {
    snowPos[i * 3] = (r() - 0.5) * 70;
    snowPos[i * 3 + 1] = r() * 30;
    snowPos[i * 3 + 2] = (r() - 0.5) * 70;
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
        gl_FragColor = vec4(1.0, 1.0, 1.0, 0.75 * (1.0 - d * 1.6));
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
      void main(){ vUv = uv; vec3 p = position; p.z += sin(p.x*0.05 + uTime*0.2)*8.0 + sin(p.x*0.13 - uTime*0.3)*2.0;
      gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime; uniform float uOpacity;
      void main(){
        float bands = 0.5 + 0.5*sin(vUv.x*46.0 + uTime*0.6 + sin(vUv.x*7.0 - uTime*0.25)*3.0);
        float fade = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.3, 1.0, vUv.y));
        float edge = smoothstep(0.0, 0.35, vUv.x) * (1.0 - smoothstep(0.65, 1.0, vUv.x));
        vec3 col = mix(vec3(0.2,0.95,0.6), vec3(0.45,0.35,0.95), smoothstep(0.4, 1.0, vUv.y));
        gl_FragColor = vec4(col * (0.35 + bands * 0.65) * fade * edge * uOpacity * 0.3, 1.0);
      }`,
  });
  for (let i = 0; i < 3; i++) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(260, 44, 160, 1), auroraMat);
    a.position.set(-20 + i * 30, 30 + i * 7, -210 - i * 25);
    a.rotation.y = -0.2 + i * 0.15;
    a.userData.keep = true;
    group.add(a);
  }

  shadows(group);
  ground.castShadow = false;
  iceMesh.castShadow = false;
  bake(group);

  function update(t, dt, info) {
    snowMat.uniforms.uTime.value = t;
    snowMat.uniforms.uScale.value = info.pixelH / 900;
    auroraMat.uniforms.uTime.value = t;
    auroraMat.uniforms.uOpacity.value = info.palette.aurora;
    for (const l of glows) l.intensity = 8.5 + Math.sin(t * 5 + l.position.x) * 0.4;
  }

  return { group, update };
}
