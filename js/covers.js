// Project covers: one small live three.js scene per project.
// projects.json names a cover ("pong", ...); unknown names get the generic one.
// To add a cover for a new project, write a builder and register it in BUILDERS.

import * as THREE from "three";

const PALETTE = {
  background: new THREE.Color("#1D1736"),
  line: new THREE.Color("#4A3F7A"),
  cyan: new THREE.Color("#6FE3E1"),
  pink: new THREE.Color("#FF8FA3"),
  white: new THREE.Color("#EEE9F7"),
  rock: new THREE.Color("#8C82B5"),
};

function starField(count, radius) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(radius * (0.6 + Math.random() * 0.4));
    positions.set([v.x, v.y, v.z], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({
    color: PALETTE.white, size: 0.08, transparent: true, opacity: 0.7, sizeAttenuation: true,
  }));
}

// ---------------------------------------------------------------------------
// Special Space Pong: two paddles, a ball with a trail and asteroids in the way
// ---------------------------------------------------------------------------
function buildPong(scene, camera) {
  const HALF_W = 6;     // field half width (x)
  const HALF_L = 8.5;   // field half length (y), paddles at each end

  camera.position.set(0, -18.5, 13);
  const lookTarget = new THREE.Vector3(0, -0.6, 0);
  camera.lookAt(lookTarget);
  const basePosition = camera.position.clone();

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-4, -6, 10);
  scene.add(sun);

  const stars = starField(500, 40);
  scene.add(stars);

  // Field outline and a dashed center line
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(HALF_W * 2, HALF_L * 2)),
    new THREE.LineBasicMaterial({ color: PALETTE.line }),
  );
  scene.add(outline);
  const center = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-HALF_W, 0, 0), new THREE.Vector3(HALF_W, 0, 0)]),
    new THREE.LineDashedMaterial({ color: PALETTE.line, dashSize: 0.4, gapSize: 0.3 }),
  );
  center.computeLineDistances();
  scene.add(center);

  function paddle(color, y) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.32, 0.45),
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, roughness: 0.4 }),
    );
    mesh.position.set(0, y, 0.22);
    scene.add(mesh);
    return mesh;
  }
  const player = paddle(PALETTE.pink, -HALF_L + 0.4);
  const enemy = paddle(PALETTE.cyan, HALF_L - 0.4);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 20, 14),
    new THREE.MeshStandardMaterial({ color: PALETTE.white, emissive: PALETTE.white, emissiveIntensity: 0.6 }),
  );
  ball.position.set(0, 0, 0.3);
  scene.add(ball);

  // Trail: the ball's last positions, fading out
  const TRAIL = 28;
  const trailPositions = new Float32Array(TRAIL * 3);
  const trailColors = new Float32Array(TRAIL * 3);
  for (let i = 0; i < TRAIL; i++) {
    const fade = 1 - i / TRAIL;
    const c = PALETTE.white.clone().lerp(PALETTE.cyan, i / TRAIL).multiplyScalar(fade);
    trailColors.set([c.r, c.g, c.b], i * 3);
  }
  const trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
  const trail = new THREE.Line(trailGeometry, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending,
  }));
  scene.add(trail);

  // Asteroids the ball bounces off
  const rockMaterial = new THREE.MeshStandardMaterial({ color: PALETTE.rock, flatShading: true, roughness: 0.9 });
  const rocks = [
    { x: -3.0, y: 1.6, r: 0.9 },
    { x: 2.8, y: -1.2, r: 0.75 },
    { x: 0.6, y: 3.6, r: 0.55 },
  ].map(({ x, y, r }) => {
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), rockMaterial);
    mesh.position.set(x, y, r * 0.6);
    mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    mesh.userData = { r, spin: 0.2 + Math.random() * 0.4 };
    scene.add(mesh);
    return mesh;
  });

  const velocity = new THREE.Vector2(3.2, 7.5);
  const SPEED = 8.5;

  function bounceOffPaddle(paddleMesh, direction) {
    const offset = THREE.MathUtils.clamp((ball.position.x - paddleMesh.position.x) / 1.3, -1, 1);
    const angle = offset * 0.85;   // like the game: the edge of the paddle sends it wide
    velocity.set(Math.sin(angle) * SPEED, Math.cos(angle) * SPEED * direction);
  }

  function step(dt) {
    ball.position.x += velocity.x * dt;
    ball.position.y += velocity.y * dt;

    if (Math.abs(ball.position.x) > HALF_W - 0.28) {
      ball.position.x = Math.sign(ball.position.x) * (HALF_W - 0.28);
      velocity.x *= -1;
    }
    if (velocity.y < 0 && ball.position.y < player.position.y + 0.45) {
      ball.position.y = player.position.y + 0.45;
      bounceOffPaddle(player, +1);
    } else if (velocity.y > 0 && ball.position.y > enemy.position.y - 0.45) {
      ball.position.y = enemy.position.y - 0.45;
      bounceOffPaddle(enemy, -1);
    }

    for (const rock of rocks) {
      const dx = ball.position.x - rock.position.x;
      const dy = ball.position.y - rock.position.y;
      const dist = Math.hypot(dx, dy);
      const min = rock.userData.r + 0.28;
      if (dist < min) {
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = velocity.x * nx + velocity.y * ny;
        if (dot < 0) {
          velocity.x -= 2 * dot * nx;
          velocity.y -= 2 * dot * ny;
          // Never let it bounce back and forth sideways forever.
          if (Math.abs(velocity.y) < SPEED * 0.45) velocity.y = Math.sign(velocity.y || 1) * SPEED * 0.45;
          velocity.setLength(SPEED);
        }
        ball.position.x = rock.position.x + nx * min;
        ball.position.y = rock.position.y + ny * min;
      }
      rock.rotation.x += rock.userData.spin * dt;
      rock.rotation.y += rock.userData.spin * 0.7 * dt;
    }

    // Both paddles chase the ball, the far one a little lazier.
    const chase = (mesh, speed) => {
      const goal = THREE.MathUtils.clamp(ball.position.x, -HALF_W + 1.3, HALF_W - 1.3);
      const delta = goal - mesh.position.x;
      mesh.position.x += Math.sign(delta) * Math.min(Math.abs(delta), speed * dt);
    };
    chase(player, 7.5);
    chase(enemy, 5.5);

    trailPositions.copyWithin(3, 0, (TRAIL - 1) * 3);
    trailPositions.set([ball.position.x, ball.position.y, ball.position.z], 0);
    trailGeometry.attributes.position.needsUpdate = true;
  }

  // Fill the trail so the first frame doesn't draw a line from the origin
  for (let i = 0; i < TRAIL; i++) trailPositions.set([0, 0, 0.3], i * 3);
  // Warm up so a still frame (reduced motion) shows the ball mid-rally
  for (let i = 0; i < 70; i++) step(1 / 60);

  return {
    update(dt, time, pointer) {
      step(dt);
      stars.rotation.z = time * 0.01;
      camera.position.set(basePosition.x + pointer.x * 2.2, basePosition.y, basePosition.z + pointer.y * 1.2);
      camera.lookAt(lookTarget);
    },
  };
}

// ---------------------------------------------------------------------------
// Generic cover for projects without their own scene yet
// ---------------------------------------------------------------------------
function buildGeneric(scene, camera) {
  camera.position.set(0, 0, 7);
  const group = new THREE.Group();
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2, 1)),
    new THREE.LineBasicMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.8 }),
  );
  const dots = new THREE.Points(
    new THREE.IcosahedronGeometry(1.2, 3),
    new THREE.PointsMaterial({ color: PALETTE.pink, size: 0.05 }),
  );
  group.add(wire, dots);
  scene.add(group, starField(300, 30));
  return {
    update(dt, time, pointer) {
      group.rotation.y = time * 0.25 + pointer.x * 0.6;
      group.rotation.x = time * 0.12 + pointer.y * 0.4;
    },
  };
}

const BUILDERS = { pong: buildPong, generic: buildGeneric };

/**
 * Start a cover scene on a canvas.
 * @returns {{ setActive(on: boolean): void } | null} null if WebGL isn't available.
 */
export function createCover(name, canvas, { reducedMotion = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(PALETTE.background);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 16 / 10, 0.1, 200);
  const build = BUILDERS[name] || BUILDERS.generic;
  const cover = build(scene, camera);

  // Hovering the cover tilts the camera a little toward the pointer
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointerTarget.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }, { passive: true });
  canvas.addEventListener("pointerleave", () => pointerTarget.set(0, 0));

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const clock = new THREE.Clock(false);
  let elapsed = 0;
  let frame = 0;
  let active = false;

  function draw() {
    renderer.render(scene, camera);
  }

  function tick() {
    const dt = Math.min(clock.getDelta(), 1 / 20);
    elapsed += dt;
    pointer.lerp(pointerTarget, 0.06);
    cover.update(dt, elapsed, pointer);
    draw();
    frame = requestAnimationFrame(tick);
  }

  new ResizeObserver(() => {
    resize();
    if (!active) draw();
  }).observe(canvas);
  resize();
  cover.update(0, 0, pointer);
  draw();

  return {
    setActive(on) {
      if (reducedMotion || on === active) return;
      active = on;
      if (on) {
        clock.start();
        tick();
      } else {
        cancelAnimationFrame(frame);
        clock.stop();
      }
    },
  };
}
