// Hero scene: a procedurally modelled end-suction centrifugal pump set
// (motor, coupling, shaft, bearing bracket, impeller, volute casing, base frame).
// Scroll progress assembles → explodes it into labelled parts → brings the
// impeller forward to spin up and spray water.
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, Group, Mesh, CylinderGeometry, BoxGeometry,
  TorusGeometry, RingGeometry, Shape, ExtrudeGeometry, PlaneGeometry, CanvasTexture, MeshBasicMaterial,
  MeshPhysicalMaterial, MeshStandardMaterial, DoubleSide, DirectionalLight, Vector3, MathUtils,
  BufferGeometry, BufferAttribute, Points, ShaderMaterial, AdditiveBlending, ACESFilmicToneMapping, SRGBColorSpace,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PCFSoftShadowMap, HemisphereLight, ShadowMaterial } from "three";

const ss = (x, a, b) => MathUtils.smoothstep(x, a, b);
const lerp = MathUtils.lerp;

const DROP_VERT = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  uniform float uPixel;
  varying float vLife;
  void main() {
    vLife = aLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = step(0.001, aLife) * aSize * uPixel * 40.0 / -mv.z;
  }
`;
const DROP_FRAG = /* glsl */ `
  varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 c = mix(vec3(0.12, 0.76, 0.4), vec3(0.86, 1.0, 0.9), smoothstep(0.25, 0.0, d));
    gl_FragColor = vec4(c, a * clamp(vLife * 2.5, 0.0, 1.0) * 0.9);
  }
`;

// cylinder whose axis runs along X
function cylX(rTop, rBottom, len, mat, seg = 48) {
  const g = new CylinderGeometry(rTop, rBottom, len, seg, 1);
  g.rotateZ(Math.PI / 2);
  return new Mesh(g, mat);
}

export function createPump(canvas, { mobile = false, labels = {} } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const pixel = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(pixel);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 200);
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
  const key = new DirectionalLight(0xffffff, 1.7);
  key.position.set(-4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(new HemisphereLight(0xdfeee6, 0x1a221d, 0.5));
  const rim = new DirectionalLight(0x3ddc84, 2.2);
  rim.position.set(5, 2, -6);
  scene.add(key, rim);

  // ---- materials (finishes seen on real pump sets)
  const paint = new MeshPhysicalMaterial({ color: 0xc8201c, metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 });
  const iron = new MeshPhysicalMaterial({ color: 0x3b4248, metalness: 0.7, roughness: 0.4, transparent: true });
  const steel = new MeshPhysicalMaterial({ color: 0xdfe3e7, metalness: 1, roughness: 0.16 });
  const bronze = new MeshPhysicalMaterial({ color: 0xc58b4b, metalness: 1, roughness: 0.22, side: DoubleSide });
  const frameMat = new MeshPhysicalMaterial({ color: 0x23292e, metalness: 0.55, roughness: 0.5 });
  const rubber = new MeshStandardMaterial({ color: 0x111316, roughness: 0.9 });

  const root = new Group();
  scene.add(root);
  const parts = {};
  const part = (name, x, y, ex, ey, ez = 0) => {
    const g = new Group();
    g.position.set(x, y, 0);
    g.userData = { home: new Vector3(x, y, 0), off: new Vector3(ex, ey, ez) };
    root.add(g);
    parts[name] = g;
    return g;
  };

  // Motor
  const motor = part("motor", 1.75, 0, 2.5, 0.35, 0);
  motor.add(cylX(0.82, 0.82, 2.4, paint, 64));
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const fin = new Mesh(new RoundedBoxGeometry(2.2, 0.12, 0.05, 2, 0.02), paint);
    fin.position.set(-0.05, Math.cos(a) * 0.86, Math.sin(a) * 0.86);
    fin.rotation.x = a;
    motor.add(fin);
  }
  [-1.2, 1.2].forEach((x) => { const bell = cylX(0.9, 0.9, 0.16, paint, 64); bell.position.x = x; motor.add(bell); });
  const cowl = cylX(0.8, 0.84, 0.6, frameMat, 64); cowl.position.x = 1.58; motor.add(cowl);
  for (let i = 0; i < 4; i++) { const g = new Mesh(new TorusGeometry(0.5 - i * 0.11, 0.018, 8, 48), steel); g.rotation.y = Math.PI / 2; g.position.x = 1.89; motor.add(g); }
  const tbox = new Mesh(new RoundedBoxGeometry(0.6, 0.36, 0.55, 2, 0.02), paint); tbox.position.set(0.1, 0.98, 0); motor.add(tbox);
  const plate = new Mesh(new RoundedBoxGeometry(0.55, 0.28, 0.02, 2, 0.02), steel); plate.position.set(-0.2, 0.1, 0.875); motor.add(plate);
  [-0.8, 0.8].forEach((x) => { const f = new Mesh(new RoundedBoxGeometry(0.32, 0.47, 1.5, 2, 0.02), frameMat); f.position.set(x, -1.265, 0); motor.add(f); });

  // Coupling
  const coupling = part("coupling", 0.3, 0, 1.25, 1.0, 0);
  coupling.add(cylX(0.3, 0.3, 0.42, steel, 48));
  const spider = cylX(0.31, 0.31, 0.08, rubber, 48); coupling.add(spider);

  // Shaft
  const shaft = part("shaft", -0.6, 0, 0.35, 1.65, 0);
  shaft.add(cylX(0.11, 0.11, 2.3, steel, 32));
  for (let i = 0; i < 2; i++) { const k = new Mesh(new RoundedBoxGeometry(0.3, 0.05, 0.06, 2, 0.02), steel); k.position.set(-0.6 + i * 1.6, 0.11, 0); shaft.add(k); }

  // Bearing bracket
  const bracket = part("bracket", -0.75, 0, -0.35, -0.15, 0);
  bracket.add(cylX(0.32, 0.44, 0.95, iron, 48));
  const bfl = cylX(0.62, 0.62, 0.1, iron, 48); bfl.position.x = -0.5; bracket.add(bfl);
  const bfoot = new Mesh(new RoundedBoxGeometry(0.34, 0.67, 0.95, 2, 0.02), frameMat); bfoot.position.set(0, -1.165, 0); bracket.add(bfoot);

  // Impeller (closed, 7 backward-curved blades)
  const impeller = part("impeller", -1.82, 0, -1.25, 1.55, 0.6);
  const spinner = new Group();
  impeller.add(spinner);
  const back = cylX(0.92, 0.92, 0.05, bronze, 72); back.position.x = 0.15; spinner.add(back);
  const eye = new Mesh(new RingGeometry(0.78, 0.92, 72), bronze); eye.rotation.y = Math.PI / 2; eye.position.x = -0.14; spinner.add(eye);
  const hub = cylX(0.22, 0.3, 0.32, bronze, 32); spinner.add(hub);
  const nut = cylX(0.12, 0.12, 0.12, steel, 6); nut.position.x = -0.2; spinner.add(nut);
  const blade = new Shape();
  const N = 24, inner = [], outer = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, r = 0.3 + 0.6 * t, th = 1.05 * Math.log(r / 0.3);
    outer.push([Math.cos(th) * r, Math.sin(th) * r]);
    const th2 = th + 0.16 * (1 - 0.6 * t);
    inner.push([Math.cos(th2) * r, Math.sin(th2) * r]);
  }
  blade.moveTo(...outer[0]);
  outer.slice(1).forEach((p) => blade.lineTo(...p));
  inner.reverse().forEach((p) => blade.lineTo(...p));
  const bladeGeo = new ExtrudeGeometry(blade, { depth: 0.26, bevelEnabled: false, curveSegments: 4 });
  bladeGeo.translate(0, 0, -0.13);
  bladeGeo.rotateY(Math.PI / 2);
  const blades = new Group();
  for (let k = 0; k < 7; k++) {
    const b = new Mesh(bladeGeo, bronze);
    b.rotation.x = (k / 7) * Math.PI * 2;
    blades.add(b);
  }
  spinner.add(blades);

  // Volute casing
  const casing = part("casing", -1.85, 0, -3.0, 0.25, -0.2);
  casing.add(cylX(1.15, 1.15, 0.64, iron, 72));
  const volute = new Mesh(new TorusGeometry(1.14, 0.3, 28, 96), iron); volute.rotation.y = Math.PI / 2; casing.add(volute);
  const disch = new Mesh(new CylinderGeometry(0.3, 0.36, 1.05, 40), iron); disch.position.set(0, 1.45, 0.62); casing.add(disch);
  const dfl = new Mesh(new CylinderGeometry(0.52, 0.52, 0.09, 40), iron); dfl.position.set(0, 1.98, 0.62); casing.add(dfl);
  const suc = cylX(0.38, 0.38, 0.9, iron, 40); suc.position.x = -0.72; casing.add(suc);
  const sfl = cylX(0.58, 0.58, 0.09, iron, 40); sfl.position.x = -1.16; casing.add(sfl);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const b1 = cylX(0.035, 0.035, 0.14, steel, 8); b1.position.set(-1.16, Math.cos(a) * 0.48, Math.sin(a) * 0.48); casing.add(b1);
    const b2 = new Mesh(new CylinderGeometry(0.035, 0.035, 0.14, 8), steel); b2.position.set(Math.cos(a) * 0.43, 1.98, 0.62 + Math.sin(a) * 0.43); casing.add(b2);
  }
  const cfoot = new Mesh(new RoundedBoxGeometry(0.5, 0.12, 0.9, 2, 0.02), frameMat); cfoot.position.set(0, -1.44, 0); casing.add(cfoot);

  // Base frame
  const base = part("base", -0.1, 0, 0, -0.95, 0);
  const bed = new Mesh(new RoundedBoxGeometry(6.6, 0.16, 1.9, 2, 0.02), frameMat); bed.position.y = -1.58; base.add(bed);
  [-0.92, 0.92].forEach((z) => { const r = new Mesh(new RoundedBoxGeometry(6.6, 0.32, 0.1, 2, 0.02), frameMat); r.position.set(0, -1.5, z); base.add(r); });
  for (let i = 0; i < 4; i++) { const ab = new Mesh(new CylinderGeometry(0.06, 0.06, 0.12, 12), steel); ab.position.set(-2.8 + i * 1.9, -1.45, 0.75); base.add(ab); }

  // soft contact shadow
  const sc = document.createElement("canvas");
  sc.width = sc.height = 128;
  const sctx = sc.getContext("2d");
  const grd = sctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, "rgba(0,0,0,0.55)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  sctx.fillStyle = grd;
  sctx.fillRect(0, 0, 128, 128);
  const shadowMat = new MeshBasicMaterial({ map: new CanvasTexture(sc), transparent: true, depthWrite: false });
  const shadow = new Mesh(new PlaneGeometry(9, 3.4), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.67;
  root.add(shadow);
  const catcher = new Mesh(new PlaneGeometry(30, 30), new ShadowMaterial({ opacity: 0.4 }));
  catcher.rotation.x = -Math.PI / 2;
  catcher.position.y = -1.665;
  catcher.receiveShadow = true;
  root.add(catcher);
  root.traverse((o) => { if (o.isMesh && o !== catcher && o !== shadow) { o.castShadow = true; o.receiveShadow = true; } });

  // ---- water particles (world space)
  const MAX = mobile ? 900 : 2000;
  const pos = new Float32Array(MAX * 3), vel = new Float32Array(MAX * 3), life = new Float32Array(MAX), size = new Float32Array(MAX), grav = new Float32Array(MAX);
  const pGeo = new BufferGeometry();
  pGeo.setAttribute("position", new BufferAttribute(pos, 3));
  pGeo.setAttribute("aLife", new BufferAttribute(life, 1));
  pGeo.setAttribute("aSize", new BufferAttribute(size, 1));
  const drops = new Points(pGeo, new ShaderMaterial({
    uniforms: { uPixel: { value: pixel } }, vertexShader: DROP_VERT, fragmentShader: DROP_FRAG,
    transparent: true, depthWrite: false, blending: AdditiveBlending,
  }));
  drops.frustumCulled = false;
  scene.add(drops);
  let cursor = 0;
  const emit = (p, v, s, g) => {
    const i = cursor;
    cursor = (cursor + 1) % MAX;
    pos.set([p.x, p.y, p.z], i * 3);
    vel.set([v.x, v.y, v.z], i * 3);
    life[i] = 1; size[i] = s; grav[i] = g;
  };

  // ---- state + layout
  const state = { p: 0, intro: 0, px: 0, py: 0, sx: 0, sy: 0 };
  let visible = true, W = 1, H = 1, spin = 0, acc1 = 0, acc2 = 0, acc3 = 0;
  const tmpA = new Vector3(), tmpB = new Vector3(), tmpC = new Vector3(), look = new Vector3();

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  const labelEls = Object.entries(labels).map(([name, el]) => ({ name, el, anchor: new Vector3(...el.dataset.anchor.split(",").map(Number)) }));

  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    const t = now / 1000;
    const dt = Math.min(0.05, (now - (frame.last || now)) / 1000);
    frame.last = now;
    const m = W < 861;
    const p = state.p;
    state.sx += (state.px - state.sx) * Math.min(1, dt * 3);
    state.sy += (state.py - state.sy) * Math.min(1, dt * 3);

    const explode = ss(p, 0.1, 0.42);
    const focus = ss(p, 0.52, 0.74);
    const burst = ss(p, 0.7, 0.95);

    // root placement: right of the headline at rest, centred once exploded
    const restX = m ? 0.3 : 2.6, restY = m ? -2.5 : -0.55;
    root.position.set(lerp(restX, 0, explode), lerp(restY, m ? -0.4 : 0, explode), 0);
    const sc0 = (m ? 0.55 : 0.68) * (0.85 + 0.15 * state.intro);
    root.scale.setScalar(lerp(sc0, m ? 0.4 : 0.8, explode));
    root.rotation.y = lerp(-0.55 + Math.sin(t * 0.3) * 0.08, -0.12, explode) + state.sx * 0.25 * (1 - focus);
    root.rotation.x = lerp(0.12, 0.05, explode) + state.sy * 0.08 * (1 - focus);

    for (const [name, g] of Object.entries(parts)) {
      const { home, off } = g.userData;
      const away = name === "impeller" ? 1 : 1 + focus * 1.6;
      g.position.set(home.x + off.x * explode * away, home.y + off.y * explode * away + (name === "impeller" ? 0 : -focus * 0.6), home.z + off.z * explode);
    }
    iron.opacity = lerp(1, 0.35, explode) * (1 - focus * 0.75);
    paint.opacity = 1;

    // impeller: idle spin, then turns to face the camera and spins up
    spin += dt * (0.45 + explode * 0.7 + focus * 2 + burst * 3.2);
    spinner.rotation.x = spin;
    impeller.rotation.y = focus * Math.PI / 2 * 0.85;
    impeller.rotation.x = focus * 0.25;
    impeller.scale.setScalar(1 + focus * 0.55);

    // camera
    const camR = lerp(m ? 15 : 11.5, m ? 17 : 13.5, explode);
    const ix = new Vector3();
    impeller.getWorldPosition(ix);
    look.set(lerp(0, ix.x, focus), lerp(0, ix.y, focus), lerp(0, ix.z, focus));
    camera.position.set(
      lerp(lerp(2.4, 0.5, explode), ix.x + 0.2, focus),
      lerp(lerp(2.2, 1.4, explode), ix.y + 0.15, focus),
      lerp(camR, (m ? 10.5 : 8.2) - burst * 1.8, focus),
    );
    camera.lookAt(look);

    // water: inflow at the suction, jet from the discharge (when assembled)
    root.updateMatrixWorld();
    const flowOn = (1 - explode) * state.intro;
    acc1 += dt * 260 * flowOn;
    while (acc1 >= 1) {
      acc1 -= 1;
      tmpA.set(-1.9 - Math.random() * 1.6, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5);
      casing.localToWorld(tmpA);
      tmpB.set(-1.2, 0, 0); casing.localToWorld(tmpB);
      tmpC.copy(tmpB).sub(tmpA).multiplyScalar(1.4);
      emit(tmpA, tmpC, 0.6 + Math.random() * 0.6, 0);
    }
    acc2 += dt * 380 * flowOn;
    while (acc2 >= 1) {
      acc2 -= 1;
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.22;
      tmpA.set(Math.cos(a) * r, 2.05, 0.62 + Math.sin(a) * r);
      casing.localToWorld(tmpA);
      tmpC.set((Math.random() - 0.5) * 0.7, 2.6 + Math.random() * 0.9, (Math.random() - 0.5) * 0.7).multiplyScalar(root.scale.x);
      emit(tmpA, tmpC, 0.7 + Math.random() * 0.8, 4.2 * root.scale.x);
    }
    // radial spray off the spinning impeller rim
    acc3 += dt * 900 * burst;
    while (acc3 >= 1) {
      acc3 -= 1;
      const a = Math.random() * Math.PI * 2;
      tmpA.set(0, Math.cos(a) * 0.95, Math.sin(a) * 0.95);
      impeller.localToWorld(tmpA);
      impeller.getWorldPosition(tmpB);
      tmpC.copy(tmpA).sub(tmpB).normalize();
      const tan = new Vector3(0, -Math.sin(a), Math.cos(a)).transformDirection(impeller.matrixWorld);
      tmpC.multiplyScalar(2.5 + Math.random() * 2).add(tan.multiplyScalar(2.2));
      emit(tmpA, tmpC, 0.5 + Math.random() * 1.1, 0.6);
    }
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) continue;
      vel[i * 3 + 1] -= grav[i] * dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      life[i] -= dt * 0.9;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aLife.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;

    shadowMat.opacity = 1 - explode * 0.6;

    // callout labels follow their parts while exploded
    const lv = ss(p, 0.26, 0.36) * (1 - ss(p, 0.5, 0.58));
    for (const L of labelEls) {
      tmpA.copy(L.anchor);
      parts[L.name].localToWorld(tmpA);
      tmpA.project(camera);
      const x = (tmpA.x * 0.5 + 0.5) * W, y = (-tmpA.y * 0.5 + 0.5) * H;
      L.el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      L.el.style.opacity = lv.toFixed(3);
    }

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    setProgress(v) { state.p = v; },
    setIntro(v) { state.intro = v; },
    setPointer(x, y) { state.px = x; state.py = y; },
    setVisible(v) { visible = v; },
  };
}
