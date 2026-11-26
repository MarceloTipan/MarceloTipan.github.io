// Hero: a field of points that rises and parts around the cursor or finger,
// a nod to the motion tracking behind my thesis and the webcam game.
// When nobody is pointing, a slow "ghost" hand drifts through the field.

import * as THREE from "three";

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uStrength;
  uniform float uSize;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vGlow;
  varying float vFade;

  void main() {
    vec3 p = position;

    // Slow swell across the field.
    p.z += sin(p.x * 0.32 + uTime * 0.55) * 0.32
         + cos(p.y * 0.41 - uTime * 0.38) * 0.28
         + sin((p.x + p.y) * 0.9 + uTime * 1.3 + aSeed * 6.28) * 0.04;

    // The pointer lifts the points and pushes them aside.
    vec2 away = p.xy - uPointer;
    float dist = length(away);
    float lift = exp(-(dist * dist) / 4.5) * uStrength;
    p.z += lift * 2.4;
    p.xy += (away / max(dist, 0.001)) * lift * 0.9;
    vGlow = lift;

    vec4 view = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = uSize * uPixelRatio * (1.0 + lift * 1.6) * (12.0 / -view.z);

    // Far rows fade into the background.
    vFade = smoothstep(42.0, 12.0, -view.z);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uCold;
  uniform vec3 uHot;
  varying float vGlow;
  varying float vFade;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    if (r > 0.5) discard;
    float soft = smoothstep(0.5, 0.18, r);
    vec3 color = mix(uCold, uHot, clamp(vGlow * 1.4, 0.0, 1.0));
    gl_FragColor = vec4(color, soft * vFade * (0.7 + vGlow * 0.3));
  }
`;

export function startHero(canvas, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  const small = window.matchMedia("(max-width: 760px)").matches;
  const cols = small ? 90 : 150;
  const rows = small ? 70 : 90;
  const width = 40;
  const depth = 28;

  const positions = new Float32Array(cols * rows * 3);
  const seeds = new Float32Array(cols * rows);
  let i = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      positions[i * 3] = (x / (cols - 1) - 0.5) * width;
      positions[i * 3 + 1] = (y / (rows - 1) - 0.5) * depth;
      positions[i * 3 + 2] = 0;
      seeds[i] = Math.random();
      i++;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uTime: { value: 0 },
    uPointer: { value: new THREE.Vector2(6, 2) },
    uStrength: { value: 0.8 },
    uSize: { value: small ? 3.4 : 2.5 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uCold: { value: new THREE.Color("#6FE3E1") },
    uHot: { value: new THREE.Color("#FF8FA3") },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const field = new THREE.Points(geometry, material);
  field.rotation.x = -1.05;   // tip the sheet back like a floor
  field.position.set(2.5, -2.2, 0);
  scene.add(field);

  // --- Pointer: project the screen position onto the tilted sheet ---
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const hit = new THREE.Vector3();
  const target = new THREE.Vector2(6, 2);
  let lastPointer = -Infinity;
  let strength = 0.8;

  function updatePlane() {
    field.updateMatrixWorld();
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(field.matrixWorld);
    plane.setFromNormalAndCoplanarPoint(normal, field.position);
  }

  function onPointer(event) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) {
      field.worldToLocal(hit);
      target.set(hit.x, hit.y);
      lastPointer = performance.now();
      if (reducedMotion) render(0);
    }
  }

  const hero = canvas.parentElement;
  hero.addEventListener("pointermove", onPointer, { passive: true });
  hero.addEventListener("pointerdown", onPointer, { passive: true });

  // --- Size ---
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the field filling narrow (phone) screens too.
    // On tall (phone) screens the sheet stands up more, so it reaches the top.
    const tall = camera.aspect < 1;
    camera.position.z = tall ? 16 + (1 - camera.aspect) * 6 : 16;
    field.rotation.x = tall ? -0.7 : -1.05;
    field.position.set(tall ? 0 : 2.5, tall ? 1.5 : -2.2, 0);
    camera.updateProjectionMatrix();
    updatePlane();
  }
  new ResizeObserver(() => {
    resize();
    if (!running) render(elapsed);
  }).observe(canvas);
  resize();

  // --- Loop ---
  const clock = new THREE.Clock(false);
  let elapsed = 0;
  let running = false;
  let frame = 0;

  function render(time) {
    const idle = performance.now() - lastPointer > 2500;
    if (idle) {
      // A slow figure eight through the right half of the field
      // (the middle on narrow screens, where the text sits lower).
      const wide = camera.aspect >= 1;
      target.set((wide ? 6 : 0) + Math.sin(time * 0.23) * (wide ? 9 : 4), Math.sin(time * 0.37) * (wide ? 6 : 8));
    }
    const follow = reducedMotion ? 1 : 0.08;
    uniforms.uPointer.value.lerp(target, follow);
    strength += ((idle ? 0.75 : 1.0) - strength) * 0.05;
    uniforms.uStrength.value = reducedMotion ? 1 : strength;
    uniforms.uTime.value = time;
    renderer.render(scene, camera);
  }

  function tick() {
    elapsed += Math.min(clock.getDelta(), 0.1);   // no jump after a pause
    render(elapsed);
    frame = requestAnimationFrame(tick);
  }

  function setRunning(on) {
    if (reducedMotion || on === running) return;
    running = on;
    if (on) {
      clock.start();
      tick();
    } else {
      cancelAnimationFrame(frame);
      clock.stop();
    }
  }

  if (reducedMotion) {
    render(0);
  } else {
    new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting)).observe(canvas);
  }
}
