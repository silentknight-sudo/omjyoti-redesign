// "Products in 3D": six procedurally modelled systems from the Om Jyoti range.
// Scroll walks through them. Each one assembles from flying parts, then plays a
// four-step story with its own camera moves, pinned labels and live screens,
// then breaks apart into the next.
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, Group, Mesh, CylinderGeometry, BoxGeometry,
  SphereGeometry, TorusGeometry, CircleGeometry, TubeGeometry, CatmullRomCurve3, CurvePath, LineCurve3,
  LatheGeometry, ExtrudeGeometry, Shape, Vector2, InstancedMesh, Object3D, MeshPhysicalMaterial, MeshStandardMaterial,
  MeshBasicMaterial, DoubleSide, DirectionalLight, Vector3, Plane, Color, BufferGeometry, BufferAttribute, Points,
  ShaderMaterial, AdditiveBlending, NormalBlending, MathUtils, ACESFilmicToneMapping, SRGBColorSpace, PlaneGeometry,
  CanvasTexture, RepeatWrapping,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PCFSoftShadowMap, HemisphereLight, ShadowMaterial, Quaternion } from "three";

const ss = (x, a, b) => MathUtils.smoothstep(x, a, b);
const lerp = MathUtils.lerp;
const TAU = Math.PI * 2;
const FLOW_PACE = 0.6;
const TIME_SCALE = 0.6; // every time-based motion runs at 60% speed

// Story timing shared by every product (fractions of that product's scroll span)
export const STEP_WINDOWS = [[0.22, 0.4], [0.4, 0.58], [0.58, 0.76], [0.76, 0.92]];
const [W1, W2, W3, W4] = STEP_WINDOWS;
const inWin = (l, w, f = 0.03) => ss(l, w[0], w[0] + f) * (1 - ss(l, w[1] - f, w[1]));
const from = (l, w, f = 0.05) => ss(l, w[0], w[0] + f);

// Text for the side panel; facts come from each product's page on omjyoti.co.in
export const SHOW_META = [
  {
    cat: "Fire fighting", name: "Fire Fighting System", slug: "fire-fighting-system",
    summary: "OM JYOTI EDJ systems, designed as per NFPA 20 / IS 12845: electric, diesel and jockey pumps on one factory-tested skid.",
    steps: ["Standby: the jockey pump holds the mains at pressure", "Pressure drops: the electric main pump starts", "Diesel engine pump backs it up", "Water reaches the sprinklers and hydrant"],
  },
  {
    cat: "Water treatment", name: "Mineral Water Plant", slug: "mineral-water-plant",
    summary: "Complete RO, UV and ozonation setup with filling and packaging, BIS & FSSAI compliant, from small to large-scale production.",
    steps: ["Water purified by RO, UV and ozonation", "Bottles rinsed, filled and capped (RFC)", "Shrink wrapped into packs", "Packed and ready for dispatch"],
  },
  {
    cat: "Wastewater", name: "STP / WTP", slug: "sewage-treatment-plant",
    summary: "Prefabricated, modular MBBR / SBR treatment plants from 1 KLD to 500 KLD and beyond, turning wastewater into reusable water.",
    steps: ["Screening and equalisation", "MBBR aeration: bacteria on media break down waste", "Clarifier: solids settle out as sludge", "Filtered, disinfected and ready for reuse"],
  },
  {
    cat: "Rain water harvesting", name: "Rain Water Harvesting", slug: "rain-water-harvesting",
    summary: "Modular systems that collect, filter, store and recharge rainwater, with storage blocks that install under roads and parking.",
    steps: ["Rain is collected from the rooftop", "Filtration unit removes debris and silt", "Underground modular storage fills", "Water recharges the groundwater"],
  },
  {
    cat: "Pumps", name: "Hydropneumatic System", slug: "hydropneumatics-system",
    summary: "Constant water pressure at every outlet without overhead tanks, using multistage pumps, a pressure vessel and VFD control.",
    steps: ["Pressure vessel holds the set pressure", "Taps open and demand rises", "VFD starts more pumps and adjusts speed", "Same pressure on every floor"],
  },
  {
    cat: "Water treatment", name: "Industrial RO Plant", slug: "industrial-ro-plant",
    summary: "Membrane technology that removes up to 99% of TDS, bacteria and harmful substances. Capacities from 100 L to 50,000 L.",
    steps: ["Pre-treatment: sand and carbon filters", "Cartridge filter and high pressure pump", "RO membranes split pure water from reject", "Pure water out, monitored on the panel"],
  },
];

/* ---------------- materials ---------------- */
const M = {
  steel: new MeshPhysicalMaterial({ color: 0xdfe4e8, metalness: 1, roughness: 0.18 }),
  brushed: new MeshPhysicalMaterial({ color: 0xc4cad0, metalness: 1, roughness: 0.32 }),
  frp: new MeshPhysicalMaterial({ color: 0x1f5fb8, metalness: 0.1, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.2 }),
  red: new MeshPhysicalMaterial({ color: 0xc8201c, metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
  green: new MeshPhysicalMaterial({ color: 0x0c7a3a, metalness: 0.3, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }),
  blue: new MeshPhysicalMaterial({ color: 0x2b64c9, metalness: 0.3, roughness: 0.3, clearcoat: 1 }),
  dark: new MeshPhysicalMaterial({ color: 0x272d32, metalness: 0.55, roughness: 0.5 }),
  white: new MeshPhysicalMaterial({ color: 0xeef1f2, metalness: 0.05, roughness: 0.4, clearcoat: 0.6 }),
  concrete: new MeshStandardMaterial({ color: 0x8d9290, roughness: 0.95 }),
  bronze: new MeshPhysicalMaterial({ color: 0xc58b4b, metalness: 1, roughness: 0.24, side: DoubleSide }),
  copper: new MeshPhysicalMaterial({ color: 0xc8743c, metalness: 1, roughness: 0.25 }),
  rubber: new MeshStandardMaterial({ color: 0x15181b, roughness: 0.85 }),
  glass: new MeshPhysicalMaterial({ color: 0xcfe8ff, metalness: 0, roughness: 0.05, transparent: true, opacity: 0.18, side: DoubleSide, depthWrite: false }),
};
function noiseTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(...repeat);
  return t;
}
// brushed stainless: fine directional streaks
const brushedTex = noiseTex(256, 256, (x, w, h) => {
  x.fillStyle = "#808080"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { const v = 100 + Math.random() * 80; x.fillStyle = `rgb(${v},${v},${v})`; x.globalAlpha = 0.35; x.fillRect(Math.random() * w, Math.random() * h, 20 + Math.random() * 120, 1); }
}, [2, 2]);
// paint orange-peel / cast texture
const peelTex = noiseTex(256, 256, (x, w, h) => {
  const img = x.createImageData(w, h);
  for (let i = 0; i < img.data.length; i += 4) { const v = 118 + Math.random() * 20; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0);
  x.filter = "blur(1.5px)"; x.drawImage(x.canvas, 0, 0);
}, [3, 3]);
// concrete: blotchy grain
const concreteTex = noiseTex(256, 256, (x, w, h) => {
  x.fillStyle = "#8d9290"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = 110 + Math.random() * 60; x.fillStyle = `rgba(${v},${v + 4},${v + 2},0.35)`; const r = Math.random() * 3; x.beginPath(); x.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2); x.fill(); }
}, [3, 3]);
// rippling water surface normal map
const rippleTex = noiseTex(256, 256, (x, w, h) => {
  const img = x.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const a = Math.sin(i * 0.11 + Math.sin(j * 0.07) * 2) * 0.5 + Math.sin(j * 0.13 + i * 0.03) * 0.5;
    const b = Math.cos(j * 0.09 + Math.sin(i * 0.05) * 2) * 0.5 + Math.cos(i * 0.12 - j * 0.04) * 0.5;
    const k = (j * w + i) * 4;
    img.data[k] = 128 + a * 40; img.data[k + 1] = 128 + b * 40; img.data[k + 2] = 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
}, [2, 2]);
const finish = () => {
  [M.steel, M.brushed].forEach((m) => { m.roughnessMap = brushedTex; m.bumpMap = brushedTex; m.bumpScale = 0.4; });
  [M.red, M.blue, M.green, M.dark, M.white, M.frp].forEach((m) => { m.bumpMap = peelTex; m.bumpScale = 0.25; });
  M.concrete.map = concreteTex; M.concrete.bumpMap = concreteTex; M.concrete.bumpScale = 0.8;
  Object.values(M).forEach((m) => (m.needsUpdate = true));
};
finish();

const lamp = (hex, i = 2) => new MeshStandardMaterial({ color: 0x111111, emissive: hex, emissiveIntensity: i });
const waterMat = (hex, op = 0.6) => new MeshPhysicalMaterial({ color: hex, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, normalMap: rippleTex, normalScale: new Vector2(0.35, 0.35), transparent: true, opacity: op, depthWrite: false, side: DoubleSide });

/* ---------------- geometry helpers ---------------- */
const cyl = (r1, r2, h, mat, seg = 40, open = false) => new Mesh(new CylinderGeometry(r1, r2, h, seg, 1, open), mat);
const cylX = (r1, r2, h, mat, seg = 40) => { const m = cyl(r1, r2, h, mat, seg); m.geometry.rotateZ(Math.PI / 2); return m; };
const cylZ = (r1, r2, h, mat, seg = 40) => { const m = cyl(r1, r2, h, mat, seg); m.geometry.rotateX(Math.PI / 2); return m; };
// bevelled edges read as fabricated metal rather than CG blocks
const box = (x, y, z, mat) => {
  const r = Math.min(0.03, Math.min(x, y, z) * 0.22);
  return new Mesh(r > 0.004 ? new RoundedBoxGeometry(x, y, z, 2, r) : new BoxGeometry(x, y, z), mat);
};
const at = (m, x, y, z) => { m.position.set(x, y, z); return m; };
const rot = (m, axis, v) => { m.rotation[axis] = v; return m; };
const sphere = (r, mat, seg = 24) => new Mesh(new SphereGeometry(r, seg, Math.max(8, seg / 2)), mat);
const dome = (r, mat, up = true) => new Mesh(new SphereGeometry(r, 40, 14, 0, TAU, up ? 0 : Math.PI / 2, Math.PI / 2), mat);
const Y_UP = new Vector3(0, 1, 0);
const tube = (pts, r, mat, seg = 60) => {
  const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)), false, "catmullrom", 0.05);
  const pipe = new Mesh(new TubeGeometry(curve, seg, r, 12), mat);
  if (r < 0.04) return pipe;
  const grp = new Group();
  grp.add(pipe);
  [0, 1].forEach((u) => {
    const fl = new Mesh(new CylinderGeometry(r * 1.75, r * 1.75, r * 0.55, 20), mat);
    fl.position.copy(curve.getPointAt(u));
    fl.quaternion.copy(new Quaternion().setFromUnitVectors(Y_UP, curve.getTangentAt(u)));
    grp.add(fl);
  });
  return grp;
};
const pathOf = (pts) => {
  const p = new CurvePath();
  for (let i = 0; i < pts.length - 1; i++) p.add(new LineCurve3(new Vector3(...pts[i]), new Vector3(...pts[i + 1])));
  return p;
};
function vesselFRP(r, h, mat = M.frp) {
  const v = new Group();
  v.add(at(cyl(r, r, h, mat, 40), 0, h / 2 + r * 0.4, 0));
  v.add(at(dome(r, mat, true), 0, h + r * 0.4, 0));
  v.add(at(dome(r, mat, false), 0, r * 0.4, 0));
  v.add(at(cyl(r * 0.45, r * 0.5, 0.2, M.dark), 0, h + r * 1.35, 0));
  v.add(at(cyl(r * 0.75, r * 0.75, 0.08, M.brushed), 0, 0.04, 0));
  [0.42, h * 0.5 + r * 0.4, h + r * 0.38].forEach((y) => v.add(at(cyl(r * 1.01, r * 1.01, 0.025, mat, 40), 0, y, 0)));
  return v;
}
function multistage(h = 0.9, motor = M.dark) {
  const p = new Group();
  p.add(at(cyl(0.2, 0.22, 0.12, M.brushed), 0, 0.06, 0));
  p.add(at(cyl(0.15, 0.15, h, M.steel), 0, 0.12 + h / 2, 0));
  for (let i = 0; i < 4; i++) p.add(at(cyl(0.165, 0.165, 0.03, M.brushed), 0, 0.2 + (i * h) / 4, 0));
  p.add(at(cyl(0.12, 0.2, 0.18, M.brushed), 0, 0.2 + h, 0));
  p.add(at(cyl(0.2, 0.2, 0.5, motor), 0, 0.55 + h, 0));
  const fan = new Group();
  for (let k = 0; k < 5; k++) { const b = at(box(0.16, 0.012, 0.05, M.steel), 0.08, 0, 0); const hh = new Group(); hh.rotation.y = (k / 5) * TAU; hh.add(b); fan.add(hh); }
  fan.position.y = 0.82 + h;
  p.add(fan, at(cyl(0.18, 0.2, 0.06, M.dark, 30, true), 0, 0.82 + h, 0));
  p.userData.fan = fan;
  return p;
}
function makeScreen(w = 320, h = 180) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  const mat = new MeshBasicMaterial({ map: tex, toneMapped: false });
  let last = "";
  return {
    mat,
    draw(lines, color = "#38e27f", bg = "#04120a") {
      const key = lines.join("|") + color + bg;
      if (key === last) return;
      last = key;
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      lines.forEach((l, i) => {
        ctx.fillStyle = i === 0 ? color : "#cfe9d8";
        ctx.font = `${i === 0 ? 700 : 500} ${i === 0 ? Math.round(h * 0.2) : Math.round(h * 0.16)}px ui-monospace, Menlo, monospace`;
        ctx.fillText(l, w * 0.06, h * (0.28 + i * 0.24));
      });
      tex.needsUpdate = true;
    },
  };
}
function labelTexture(text, bg = "#0c7a3a") {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 96;
  const x = c.getContext("2d");
  x.fillStyle = bg; x.fillRect(0, 0, 512, 96);
  x.fillStyle = "#fff"; x.font = "800 44px Arial, sans-serif"; x.textAlign = "center";
  for (let k = 0; k < 2; k++) x.fillText(text, 128 + k * 256, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/* ---------------- particles ---------------- */
const P_VERT = /* glsl */ `
  attribute float aSeed;
  attribute float aLife;
  uniform float uPixel; uniform float uSize; uniform float uY0; uniform float uY1;
  varying float vH; varying float vLife;
  void main() {
    vLife = aLife;
    vH = clamp((position.y - uY0) / max(0.001, uY1 - uY0), 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = step(0.001, aLife) * uSize * (0.6 + aSeed * 0.8) * uPixel * 30.0 / -mv.z;
  }
`;
const P_FRAG = /* glsl */ `
  uniform vec3 uColA; uniform vec3 uColB; uniform float uAlpha; uniform float uSoft;
  varying float vH; varying float vLife;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, uSoft, d);
    vec3 c = mix(uColB, uColA, vH);
    c = mix(c, vec3(1.0), smoothstep(0.2, 0.0, d) * 0.4);
    gl_FragColor = vec4(c, a * uAlpha * clamp(vLife * 3.0, 0.0, 1.0));
  }
`;
function pointsMat(pixel, { size = 1, colA = 0x7dffb0, colB = null, y0 = 0, y1 = 1, additive = true, soft = 0.05 }) {
  const uniforms = {
    uPixel: { value: pixel }, uSize: { value: size }, uAlpha: { value: 0 }, uSoft: { value: soft },
    uColA: { value: new Color(colA) }, uColB: { value: new Color(colB ?? colA) }, uY0: { value: y0 }, uY1: { value: y1 },
  };
  return { uniforms, mat: new ShaderMaterial({ uniforms, vertexShader: P_VERT, fragmentShader: P_FRAG, transparent: true, depthWrite: false, blending: additive ? AdditiveBlending : NormalBlending }) };
}
// particles riding along a pipe path
function makeFlow(pixel, { path, count, speed, jitter = 0.05, ...look }) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count), life = new Float32Array(count).fill(1), u = new Float32Array(count), off = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seed[i] = Math.random(); u[i] = Math.random();
    off.set([(Math.random() - 0.5) * 2 * jitter, (Math.random() - 0.5) * 2 * jitter, (Math.random() - 0.5) * 2 * jitter], i * 3);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new BufferAttribute(seed, 1));
  g.setAttribute("aLife", new BufferAttribute(life, 1));
  const { uniforms, mat } = pointsMat(pixel, look);
  const pts = new Points(g, mat);
  pts.frustumCulled = false;
  const tmp = new Vector3();
  return {
    points: pts, uniforms,
    update(dt, alpha, rate = 1) {
      uniforms.uAlpha.value = alpha;
      if (alpha <= 0.001) return;
      for (let i = 0; i < count; i++) {
        u[i] = (u[i] + dt * speed * FLOW_PACE * rate * (0.8 + seed[i] * 0.4)) % 1;
        path.getPointAt(u[i], tmp);
        pos[i * 3] = tmp.x + off[i * 3]; pos[i * 3 + 1] = tmp.y + off[i * 3 + 1]; pos[i * 3 + 2] = tmp.z + off[i * 3 + 2];
      }
      g.attributes.position.needsUpdate = true;
    },
  };
}
// free particles with velocity, gravity and lifetime (spray, rain, bubbles, smoke)
function makeBallistic(pixel, max, look) {
  const pos = new Float32Array(max * 3), vel = new Float32Array(max * 3), life = new Float32Array(max), decay = new Float32Array(max);
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aSeed", new BufferAttribute(new Float32Array(max).map(() => Math.random()), 1));
  g.setAttribute("aLife", new BufferAttribute(life, 1));
  const { uniforms, mat } = pointsMat(pixel, look);
  const pts = new Points(g, mat);
  pts.frustumCulled = false;
  let cur = 0;
  return {
    points: pts, uniforms,
    emit(x, y, z, vx, vy, vz, d = 0.6) {
      const i = cur; cur = (cur + 1) % max;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
      life[i] = 1; decay[i] = d;
    },
    update(dt, alpha, gravity = 0, floorY = -99, drag = 0) {
      uniforms.uAlpha.value = alpha;
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0) continue;
        vel[i * 3 + 1] -= gravity * dt;
        if (drag) { vel[i * 3] *= 1 - drag * dt; vel[i * 3 + 2] *= 1 - drag * dt; }
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        life[i] -= dt * decay[i];
        if (pos[i * 3 + 1] < floorY) life[i] = 0;
      }
      g.attributes.position.needsUpdate = true;
      g.attributes.aLife.needsUpdate = true;
    },
  };
}

/* ---------------- assembly ---------------- */
function registerParts(group, spread = 5) {
  return group.children.filter((c) => !c.userData.static).map((c) => {
    const dir = new Vector3((Math.random() - 0.5) * 1.6, Math.random() * 0.8 + 0.3, -0.4 - Math.random() * 0.8).normalize();
    return {
      obj: c, home: c.position.clone(), rot: c.rotation.clone(),
      off: dir.multiplyScalar(spread * (0.7 + Math.random() * 0.6)),
      spin: new Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3),
      delay: Math.random() * 0.35,
    };
  });
}
function applyAssembly(parts, a) {
  for (const P of parts) {
    const k = ss(a, P.delay, P.delay + 0.65);
    const f = (1 - k) * (1 - k);
    P.obj.position.set(P.home.x + P.off.x * f, P.home.y + P.off.y * f, P.home.z + P.off.z * f);
    P.obj.rotation.set(P.rot.x + P.spin.x * f, P.rot.y + P.spin.y * f, P.rot.z + P.spin.z * f);
    P.obj.visible = k > 0.001;
  }
}

/* =====================================================================
   1. FIRE FIGHTING SYSTEM (EDJ skid → header → hydrant + sprinklers)
   ===================================================================== */
function buildFire(px) {
  const g = new Group();
  g.add(at(box(5.2, 0.14, 2.6, M.dark), -0.2, 0.07, 0));

  const pumpEnd = (grp) => {
    grp.add(at(cylX(0.45, 0.45, 0.4, M.red), -1.0, 0.62, 0));
    grp.add(rot(at(new Mesh(new TorusGeometry(0.45, 0.14, 16, 48), M.red), -1.0, 0.62, 0), "y", Math.PI / 2));
    grp.add(at(cylX(0.2, 0.2, 0.5, M.red), -1.45, 0.62, 0));
  };
  const elec = new Group();
  elec.add(at(cylX(0.42, 0.42, 1.3, M.red, 48), 0, 0.62, 0));
  for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; elec.add(rot(at(box(1.2, 0.07, 0.04, M.red), 0, 0.62 + Math.cos(a) * 0.44, Math.sin(a) * 0.44), "x", a)); }
  elec.add(at(cylX(0.38, 0.4, 0.3, M.dark), 0.78, 0.62, 0));
  elec.add(at(box(1.7, 0.2, 0.7, M.dark), -0.2, 0.2, 0));
  pumpEnd(elec);
  elec.position.set(-0.9, 0, 0.75);
  g.add(elec);

  const diesel = new Group();
  diesel.add(at(box(1.2, 0.75, 0.7, M.dark), 0, 0.68, 0));
  diesel.add(at(box(0.9, 0.2, 0.55, M.brushed), 0, 1.15, 0));
  diesel.add(at(box(0.18, 0.95, 0.8, M.red), 0.75, 0.72, 0));
  for (let k = 0; k < 8; k++) diesel.add(at(box(0.02, 0.8, 0.7, M.dark), 0.85, 0.72, -0.3 + k * 0.085));
  diesel.add(at(cyl(0.09, 0.09, 1.1, M.brushed, 16), -0.2, 1.65, -0.2));
  diesel.add(at(cylX(0.16, 0.16, 0.5, M.brushed, 20), -0.2, 2.2, -0.2));
  diesel.add(at(box(1.9, 0.2, 0.75, M.dark), -0.2, 0.2, 0));
  pumpEnd(diesel);
  diesel.position.set(-0.9, 0, -0.75);
  g.add(diesel);

  const jockey = multistage(0.6, M.red);
  jockey.position.set(1.0, 0.14, 0.9);
  g.add(jockey);

  const pipes = new Group();
  pipes.add(at(cylX(0.13, 0.13, 4.6, M.red, 24), 0.2, 2.0, 0));
  [[-1.9, 0.75], [-1.9, -0.75]].forEach(([x, z]) => {
    pipes.add(at(cyl(0.11, 0.11, 1.4, M.red, 20), x, 1.3, z));
    pipes.add(at(cylZ(0.11, 0.11, Math.abs(z), M.red, 20), x, 2.0, z / 2));
    pipes.add(rot(at(new Mesh(new TorusGeometry(0.16, 0.025, 8, 32), M.brushed), x, 1.45, z), "x", Math.PI / 2));
    pipes.add(at(cyl(0.16, 0.16, 0.12, M.red, 20), x, 1.3, z));
  });
  pipes.add(at(cyl(0.06, 0.06, 0.65, M.red, 12), 1.0, 1.7, 0.9));
  pipes.add(at(cylZ(0.06, 0.06, 0.9, M.red, 12), 1.0, 2.0, 0.45));
  const gauge = at(new Group(), 0.4, 2.32, 0.06);
  gauge.add(cylZ(0.15, 0.15, 0.05, M.brushed), at(new Mesh(new CircleGeometry(0.13, 32), M.white), 0, 0, 0.03));
  const needle = at(new Group(), 0, 0, 0.04);
  needle.add(at(box(0.015, 0.11, 0.01, lamp(0xe0201f)), 0, 0.05, 0));
  gauge.add(needle);
  pipes.add(gauge, at(cyl(0.025, 0.025, 0.2, M.brushed, 8), 0.4, 2.15, 0));
  g.add(pipes);

  const panels = new Group();
  const screen = makeScreen();
  panels.add(at(box(0.6, 1.3, 0.38, M.red), 0, 0.85, 0));
  panels.add(at(rot(new Mesh(new PlaneGeometry(0.34, 0.2), screen.mat), "y", Math.PI / 2), 0.31, 1.15, 0));
  const lampRed = at(sphere(0.05, lamp(0xe0201f, 0.2)), 0.31, 0.88, -0.1);
  const lampGreen = at(sphere(0.05, lamp(0x1fc25e, 1.5)), 0.31, 0.88, 0.1);
  const beacon = at(cyl(0.07, 0.07, 0.14, lamp(0xff2a1a, 0.2), 16), 0, 1.57, 0);
  panels.add(lampRed, lampGreen, beacon);
  panels.position.set(2.0, 0.07, -0.75);
  g.add(panels);

  const hyd = new Group();
  hyd.add(at(cyl(0.2, 0.24, 1.1, M.red, 32), 0, 0.55, 0), at(dome(0.22, M.red), 0, 1.1, 0));
  hyd.add(at(cylX(0.08, 0.08, 0.35, M.brushed, 16), 0.3, 0.8, 0), at(cylZ(0.07, 0.07, 0.3, M.brushed, 16), 0, 0.8, 0.28));
  hyd.position.set(3.4, 0, 0.9);
  g.add(hyd);
  g.add(tube([[2.5, 2.0, 0], [3.0, 1.9, 0.2], [3.3, 1.0, 0.8], [3.4, 0.4, 0.9]], 0.1, M.red));

  const sprk = new Group();
  sprk.add(at(cyl(0.08, 0.08, 1.4, M.red, 16), -0.6, 2.7, 0), at(cylX(0.08, 0.08, 4.4, M.red, 16), 0.2, 3.4, 0));
  const heads = [];
  for (let i = 0; i < 5; i++) {
    const x = -1.6 + i * 0.9;
    sprk.add(at(cyl(0.04, 0.04, 0.2, M.red, 10), x, 3.25, 0), at(cyl(0.06, 0.03, 0.08, M.copper, 12), x, 3.12, 0));
    sprk.add(rot(at(new Mesh(new CircleGeometry(0.08, 16), M.copper), x, 3.07, 0), "x", Math.PI / 2));
    heads.push(new Vector3(x, 3.06, 0));
  }
  g.add(sprk);

  const jflow = makeFlow(px, { path: pathOf([[1.0, 0.4, 0.9], [1.0, 2.0, 0.9], [1.0, 2.0, 0], [-0.4, 2.0, 0]]), count: 70, speed: 0.06, jitter: 0.03, size: 0.9, colA: 0x9fe8ff });
  const eflow = makeFlow(px, { path: pathOf([[-2.9, 0.62, 0.75], [-1.9, 0.62, 0.75], [-1.9, 2.0, 0.75], [-1.9, 2.0, 0], [2.5, 2.0, 0], [3.0, 1.9, 0.2], [3.3, 1.0, 0.8], [3.4, 0.8, 0.9]]), count: 260, speed: 0.07, jitter: 0.06, size: 1.2, colA: 0x9fe8ff });
  const dflow = makeFlow(px, { path: pathOf([[-2.9, 0.62, -0.75], [-1.9, 0.62, -0.75], [-1.9, 2.0, -0.75], [-1.9, 2.0, 0], [-0.6, 2.0, 0], [-0.6, 3.4, 0], [2.3, 3.4, 0]]), count: 220, speed: 0.07, jitter: 0.05, size: 1.1, colA: 0x9fe8ff });
  const spray = makeBallistic(px, 2600, { size: 1.7, colA: 0xeafcff, colB: 0x7fd7ff, y0: 0, y1: 3 });
  const smoke = makeBallistic(px, 300, { size: 4.5, colA: 0x8a8f94, additive: false, soft: 0.0 });
  g.add(jflow.points, eflow.points, dflow.points, spray.points, smoke.points);

  let acc = 0, accS = 0;
  return {
    group: g, parts: registerParts(g, 5), rotY: -0.45,
    cams: [[0, [6.2, 4.6, 10.6], [0.3, 1.5, 0]], [0.3, [3.6, 3.0, 5.6], [0.8, 1.6, 0.4]], [0.5, [0.8, 2.4, 6.2], [-1.0, 0.9, 0.6]], [0.66, [-0.2, 3.4, -6.0], [-1.0, 1.4, -0.6]], [0.84, [5.0, 3.8, 8.2], [0.6, 1.7, 0.2]]],
    labels: [
      { text: "Jockey pump", obj: jockey, p: [0, 1.6, 0], t: W1 },
      { text: "Pressure gauge", obj: gauge, p: [0, 0.2, 0], t: W1 },
      { text: "Electric main pump", obj: elec, p: [0, 1.15, 0.3], t: W2 },
      { text: "Pump control panel", obj: panels, p: [0, 1.7, 0], t: W2 },
      { text: "Diesel engine pump", obj: diesel, p: [0, 1.4, -0.3], t: W3 },
      { text: "Sprinkler heads", obj: sprk, p: [0.2, 3.6, 0], t: W4 },
      { text: "Hydrant", obj: hyd, p: [0, 1.5, 0], t: W4 },
    ],
    update(t, l, dt, a) {
      const on = ss(a, 0.9, 1);
      const elecRun = from(l, W2, 0.06), dieselRun = from(l, W3, 0.06), fire = from(l, W4, 0.05);
      const dropping = ss(l, W2[0] - 0.03, W2[0] + 0.03);
      needle.rotation.z = lerp(-0.9, 1.2, dropping) - elecRun * 0.9 + Math.sin(t * 9) * 0.03 * elecRun;
      jockey.userData.fan.rotation.y += dt * 8 * on;
      elec.children[0].position.y = 0.62 + Math.sin(t * 50) * 0.004 * elecRun;
      jflow.update(dt, on * 0.9 * (1 - elecRun * 0.6), 1);
      eflow.update(dt, on * elecRun, 1.4);
      dflow.update(dt, on * dieselRun, 1.4);
      const blink = Math.sin(t * 5) > 0 ? 1 : 0.1;
      lampRed.material.emissiveIntensity = 0.2 + elecRun * 2.4 * blink;
      lampGreen.material.emissiveIntensity = 0.2 + (1 - dropping) * 1.6;
      beacon.material.emissiveIntensity = 0.2 + (dropping * 3) * (0.5 + 0.5 * Math.sin(t * 9));
      screen.draw(
        fire > 0.5 ? ["FIRE MODE", "Sprinkler + hydrant", "All pumps running"]
          : dieselRun > 0.5 ? ["DIESEL RUN", "Main + diesel ON", "Header 7.0 bar"]
            : elecRun > 0.5 ? ["MAIN PUMP RUN", "Pressure restoring", "Electric pump ON"]
              : dropping > 0.5 ? ["PRESSURE LOW", "Header 4.2 bar", "Start signal"]
                : ["STANDBY", "Header 7.0 bar", "Jockey: auto"],
        fire > 0.5 || dropping > 0.5 ? "#ff5a4a" : "#38e27f");
      // diesel exhaust smoke
      accS += dt * 40 * dieselRun * on;
      while (accS >= 1) { accS -= 1; smoke.emit(-0.92, 2.25, -0.95, 0.15 + Math.random() * 0.15, 0.6 + Math.random() * 0.3, (Math.random() - 0.5) * 0.2, 0.45); }
      smoke.update(dt, on * 0.35, -0.2, -99, 0.4);
      acc += dt * 1100 * fire * on;
      while (acc >= 1) {
        acc -= 1;
        if (Math.random() < 0.72) {
          const h = heads[(Math.random() * heads.length) | 0], ang = Math.random() * TAU, sp = 0.6 + Math.random() * 1.1;
          spray.emit(h.x, h.y, h.z, Math.cos(ang) * sp, -0.4 - Math.random() * 0.6, Math.sin(ang) * sp, 0.55);
        } else spray.emit(3.68, 0.8, 0.9, 2.6 + Math.random() * 0.5, 3.0 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3, 0.55);
      }
      spray.update(dt, on * Math.min(1, fire * 1.5), 4.5, 0.05);
    },
  };
}

/* =====================================================================
   2. MINERAL WATER PLANT (treatment → RFC → shrink wrap → dispatch)
   ===================================================================== */
function buildMineral(px) {
  const g = new Group();
  g.add(at(box(8.2, 0.08, 4.2, M.concrete), 0, 0.04, -0.4));

  // treatment line along the back
  const treat = new Group();
  const raw = at(new Group(), -3.4, 0.08, -1.6);
  raw.add(at(cyl(0.5, 0.5, 1.7, M.white, 40), 0, 0.85, 0), at(cyl(0.52, 0.52, 0.06, M.white), 0, 1.72, 0));
  const v1 = vesselFRP(0.26, 1.2); v1.position.set(-2.5, 0.08, -1.6);
  const v2 = vesselFRP(0.26, 1.2); v2.position.set(-1.95, 0.08, -1.6);
  const membrane = new Group();
  for (let i = 0; i < 3; i++) membrane.add(at(cylX(0.11, 0.11, 1.3, M.steel, 24), 0, 0.6 + i * 0.28, 0));
  membrane.add(at(box(0.05, 1.0, 0.35, M.brushed), -0.6, 0.6, 0), at(box(0.05, 1.0, 0.35, M.brushed), 0.6, 0.6, 0));
  membrane.position.set(-0.95, 0.08, -1.6);
  const uv = at(new Group(), 0.3, 0.08, -1.6);
  uv.add(at(cylX(0.12, 0.12, 0.9, M.steel, 24), 0, 0.9, 0), at(box(0.25, 0.4, 0.2, M.white), 0, 0.45, 0));
  const uvGlow = at(cylX(0.06, 0.06, 0.92, lamp(0x8a7dff, 0.4), 16), 0, 0.9, 0.13);
  uv.add(uvGlow);
  const ozone = at(new Group(), 1.15, 0.08, -1.6);
  ozone.add(at(box(0.5, 0.9, 0.35, M.white), 0, 0.45, 0), at(box(0.3, 0.15, 0.01, lamp(0x38e27f, 0.9)), 0, 0.7, 0.18));
  const tank = at(new Group(), 2.2, 0.08, -1.6);
  tank.add(at(cyl(0.55, 0.55, 1.6, M.steel, 40), 0, 0.85, 0), at(dome(0.55, M.steel), 0, 1.65, 0), at(cyl(0.3, 0.3, 0.12, M.brushed), 0, 0.06, 0));
  treat.add(raw, v1, v2, membrane, uv, ozone, tank);
  treat.add(tube([[-2.9, 0.4, -1.6], [-2.5, 0.4, -1.4], [-1.95, 0.4, -1.4], [-1.6, 0.6, -1.4], [-0.3, 0.6, -1.4], [0.3, 0.9, -1.4], [1.15, 0.9, -1.4], [2.2, 0.4, -1.2]], 0.04, M.steel, 120));
  treat.add(tube([[2.2, 1.9, -1.6], [1.4, 2.1, -1.0], [-0.6, 2.0, 0.0], [-1.0, 1.75, 0.35]], 0.04, M.steel, 80));
  g.add(treat);
  const tflow = makeFlow(px, { path: pathOf([[-3.4, 1.4, -1.6], [-2.9, 0.4, -1.4], [-2.5, 0.4, -1.4], [-1.95, 0.4, -1.4], [-1.6, 0.6, -1.4], [-0.3, 0.6, -1.4], [0.3, 0.9, -1.4], [1.15, 0.9, -1.4], [2.2, 0.4, -1.2], [2.2, 1.9, -1.6], [1.4, 2.1, -1.0], [-0.6, 2.0, 0.0], [-1.0, 1.75, 0.35]]), count: 320, speed: 0.05, jitter: 0.04, size: 1.1, colA: 0x7fe9ff });
  g.add(tflow.points);

  // conveyor with moving slats
  const conv = new Group();
  const bc = document.createElement("canvas"); bc.width = 64; bc.height = 16;
  const bx = bc.getContext("2d"); bx.fillStyle = "#2b3136"; bx.fillRect(0, 0, 64, 16); bx.fillStyle = "#3d454b"; bx.fillRect(0, 0, 6, 16);
  const beltTex = new CanvasTexture(bc); beltTex.wrapS = beltTex.wrapT = RepeatWrapping; beltTex.repeat.set(40, 1);
  conv.add(at(box(7.6, 0.06, 0.42, new MeshStandardMaterial({ map: beltTex, roughness: 0.6 })), 0, 0.83, 0.45));
  conv.add(at(box(7.6, 0.12, 0.05, M.steel), 0, 0.84, 0.69), at(box(7.6, 0.12, 0.05, M.steel), 0, 0.84, 0.21));
  for (let i = 0; i < 6; i++) conv.add(at(box(0.06, 0.8, 0.45, M.brushed), -3.6 + i * 1.44, 0.4, 0.45));
  g.add(conv);

  // RFC machine
  const rfc = at(new Group(), -0.75, 0.08, 0.45);
  rfc.add(at(box(1.7, 0.08, 1.1, M.steel), 0, 2.0, 0));
  [[-0.82, -0.52], [0.82, -0.52], [-0.82, 0.52], [0.82, 0.52]].forEach(([x, z]) => rfc.add(at(box(0.06, 2.0, 0.06, M.steel), x, 1.0, z)));
  rfc.add(at(box(1.64, 1.1, 0.02, M.glass), 0, 1.45, 0.52), at(box(1.64, 1.1, 0.02, M.glass), 0, 1.45, -0.52));
  const fillHead = at(new Group(), -0.35, 1.45, 0);
  fillHead.add(box(0.5, 0.12, 0.2, M.steel));
  for (let k = 0; k < 3; k++) fillHead.add(at(cyl(0.015, 0.015, 0.3, M.steel, 8), -0.15 + k * 0.15, -0.2, 0));
  const capHead = at(new Group(), 0.5, 1.5, 0);
  capHead.add(cyl(0.09, 0.09, 0.25, M.steel), at(cyl(0.05, 0.05, 0.25, M.dark), 0, -0.2, 0));
  const capChute = tube([[0.95, 2.1, -0.3], [0.8, 1.9, -0.2], [0.55, 1.7, 0]], 0.035, M.brushed);
  const turret = at(cyl(0.35, 0.35, 0.12, M.steel, 40), 0, 2.1, 0);
  rfc.add(fillHead, capHead, capChute, turret);
  g.add(rfc);

  // shrink tunnel
  const tunnel = at(new Group(), 1.9, 0.08, 0.45);
  tunnel.add(at(box(1.2, 0.08, 0.7, M.steel), 0, 1.35, 0), at(box(1.2, 0.5, 0.05, M.steel), 0, 1.1, 0.33), at(box(1.2, 0.5, 0.05, M.steel), 0, 1.1, -0.33));
  const heat = [];
  for (let k = 0; k < 6; k++) { const h = at(box(0.12, 0.02, 0.5, lamp(0xff7a1a, 0.4)), -0.45 + k * 0.18, 1.3, 0); heat.push(h); tunnel.add(h); }
  [-0.6, 0.6].forEach((x) => tunnel.add(at(box(0.02, 0.45, 0.6, new MeshStandardMaterial({ color: 0x334, transparent: true, opacity: 0.35 })), x, 1.12, 0)));
  g.add(tunnel);

  // bottles: PET body, water, green label, cap, shrink film
  const prof = [[0.001, 0], [0.07, 0], [0.075, 0.02], [0.075, 0.26], [0.06, 0.32], [0.03, 0.37], [0.022, 0.38], [0.022, 0.41]].map(([x, y]) => new Vector2(x, y));
  const bodyGeo = new LatheGeometry(prof, 24);
  const petMat = new MeshPhysicalMaterial({ color: 0xd8efff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, clearcoat: 1, side: DoubleSide, depthWrite: false });
  const watGeo = new CylinderGeometry(0.068, 0.068, 0.3, 20); watGeo.translate(0, 0.15, 0);
  const watMat = waterMat(0x6fd6ff, 0.55);
  const labMat = new MeshStandardMaterial({ map: labelTexture("OM JYOTI"), roughness: 0.5 });
  const capMat = new MeshStandardMaterial({ color: 0x0c7a3a, roughness: 0.4 });
  const filmMat = new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.1, transparent: true, opacity: 0.22, clearcoat: 1, depthWrite: false });
  const N = 18, bottles = [];
  const line = new Group();
  line.userData.static = true;
  g.add(line);
  for (let i = 0; i < N; i++) {
    const b = new Group();
    b.add(new Mesh(bodyGeo, petMat));
    const w = at(new Mesh(watGeo, watMat), 0, 0.012, 0);
    const lab = at(new Mesh(new CylinderGeometry(0.077, 0.077, 0.08, 24, 1, true), labMat), 0, 0.15, 0);
    const cap = at(cyl(0.028, 0.028, 0.035, capMat, 16), 0, 0.42, 0);
    const film = at(cyl(0.085, 0.085, 0.44, filmMat, 16), 0, 0.22, 0);
    b.add(w, lab, cap, film);
    b.userData = { w, cap, film, lab };
    line.add(b);
    bottles.push(b);
  }
  // pallet of finished packs
  const pallet = at(new Group(), 3.6, 0.08, 1.5);
  pallet.add(at(box(1.0, 0.12, 0.8, new MeshStandardMaterial({ color: 0x9a6b3c, roughness: 0.9 })), 0, 0.06, 0));
  const packs = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
    const pk = at(box(0.42, 0.38, 0.34, filmMat), -0.22 + c * 0.44, 0.32 + r * 0.4, 0);
    pk.add(at(box(0.38, 0.06, 0.3, labMat), 0, -0.05, 0));
    pallet.add(pk);
    packs.push(pk);
  }
  g.add(pallet);
  const mist = makeBallistic(px, 300, { size: 0.9, colA: 0xd8f6ff });
  g.add(mist.points);

  let accM = 0, scroll = 0;
  return {
    group: g, parts: registerParts(g, 5), rotY: -0.3,
    cams: [[0, [5.8, 4.6, 9.4], [0, 1.0, -0.4]], [0.3, [1.2, 3.2, 3.6], [-0.6, 1.0, -1.6]], [0.5, [-0.4, 1.8, 2.8], [-0.5, 1.15, 0.45]], [0.66, [3.4, 1.9, 3.0], [2.0, 1.0, 0.45]], [0.84, [6.4, 3.8, 6.6], [2.4, 0.8, 0.6]]],
    labels: [
      { text: "RO purification", obj: membrane, p: [0, 1.4, 0], t: W1 },
      { text: "UV steriliser", obj: uv, p: [0, 1.25, 0], t: W1 },
      { text: "Ozone generator", obj: ozone, p: [0, 1.2, 0], t: W1 },
      { text: "Filling heads", obj: fillHead, p: [0, 0.3, 0], t: W2 },
      { text: "Capping", obj: capHead, p: [0, 0.35, 0], t: W2 },
      { text: "Shrink wrap tunnel", obj: tunnel, p: [0, 1.65, 0], t: W3 },
      { text: "Packs for dispatch", obj: pallet, p: [0, 1.6, 0], t: W4 },
    ],
    update(t, l, dt, a) {
      const on = ss(a, 0.9, 1);
      tflow.update(dt, on * (0.35 + inWin(l, W1) * 0.65), 1);
      uvGlow.material.emissiveIntensity = 0.5 + on * (1.2 + Math.sin(t * 7) * 0.3);
      const speed = 0.38 * on;
      scroll += dt * speed;
      beltTex.offset.x = -scroll * (40 / 7.6);
      turret.rotation.y += dt * 1.2 * on;
      fillHead.position.y = 1.45 + Math.abs(Math.sin(t * 2.4)) * -0.05 * on;
      capHead.rotation.y += dt * 6 * on;
      heat.forEach((h, k) => (h.material.emissiveIntensity = 0.4 + on * (1.6 + Math.sin(t * 4 + k) * 0.6)));
      const L = 7.4;
      bottles.forEach((b, i) => {
        const x = ((((i / N) * L + scroll) % L) + L) % L - L / 2;
        b.position.set(x, 0.86, 0.45);
        b.visible = a > 0.85;
        const fill = ss(x, -1.25, -0.55);
        b.userData.w.scale.y = Math.max(0.001, fill * 0.85);
        b.userData.w.visible = fill > 0.01;
        const capT = ss(x, 0.25, 0.55);
        b.userData.cap.visible = x > 0.15;
        b.userData.cap.position.y = 0.42 + (1 - capT) * 0.45;
        b.userData.film.visible = x > 1.95;
        b.userData.lab.visible = x > -2.2;
      });
      accM += dt * 120 * on;
      while (accM >= 1) { accM -= 1; mist.emit(-2.2 + (Math.random() - 0.5) * 0.3, 1.5, 0.45 + (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.3, -1.2, (Math.random() - 0.5) * 0.3, 1.6); }
      mist.update(dt, on * 0.6, 1, 0.85);
      const shown = Math.round(ss(l, W4[0], W4[1] - 0.05) * packs.length + (l > W4[1] ? packs.length : 0));
      packs.forEach((p, k) => { p.visible = k < Math.max(2, shown); });
    },
  };
}

/* =====================================================================
   3. STP / WTP (screen → MBBR aeration → clarifier → filters → reuse)
   ===================================================================== */
function buildSTP(px) {
  const g = new Group();
  g.add(at(box(9.4, 0.1, 3.0, M.concrete), 0.2, -0.05, 0));
  const D = 1.6, H = 1.5;
  const tankShell = (x0, x1) => {
    const t = new Group();
    const w = x1 - x0, cx = (x0 + x1) / 2;
    t.add(at(box(w, 0.08, D, M.concrete), cx, 0.04, 0));
    t.add(at(box(w, H, 0.08, M.concrete), cx, H / 2, -D / 2));
    t.add(at(box(0.08, H, D, M.concrete), x0, H / 2, 0), at(box(0.08, H, D, M.concrete), x1, H / 2, 0));
    t.add(at(box(w, H, 0.02, M.glass), cx, H / 2, D / 2));
    t.add(at(box(w, 0.05, 0.08, M.brushed), cx, H, D / 2));
    return t;
  };
  const water = (x0, x1, level, hex, op = 0.62) => at(box(x1 - x0 - 0.1, level, D - 0.12, waterMat(hex, op)), (x0 + x1) / 2, 0.08 + level / 2, 0);

  // 1 screen + equalisation
  const t1 = tankShell(-4.2, -2.6);
  t1.add(water(-4.2, -2.6, 1.15, 0x6b4f2a, 0.78));
  const screen = at(new Group(), -3.95, 0.7, 0);
  for (let k = 0; k < 9; k++) screen.add(at(box(0.02, 1.3, 0.02, M.steel), 0, 0, -0.65 + k * 0.16));
  screen.rotation.z = 0.25;
  t1.add(screen);
  g.add(t1);
  // 2 MBBR aeration
  const t2 = tankShell(-2.5, -0.5);
  t2.add(water(-2.5, -0.5, 1.2, 0x7c6a45, 0.6));
  for (let k = 0; k < 5; k++) t2.add(at(cylX(0.03, 0.03, 1.8, M.white, 10), -1.5, 0.16, -0.6 + k * 0.3));
  t2.add(tube([[-0.7, 1.7, -0.6], [-0.7, 0.2, -0.6], [-1.5, 0.16, -0.6]], 0.04, M.white));
  g.add(t2);
  const blower = at(new Group(), -1.5, 0.05, -1.25);
  blower.add(at(box(0.6, 0.4, 0.4, M.blue), 0, 0.25, 0), at(cyl(0.12, 0.12, 0.3, M.brushed), 0.2, 0.55, 0));
  g.add(blower);
  // 3 clarifier with tube settlers + sludge hopper
  const t3 = tankShell(-0.4, 1.3);
  t3.add(water(-0.4, 1.3, 1.25, 0x8fa79a, 0.45));
  const settler = at(new Group(), 0.45, 0.9, 0);
  for (let k = 0; k < 10; k++) settler.add(rot(at(box(0.02, 0.5, 1.4, M.white), -0.5 + k * 0.11, 0, 0), "z", 0.95));
  t3.add(settler);
  t3.add(at(cyl(0.6, 0.05, 0.45, M.concrete, 30), 0.45, 0.3, 0));
  g.add(t3);
  // 4 filters + dosing
  const f1 = vesselFRP(0.25, 1.1); f1.position.set(1.85, 0.05, 0.2);
  const f2 = vesselFRP(0.25, 1.1); f2.position.set(2.45, 0.05, 0.2);
  const dosing = at(new Group(), 2.15, 0.05, -0.85);
  dosing.add(at(cyl(0.2, 0.2, 0.6, M.white, 24), 0, 0.3, 0), at(cyl(0.08, 0.08, 0.15, M.blue, 16), 0, 0.68, 0));
  g.add(f1, f2, dosing);
  // 5 treated water tank + reuse garden
  const t5 = tankShell(3.0, 4.1);
  const cleanWater = water(3.0, 4.1, 0.2, 0x4fd8c4, 0.5);
  t5.add(cleanWater);
  g.add(t5);
  const garden = at(new Group(), 4.85, 0.0, 0.3);
  garden.add(at(box(1.2, 0.06, 1.8, new MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 })), 0, 0.03, 0));
  [[-0.3, -0.5], [0.3, 0.4], [-0.2, 0.6]].forEach(([x, z]) => garden.add(at(cyl(0.04, 0.05, 0.3, new MeshStandardMaterial({ color: 0x5d4037 }), 8), x, 0.2, z), at(new Mesh(new SphereGeometry(0.22, 16, 10), new MeshStandardMaterial({ color: 0x388e3c, roughness: 0.8 })), x, 0.5, z)));
  garden.add(at(cyl(0.03, 0.03, 0.35, M.brushed, 8), 0, 0.2, -0.1));
  g.add(garden);
  g.add(tube([[-5.0, 1.0, 0.2], [-4.2, 1.0, 0.2]], 0.07, M.dark), tube([[1.2, 1.1, 0.3], [1.6, 1.1, 0.4], [1.85, 1.5, 0.2]], 0.05, M.brushed), tube([[2.45, 0.5, 0.2], [2.8, 0.5, 0.3], [3.1, 0.5, 0.3]], 0.05, M.brushed), tube([[4.0, 0.25, 0.3], [4.6, 0.2, 0.3], [4.85, 0.35, 0.2]], 0.04, M.brushed));

  const inflow = makeFlow(px, { path: pathOf([[-5.2, 1.0, 0.2], [-4.0, 1.0, 0.2], [-3.4, 0.9, 0.2], [-2.6, 0.8, 0.2], [-2.0, 0.9, 0.3]]), count: 160, speed: 0.06, jitter: 0.08, size: 1.4, colA: 0x9a6e34, additive: false });
  const midflow = makeFlow(px, { path: pathOf([[-0.6, 1.0, 0.3], [-0.2, 1.1, 0.3], [0.6, 1.2, 0.3], [1.3, 1.1, 0.3], [1.85, 1.5, 0.2], [1.85, 0.4, 0.2], [2.45, 1.5, 0.2], [2.45, 0.4, 0.2], [3.1, 0.5, 0.3], [3.5, 0.3, 0.3]]), count: 200, speed: 0.05, jitter: 0.05, size: 1.1, colA: 0x9fe8ff, colB: 0xb59a64, y0: 0.2, y1: 1.4 });
  const reuse = makeBallistic(px, 300, { size: 1.0, colA: 0xbff3ff });
  const bubbles = makeBallistic(px, 700, { size: 1.1, colA: 0xf2fbff });
  const sludge = makeBallistic(px, 260, { size: 1.3, colA: 0x5a4024, additive: false });
  g.add(inflow.points, midflow.points, reuse.points, bubbles.points, sludge.points);
  // MBBR media carriers rolling with the aeration
  const MEDIA = 160;
  const media = new InstancedMesh(new CylinderGeometry(0.035, 0.035, 0.035, 8, 1, true), new MeshStandardMaterial({ color: 0x2fbf62, roughness: 0.5, side: DoubleSide }), MEDIA);
  const md = Array.from({ length: MEDIA }, () => ({ a: Math.random() * TAU, r: 0.25 + Math.random() * 0.7, z: (Math.random() - 0.5) * 1.3, s: 0.6 + Math.random() * 0.8, rx: Math.random() * TAU }));
  const dummy = new Object3D();
  t2.add(media);

  let accB = 0, accS = 0, accR = 0;
  return {
    group: g, parts: registerParts(g, 5), rotY: -0.15, floorY: -0.11,
    cams: [[0, [4.6, 5.4, 11.0], [0, 0.7, 0]], [0.3, [-2.4, 2.8, 4.8], [-3.4, 0.7, 0]], [0.5, [-0.6, 2.2, 4.2], [-1.5, 0.7, 0]], [0.66, [1.4, 2.4, 4.2], [0.5, 0.7, 0]], [0.84, [5.6, 3.2, 6.6], [3.2, 0.6, 0.2]]],
    labels: [
      { text: "Bar screen", obj: screen, p: [0, 0.8, 0], t: W1 },
      { text: "Equalisation tank", obj: t1, p: [-3.4, 1.7, 0], t: W1 },
      { text: "MBBR aeration", obj: t2, p: [-1.5, 1.75, 0], t: W2 },
      { text: "Air blower", obj: blower, p: [0, 0.8, 0], t: W2 },
      { text: "Tube settler clarifier", obj: t3, p: [0.45, 1.75, 0], t: W3 },
      { text: "Sand & carbon filters", obj: f1, p: [0.3, 1.9, 0], t: W4 },
      { text: "Reuse: gardening & flushing", obj: garden, p: [0, 0.9, 0], t: W4 },
    ],
    update(t, l, dt, a) {
      const on = ss(a, 0.9, 1);
      inflow.update(dt, on * 0.9, 1);
      midflow.update(dt, on * (0.3 + from(l, W3) * 0.7), 1);
      accB += dt * 260 * on;
      while (accB >= 1) { accB -= 1; bubbles.emit(-2.4 + Math.random() * 1.8, 0.2, (Math.random() - 0.5) * 1.3, (Math.random() - 0.5) * 0.1, 0.7 + Math.random() * 0.5, 0, 0.9); }
      bubbles.update(dt, on * 0.85, -0.2, -99);
      for (let i = 0; i < MEDIA; i++) {
        const m = md[i];
        m.a += dt * 0.6 * m.s * on;
        dummy.position.set(-1.5 + Math.cos(m.a) * m.r * 0.85, 0.7 + Math.sin(m.a) * m.r * 0.5, m.z);
        dummy.rotation.set(m.rx + m.a * 2, m.a, 0);
        dummy.updateMatrix();
        media.setMatrixAt(i, dummy.matrix);
      }
      media.instanceMatrix.needsUpdate = true;
      accS += dt * 60 * on;
      while (accS >= 1) { accS -= 1; sludge.emit(-0.1 + Math.random() * 1.1, 1.2, (Math.random() - 0.5) * 1.2, 0, -0.25 - Math.random() * 0.15, 0, 0.35); }
      sludge.update(dt, on * 0.9, 0, 0.12);
      const fill = from(l, W4, 0.12);
      cleanWater.scale.y = Math.max(0.05, lerp(1, 5.5, fill));
      cleanWater.position.y = 0.08 + (0.2 * cleanWater.scale.y) / 2;
      accR += dt * 140 * fill * on;
      while (accR >= 1) { accR -= 1; const ang = Math.random() * TAU; reuse.emit(4.85, 0.4, 0.2, Math.cos(ang) * 0.6, 1.2 + Math.random() * 0.5, Math.sin(ang) * 0.6, 0.9); }
      reuse.update(dt, on * fill, 3.5, 0.08);
    },
  };
}

/* =====================================================================
   4. RAIN WATER HARVESTING (roof → filter → modular storage → recharge)
   ===================================================================== */
function buildRWH(px) {
  const g = new Group();
  const X0 = -3.8, X1 = 3.8, ZB = -1.8;
  const hole = { x0: 0.2, x1: 3.2, y0: -1.35, y1: -0.12, z0: -1.1 };
  const layers = [
    { y0: -0.35, y1: 0, mat: new MeshStandardMaterial({ color: 0x4a3626, roughness: 1 }) },
    { y0: -1.05, y1: -0.35, mat: new MeshStandardMaterial({ color: 0xb08e57, roughness: 1 }) },
    { y0: -1.85, y1: -1.05, mat: new MeshStandardMaterial({ color: 0x6d6a63, roughness: 1 }) },
  ];
  const soil = new Group();
  const sb = (x0, x1, y0, y1, z0, z1, mat) => { if (x1 - x0 < 0.001 || y1 - y0 < 0.001 || z1 - z0 < 0.001) return; soil.add(at(box(x1 - x0, y1 - y0, z1 - z0, mat), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)); };
  layers.forEach(({ y0, y1, mat }) => {
    const oy0 = Math.max(y0, hole.y0), oy1 = Math.min(y1, hole.y1);
    if (oy1 <= oy0) { sb(X0, X1, y0, y1, ZB, 0, mat); return; }
    sb(X0, X1, y0, oy0, ZB, 0, mat);
    sb(X0, X1, oy1, y1, ZB, 0, mat);
    sb(X0, hole.x0, oy0, oy1, ZB, 0, mat);
    sb(hole.x1, X1, oy0, oy1, ZB, 0, mat);
    sb(hole.x0, hole.x1, oy0, oy1, ZB, hole.z0, mat);
  });
  const aquifer = at(box(X1 - X0, 0.45, -ZB, waterMat(0x2c6ea6, 0.75)), 0, -2.08, ZB / 2);
  soil.add(aquifer);
  g.add(soil);
  // surface: grass + paved parking over the storage
  const surf = new Group();
  surf.add(at(box(hole.x0 - X0, 0.04, -ZB, new MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.9 })), (X0 + hole.x0) / 2, 0.02, ZB / 2));
  surf.add(at(box(X1 - hole.x0, 0.06, -ZB, new MeshStandardMaterial({ color: 0x2f3337, roughness: 0.8 })), (hole.x0 + X1) / 2, -0.03, ZB / 2));
  for (let k = 0; k < 4; k++) surf.add(at(box(0.04, 0.01, 1.0, M.white), 0.8 + k * 0.8, 0.005, -1.1));
  surf.add(at(box(X1 - hole.x0, 0.02, 0.08, M.white), (hole.x0 + X1) / 2, 0.005, -0.15));
  g.add(surf);
  // house with gable roof, gutter, downpipe
  const house = at(new Group(), -2.6, 0.04, -0.95);
  house.add(at(box(1.7, 1.25, 1.3, new MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.9 })), 0, 0.625, 0));
  house.add(at(box(0.35, 0.6, 0.02, new MeshStandardMaterial({ color: 0x6b4f35 })), 0.3, 0.3, 0.66), at(box(0.4, 0.3, 0.02, M.glass), -0.4, 0.75, 0.66));
  const rs = new Shape(); rs.moveTo(-0.85, 0); rs.lineTo(0.85, 0); rs.lineTo(0, 0.6); rs.closePath();
  const roofGeo = new ExtrudeGeometry(rs, { depth: 1.95, bevelEnabled: false });
  roofGeo.translate(0, 0, -0.975); roofGeo.rotateY(Math.PI / 2);
  house.add(at(new Mesh(roofGeo, new MeshStandardMaterial({ color: 0x9b3b2a, roughness: 0.7 })), 0, 1.25, 0));
  house.add(at(cylX(0.06, 0.06, 1.95, M.brushed, 12), 0, 1.22, 0.86));
  house.add(at(cyl(0.05, 0.05, 1.2, M.brushed, 12), 0.95, 0.62, 0.86));
  g.add(house);
  // filter unit beside the house
  const filter = at(new Group(), -1.25, 0.04, -0.1);
  filter.add(at(cyl(0.22, 0.22, 0.6, M.glass, 24), 0, 0.35, 0), at(cyl(0.18, 0.18, 0.45, new MeshStandardMaterial({ color: 0x9aa3a8, wireframe: true }), 12), 0, 0.35, 0), at(cyl(0.24, 0.24, 0.06, M.dark, 24), 0, 0.68, 0), at(cyl(0.24, 0.24, 0.06, M.dark, 24), 0, 0.04, 0));
  g.add(filter);
  g.add(tube([[-1.65, 0.05, -0.09], [-1.45, 0.5, -0.09], [-1.25, 0.65, -0.1]], 0.05, M.brushed), tube([[-1.25, 0.0, -0.1], [-1.25, -0.5, 0.04], [-0.4, -0.5, 0.04], [hole.x0 + 0.05, -0.5, 0.04]], 0.06, M.brushed));
  // modular storage crates (lattice blocks)
  const lc = document.createElement("canvas"); lc.width = lc.height = 64;
  const lx = lc.getContext("2d"); lx.clearRect(0, 0, 64, 64); lx.strokeStyle = "#cfd8dc"; lx.lineWidth = 6;
  for (let k = 0; k <= 4; k++) { lx.beginPath(); lx.moveTo(k * 16, 0); lx.lineTo(k * 16, 64); lx.stroke(); lx.beginPath(); lx.moveTo(0, k * 16); lx.lineTo(64, k * 16); lx.stroke(); }
  const crateMat = new MeshStandardMaterial({ map: new CanvasTexture(lc), transparent: true, alphaTest: 0.4, side: DoubleSide, roughness: 0.6 });
  const crates = new Group();
  const CW = (hole.x1 - hole.x0 - 0.1) / 5, CH = (hole.y1 - hole.y0 - 0.08) / 2;
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) crates.add(at(box(CW * 0.97, CH * 0.97, 0.95, crateMat), hole.x0 + 0.05 + CW * (i + 0.5), hole.y0 + 0.04 + CH * (j + 0.5), -0.55));
  g.add(crates);
  const stored = at(box(hole.x1 - hole.x0 - 0.12, 1, 0.92, waterMat(0x3aa0e0, 0.5)), (hole.x0 + hole.x1) / 2, hole.y0 + 0.05, -0.55);
  stored.geometry.translate(0, 0.5, 0);
  g.add(stored);
  // clouds
  const clouds = new Group();
  const cm = new MeshStandardMaterial({ color: 0x9aa4ab, roughness: 1, transparent: true, opacity: 0.85 });
  [[-2.4, 4.4, -0.8], [0.2, 4.7, -1.0], [2.6, 4.5, -0.7]].forEach(([x, y, z]) => { const c = at(new Group(), x, y, z); [[0, 0, 0, 0.6], [0.55, -0.1, 0.1, 0.45], [-0.55, -0.12, 0, 0.42], [0.2, 0.25, -0.1, 0.4]].forEach(([a, b, d, r]) => c.add(at(sphere(r, cm, 16), a, b, d))); c.scale.set(1.3, 0.6, 0.9); clouds.add(c); });
  g.add(clouds);

  const rain = makeBallistic(px, 1400, { size: 1.0, colA: 0xbfe6ff });
  const runoff = makeFlow(px, { path: pathOf([[-2.6, 1.85, -0.95], [-2.6, 1.3, -0.1], [-1.65, 1.26, -0.09], [-1.65, 0.1, -0.09], [-1.45, 0.5, -0.09], [-1.25, 0.65, -0.1], [-1.25, 0.0, -0.1], [-1.25, -0.5, 0.04], [hole.x0 + 0.3, -0.5, 0.04], [1.0, -1.0, -0.2]]), count: 220, speed: 0.06, jitter: 0.04, size: 1.2, colA: 0x7fd0ff });
  const recharge = makeBallistic(px, 600, { size: 1.0, colA: 0x5fb8ff });
  g.add(rain.points, runoff.points, recharge.points);
  let accR = 0, accC = 0;
  return {
    group: g, parts: registerParts(g, 5), rotY: -0.25, floorY: -2.4,
    cams: [[0, [5.2, 4.8, 10.6], [0, 0.4, -0.6]], [0.3, [-0.8, 2.8, 4.6], [-2.4, 1.0, -0.8]], [0.5, [0.0, 1.4, 3.6], [-1.1, 0.1, -0.2]], [0.66, [3.0, 0.6, 4.4], [1.7, -0.7, -0.5]], [0.84, [2.6, -0.4, 6.4], [0.8, -1.3, -0.6]]],
    labels: [
      { text: "Rooftop catchment", obj: house, p: [0, 2.0, 0], t: W1 },
      { text: "Gutter & downpipe", obj: house, p: [0.95, 1.3, 0.86], t: W1 },
      { text: "Filtration unit", obj: filter, p: [0, 0.95, 0], t: W2 },
      { text: "Modular storage blocks", obj: crates, p: [1.7, -0.3, -0.1], t: W3 },
      { text: "Parking above the tank", obj: surf, p: [2.4, 0.1, -0.6], t: W3 },
      { text: "Groundwater recharge", obj: soil, p: [1.7, -1.6, 0.05], t: W4 },
    ],
    update(t, l, dt, a) {
      const on = ss(a, 0.9, 1);
      const raining = on * (1 - ss(l, W4[0] + 0.04, W4[1]));
      accR += dt * 700 * raining;
      while (accR >= 1) { accR -= 1; rain.emit(X0 + Math.random() * (X1 - X0), 4.3, ZB + Math.random() * 1.9, 0.15, -6 - Math.random() * 2, 0, 0.2); }
      rain.update(dt, raining * 0.8, 2, 0.02);
      runoff.update(dt, raining * 0.95, 1);
      const level = ss(l, W2[1] - 0.06, W3[1]) * (1 - ss(l, W4[0], W4[1]) * 0.45);
      stored.scale.y = Math.max(0.02, level * (hole.y1 - hole.y0 - 0.2));
      const rech = from(l, W4, 0.04) * on;
      accC += dt * 260 * rech;
      while (accC >= 1) { accC -= 1; recharge.emit(hole.x0 + 0.2 + Math.random() * (hole.x1 - hole.x0 - 0.4), hole.y0 - 0.02, 0.04 + Math.random() * 0.06, (Math.random() - 0.5) * 0.15, -0.25 - Math.random() * 0.2, 0, 0.45); }
      recharge.update(dt, rech, 0.05, -2.3);
      aquifer.scale.y = 1 + rech * 0.35;
      aquifer.position.y = -2.08 + (0.45 * (aquifer.scale.y - 1)) / 2;
      clouds.position.x = Math.sin(t * 0.1) * 0.3;
    },
  };
}

/* =====================================================================
   5. HYDROPNEUMATIC SYSTEM (pumps + pressure vessel + VFD → building)
   ===================================================================== */
function buildHydro(px) {
  const g = new Group();
  g.add(at(box(3.4, 0.12, 1.8, M.dark), -2.0, 0.06, 0));
  const pumps = [-2.9, -2.3, -1.7].map((x) => { const p = multistage(0.8, M.blue); p.position.set(x, 0.12, 0); g.add(p); return p; });
  const leds = pumps.map((p) => { const l = at(sphere(0.04, lamp(0x1fc25e, 0.2)), 0, 1.25, 0.2); p.add(l); return l; });
  const hdrs = new Group();
  hdrs.add(at(cylX(0.08, 0.08, 2.0, M.steel, 20), -2.3, 0.3, 0.45), at(cylX(0.08, 0.08, 2.4, M.steel, 20), -2.1, 1.25, -0.35));
  pumps.forEach((p) => { hdrs.add(at(cylZ(0.05, 0.05, 0.45, M.steel, 12), p.position.x, 0.3, 0.22)); hdrs.add(tube([[p.position.x, 1.0, -0.05], [p.position.x, 1.25, -0.2], [p.position.x, 1.25, -0.35]], 0.05, M.steel, 16)); hdrs.add(at(cyl(0.08, 0.08, 0.12, M.brushed, 16), p.position.x, 1.1, -0.1)); });
  const gauge = at(new Group(), -1.4, 1.55, -0.35);
  gauge.add(cylZ(0.14, 0.14, 0.05, M.brushed), at(new Mesh(new CircleGeometry(0.12, 32), M.white), 0, 0, 0.03));
  const needle = at(new Group(), 0, 0, 0.04);
  needle.add(at(box(0.015, 0.1, 0.01, lamp(0xe0201f)), 0, 0.045, 0));
  gauge.add(needle);
  hdrs.add(gauge, at(cyl(0.02, 0.02, 0.2, M.brushed, 8), -1.4, 1.38, -0.35));
  g.add(hdrs);
  const vessel = at(new Group(), -0.65, 0.12, -0.2);
  vessel.add(at(cyl(0.4, 0.4, 1.1, M.red, 40), 0, 0.85, 0), at(dome(0.4, M.red), 0, 1.4, 0), at(dome(0.4, M.red, false), 0, 0.3, 0), at(cyl(0.3, 0.35, 0.3, M.dark, 20), 0, 0.15, 0));
  g.add(vessel);
  g.add(tube([[-0.9, 1.25, -0.35], [-0.65, 1.25, -0.25], [-0.65, 1.95, -0.2]], 0.04, M.steel));
  const panel = at(new Group(), -3.5, 0.12, -0.6);
  const vfd = makeScreen(320, 200);
  panel.add(at(box(0.6, 1.5, 0.35, M.white), 0, 0.85, 0), at(new Mesh(new PlaneGeometry(0.42, 0.26), vfd.mat), 0, 1.25, 0.18));
  const pLeds = [0, 1, 2].map((k) => { const l = at(sphere(0.035, lamp(0x1fc25e, 0.2)), -0.12 + k * 0.12, 0.95, 0.18); panel.add(l); return l; });
  g.add(panel);
  // building: 4 floors, riser, taps
  const bld = at(new Group(), 1.6, 0, -0.1);
  const FL = 4, FH = 0.95;
  bld.add(at(box(2.4, 0.1, 1.5, M.concrete), 0, 0.05, 0));
  for (let f = 1; f <= FL; f++) bld.add(at(box(2.4, 0.08, 1.5, M.concrete), 0, f * FH, 0));
  bld.add(at(box(2.4, FL * FH, 0.06, new MeshStandardMaterial({ color: 0xdcd6cc, roughness: 0.95 })), 0, (FL * FH) / 2, -0.72));
  bld.add(at(cyl(0.05, 0.05, FL * FH, M.steel, 12), -1.0, (FL * FH) / 2, -0.55));
  const taps = [];
  for (let f = 0; f < FL; f++) {
    const y = f * FH + 0.1;
    bld.add(at(cylX(0.03, 0.03, 1.4, M.steel, 8), -0.3, y + 0.62, -0.55));
    bld.add(at(box(0.36, 0.12, 0.3, M.white), 0.4, y + 0.38, -0.45));
    bld.add(at(cyl(0.025, 0.025, 0.18, M.steel, 8), 0.4, y + 0.62, -0.58), at(cylZ(0.02, 0.02, 0.16, M.steel, 8), 0.4, y + 0.7, -0.5));
    taps.push(new Vector3(0.4, y + 0.66, -0.43));
  }
  g.add(bld);
  g.add(tube([[-0.65, 1.95, -0.2], [0.2, 1.95, -0.6], [0.6, 0.6, -0.65]], 0.05, M.steel));
  const supply = makeFlow(px, { path: pathOf([[-3.6, 0.3, 0.45], [-1.3, 0.3, 0.45], [-1.3, 1.25, -0.35], [-0.65, 1.95, -0.2], [0.2, 1.95, -0.6], [0.6, 0.6, -0.65], [0.6, 3.9, -0.65]]), count: 300, speed: 0.06, jitter: 0.04, size: 1.1, colA: 0x7fd0ff });
  const streams = makeBallistic(px, 900, { size: 0.9, colA: 0xbfe6ff });
  g.add(supply.points, streams.points);
  let acc = 0;
  return {
    group: g, parts: registerParts(g, 5), rotY: -0.35,
    cams: [[0, [4.4, 4.2, 8.8], [-0.4, 1.6, 0]], [0.3, [-0.2, 2.4, 3.6], [-1.0, 1.2, -0.3]], [0.5, [1.4, 2.4, 5.6], [1.8, 1.9, -0.3]], [0.66, [-1.6, 2.2, 3.6], [-2.6, 0.9, 0]], [0.84, [3.0, 3.4, 7.2], [-0.3, 1.7, 0]]],
    labels: [
      { text: "Pressure vessel", obj: vessel, p: [0, 1.95, 0], t: W1 },
      { text: "Pressure gauge", obj: gauge, p: [0, 0.2, 0], t: W1 },
      { text: "Taps open on every floor", obj: bld, p: [0.4, 3.9, -0.3], t: W2 },
      { text: "Multistage pumps", obj: pumps[1], p: [0, 1.6, 0], t: W3 },
      { text: "VFD control panel", obj: panel, p: [0, 1.75, 0], t: W3 },
      { text: "Constant pressure", obj: bld, p: [-1.0, 4.1, -0.55], t: W4 },
    ],
    update(t, l, dt, a) {
      const on = ss(a, 0.9, 1);
      const demand = 0.25 + from(l, W2, 0.1) * 0.5 + from(l, W3, 0.1) * 0.25;
      const openTaps = Math.round(demand * FL);
      const running = l < W2[0] ? 0 : demand < 0.5 ? 1 : demand < 0.85 ? 2 : 3;
      const hz = running === 0 ? 0 : Math.round(lerp(32, 49, (demand * 3 - (running - 1)) / 1.5));
      pumps.forEach((p, i) => { const r = i < running ? 1 : 0; p.userData.fan.rotation.y += dt * 12 * r * on; leds[i].material.emissiveIntensity = 0.15 + r * 2; pLeds[i].material.emissiveIntensity = 0.15 + r * 2; });
      needle.rotation.z = -0.3 + Math.sin(t * 3) * 0.02 - (running === 0 ? 0 : Math.sin(t * 1.3) * 0.04);
      vfd.draw(["SET 4.0 bar", `ACT ${(4 + Math.sin(t * 1.3) * 0.05 * running).toFixed(1)} bar`, `PUMPS ${running}/3  ${hz} Hz`]);
      supply.update(dt, on * (0.25 + running * 0.25), 0.6 + running * 0.4);
      acc += dt * 120 * openTaps * on;
      while (acc >= 1) {
        acc -= 1;
        const f = (Math.random() * openTaps) | 0, p = taps[f];
        streams.emit(1.6 + p.x, p.y, -0.1 + p.z, 0, -0.2, 0, 1.6);
      }
      streams.update(dt, on * 0.9, 6, 0);
    },
  };
}

/* =====================================================================
   6. INDUSTRIAL RO PLANT (pre-treatment → HP pump → membranes → panel)
   ===================================================================== */
function buildRO(px) {
  const g = new Group();
  const skid = new Group();
  [-0.95, 0.95].forEach((z) => skid.add(at(box(6.4, 0.12, 0.12, M.brushed), 0, 0, z)));
  [-3.1, -1, 1, 3.1].forEach((x) => skid.add(at(box(0.12, 0.12, 2, M.brushed), x, 0, 0)));
  [-3.1, 3.1].forEach((x) => [-0.95, 0.95].forEach((z) => skid.add(at(box(0.1, 0.3, 0.1, M.brushed), x, -0.2, z))));
  g.add(skid);
  const mgf = vesselFRP(0.42, 1.7); mgf.position.set(-2.55, 0, 0.35);
  const acf = vesselFRP(0.42, 1.7); acf.position.set(-1.6, 0, 0.35);
  g.add(mgf, acf);
  const cart = at(new Group(), -0.75, 0, 0.5);
  cart.add(at(cyl(0.16, 0.16, 0.85, M.steel), 0, 0.75, 0), at(cyl(0.2, 0.2, 0.08, M.steel), 0, 1.2, 0));
  g.add(cart);
  const hp = multistage(0.75, M.dark);
  hp.position.set(-0.1, 0.06, 0.45);
  g.add(hp);
  const hpGauge = at(new Group(), -0.1, 1.55, 0.75);
  hpGauge.add(cylZ(0.12, 0.12, 0.05, M.brushed), at(new Mesh(new CircleGeometry(0.1, 32), M.white), 0, 0, 0.03));
  const hpNeedle = at(new Group(), 0, 0, 0.04);
  hpNeedle.add(at(box(0.012, 0.085, 0.01, lamp(0xe0201f)), 0, 0.04, 0));
  hpGauge.add(hpNeedle);
  g.add(hpGauge);
  // membrane rack; the front-lower housing is cut away to show the spiral-wound element
  const clip = new Plane(new Vector3(0, 1, 0), 10);
  const cutMat = new MeshPhysicalMaterial({ color: 0xdfe4e8, metalness: 1, roughness: 0.18, side: DoubleSide, clippingPlanes: [clip] });
  const rack = new Group();
  const cutHousing = new Group();
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
    const y = 0.75 + r * 0.55, z = -0.55 + c * 0.45;
    const isCut = r === 0 && c === 1;
    const h = at(cylX(0.18, 0.18, 3.0, isCut ? cutMat : M.steel, 36), 1.15, y, z);
    (isCut ? cutHousing : rack).add(h);
    rack.add(at(cylX(0.2, 0.2, 0.1, M.white, 36), -0.35, y, z), at(cylX(0.2, 0.2, 0.1, M.white, 36), 2.65, y, z));
  }
  const spiral = new Group();
  const memA = new MeshStandardMaterial({ color: 0xf1e3b0, roughness: 0.7, side: DoubleSide });
  const memB = new MeshStandardMaterial({ color: 0x6f8fa8, roughness: 0.7, side: DoubleSide });
  // stepped layer ends read as a rolled, spiral-wound element
  for (let k = 0; k < 6; k++) spiral.add(at(cylX(0.04 + k * 0.022, 0.04 + k * 0.022, 2.8 - k * 0.32, k % 2 ? memB : memA, 28), -k * 0.16, 0, 0));
  spiral.add(cylX(0.03, 0.03, 2.9, M.white, 12));
  spiral.position.set(1.15, 0.75, -0.1);
  cutHousing.add(spiral);
  rack.add(cutHousing);
  [-0.2, 2.5].forEach((x) => rack.add(at(box(0.08, 1.4, 1.1, M.brushed), x, 0.75, -0.33)));
  g.add(rack);
  const panel = at(new Group(), 3.0, 0, 0.6);
  const tds = makeScreen(320, 200);
  panel.add(at(box(0.85, 1.25, 0.32, M.white), 0, 1.2, 0), at(new Mesh(new PlaneGeometry(0.62, 0.38), tds.mat), 0, 1.45, 0.17), at(box(0.08, 0.6, 0.08, M.brushed), 0, 0.3, 0));
  const lights = [0x1fc25e, 0xffb020, 0xe0201f].map((c, i) => { const lmp = at(sphere(0.045, lamp(c)), -0.18 + i * 0.18, 1.0, 0.17); panel.add(lmp); return lmp; });
  g.add(panel);
  g.add(tube([[-3.3, 0.45, 0.35], [-2.55, 0.45, 0.35], [-2.55, 2.6, 0.35], [-1.6, 2.6, 0.35], [-1.6, 0.45, 0.35], [-0.75, 0.45, 0.5], [-0.75, 1.25, 0.5], [-0.1, 1.25, 0.45], [-0.1, 0.35, 0.45], [-0.35, 0.35, -0.1], [-0.35, 0.75, -0.55]], 0.045, M.steel, 160));
  g.add(tube([[2.7, 0.75, -0.1], [3.2, 0.6, 0.0], [3.5, 0.3, 0.2]], 0.04, M.steel), tube([[2.7, 1.3, -0.55], [3.2, 1.7, -0.6], [3.6, 1.7, -0.8]], 0.04, M.dark));
  const feed = makeFlow(px, { path: pathOf([[-3.6, 0.45, 0.35], [-2.55, 0.45, 0.35], [-2.55, 2.6, 0.35], [-1.6, 2.6, 0.35], [-1.6, 0.45, 0.35], [-0.75, 0.45, 0.5], [-0.75, 1.25, 0.5], [-0.1, 1.25, 0.45], [-0.1, 0.35, 0.45], [-0.35, 0.75, -0.55], [-0.35, 0.75, -0.1]]), count: 300, speed: 0.06, jitter: 0.05, size: 1.2, colA: 0xc9b98a });
  const perm = makeFlow(px, { path: pathOf([[-0.3, 0.75, -0.1], [2.7, 0.75, -0.1], [3.2, 0.6, 0.0], [3.6, 0.3, 0.25]]), count: 180, speed: 0.06, jitter: 0.03, size: 1.2, colA: 0x7fe9ff });
  const rej = makeFlow(px, { path: pathOf([[-0.3, 1.3, -0.55], [2.7, 1.3, -0.55], [3.2, 1.7, -0.6], [3.8, 1.7, -0.8]]), count: 120, speed: 0.06, jitter: 0.03, size: 1.2, colA: 0xb58a4a, additive: false });
  g.add(feed.points, perm.points, rej.points);
  const n = new Vector3(), pt = new Vector3();
  return {
    group: g, parts: registerParts(g, 5), rotY: -0.4, floorY: -0.36,
    cams: [[0, [5.8, 4.4, 10.6], [0.2, 0.9, 0]], [0.3, [-1.0, 2.6, 4.6], [-2.1, 1.1, 0.3]], [0.5, [0.8, 1.8, 3.4], [-0.3, 1.0, 0.45]], [0.66, [0.4, 1.7, 3.4], [1.2, 0.8, -0.1]], [0.84, [4.4, 2.2, 4.0], [2.9, 1.2, 0.5]]],
    labels: [
      { text: "Multi-grade sand filter", obj: mgf, p: [0, 2.6, 0], t: W1 },
      { text: "Activated carbon filter", obj: acf, p: [0, 2.6, 0], t: W1 },
      { text: "Cartridge filter", obj: cart, p: [0, 1.4, 0], t: W2 },
      { text: "High pressure pump", obj: hp, p: [0, 1.7, 0], t: W2 },
      { text: "Spiral-wound RO membrane", obj: spiral, p: [0.6, 0.12, 0], t: W3 },
      { text: "Reject water", obj: rack, p: [2.9, 1.5, -0.55], t: W3 },
      { text: "Pure water + TDS monitor", obj: panel, p: [0, 1.85, 0], t: W4 },
    ],
    update(t, l, dt, a) {
      const on = ss(a, 0.9, 1);
      const cut = from(l, W3, 0.08) * (1 - ss(l, 0.88, 0.96));
      g.updateMatrixWorld();
      n.set(0, 1, 0).transformDirection(cutHousing.matrixWorld);
      pt.set(1.15, lerp(1.1, 0.75, cut), 0.35).applyMatrix4(cutHousing.matrixWorld);
      clip.setFromNormalAndCoplanarPoint(n.negate(), pt);
      spiral.rotation.x += dt * 0.4 * on;
      hp.userData.fan.rotation.y += dt * 10 * from(l, W2) * on;
      hpNeedle.rotation.z = lerp(1.6, -1.0, from(l, W2, 0.1));
      feed.update(dt, on * 0.9, 1);
      perm.update(dt, on * from(l, W3, 0.06), 1);
      rej.update(dt, on * from(l, W3, 0.06) * 0.9, 1);
      lights.forEach((lmp, i) => (lmp.material.emissiveIntensity = 0.5 + 1.5 * (Math.sin(t * 1.6 + i * 2.1) > 0.3 ? 1 : 0.2)));
      const k = from(l, W4, 0.06);
      const feedTds = 1200, prod = Math.round(lerp(feedTds, 12, k));
      tds.draw(["TDS MONITOR", `FEED    ${feedTds} ppm`, `PRODUCT ${prod} ppm`], prod < 100 ? "#38e27f" : "#ffb020");
    },
  };
}

/* =============================== scene =============================== */
export function createShowcase(canvas, { mobile = false, labelLayer = null } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  const pixel = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
  renderer.setPixelRatio(pixel);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 100);
  scene.environment = new PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
  const key = new DirectionalLight(0xffffff, 1.7); key.position.set(-4, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  key.shadow.camera.left = -7; key.shadow.camera.right = 7; key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.camera.near = 1; key.shadow.camera.far = 30;
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(new HemisphereLight(0xdfeee6, 0x1a221d, 0.55));
  const rim = new DirectionalLight(0x3ddc84, 1.6); rim.position.set(5, 3, -6);
  scene.add(key, rim);

  const items = [buildFire(pixel), buildMineral(pixel), buildSTP(pixel), buildRWH(pixel), buildHydro(pixel), buildRO(pixel)];
  const turntable = new Group();
  scene.add(turntable);
  items.forEach((it) => {
    it.group.visible = false;
    // solid parts cast and receive shadows; water, glass and particles do not
    it.group.traverse((o) => {
      if (!o.isMesh) return;
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      const solid = !(m.transparent || m.isShaderMaterial);
      o.castShadow = solid; o.receiveShadow = true;
    });
    const catcher = new Mesh(new PlaneGeometry(26, 26), new ShadowMaterial({ opacity: 0.38 }));
    catcher.rotation.x = -Math.PI / 2;
    catcher.position.y = it.floorY ?? -0.02;
    catcher.receiveShadow = true;
    catcher.userData.static = true;
    it.group.add(catcher);
    turntable.add(it.group);
  });

  // HTML callouts pinned to 3D anchors
  const pool = [];
  const labelEl = (i) => {
    if (!labelLayer) return null;
    while (pool.length <= i) {
      const d = document.createElement("div");
      d.className = "callout";
      d.innerHTML = "<i></i><span></span>";
      labelLayer.appendChild(d);
      pool.push(d);
    }
    return pool[i];
  };

  const state = { p: 0, drag: 0, dragV: 0, visible: false };
  let W = 1, H = 1;
  function resize() {
    W = canvas.clientWidth || 1; H = canvas.clientHeight || 1;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);

  let down = null;
  canvas.addEventListener("pointerdown", (e) => { down = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => { if (down === null) return; state.dragV = (e.clientX - down) * 0.008; state.drag += state.dragV; down = e.clientX; });
  const up = () => { down = null; };
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  const camPos = new Vector3(), look = new Vector3(), tmp = new Vector3();
  const cA = new Vector3(), cB = new Vector3(), lA = new Vector3(), lB = new Vector3();
  let last = 0, current = -1, snap = true;
  const camCur = new Vector3(), lookCur = new Vector3();
  function cameraAt(it, l) {
    const keys = it.cams;
    let i = 0;
    while (i < keys.length - 1 && l > keys[i + 1][0]) i++;
    const [t0, p0, k0] = keys[i], [t1, p1, k1] = keys[Math.min(i + 1, keys.length - 1)];
    const f = t1 > t0 ? ss((l - t0) / (t1 - t0), 0, 1) : 0;
    cA.set(...p0); cB.set(...p1); lA.set(...k0); lB.set(...k1);
    camPos.lerpVectors(cA, cB, f);
    look.lerpVectors(lA, lB, f);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (!state.visible) { last = now; return; }
    const t = now / 1000, dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    const n = items.length, seg = Math.min(n - 0.0001, Math.max(0, state.p * n));
    const idx = Math.floor(seg), l = seg - idx;
    if (idx !== current) {
      items.forEach((it, i) => (it.group.visible = i === idx));
      pool.forEach((d) => (d.style.opacity = "0"));
      current = idx;
      snap = true;
    }
    const it = items[idx];
    const assemble = ss(l, 0, 0.25) * (idx < n - 1 ? 1 - ss(l, 0.9, 1) : 1);
    applyAssembly(it.parts, assemble);
    if (down === null) { state.dragV *= 0.94; state.drag += state.dragV; }
    // ease the turntable back to the story angle once the user lets go
    state.drag *= down === null ? 0.985 : 1;
    turntable.rotation.y = it.rotY + Math.sin(t * 0.12) * 0.06 + state.drag;
    rippleTex.offset.set(t * 0.012, t * 0.008);
    it.update(t * TIME_SCALE, l, dt * TIME_SCALE, assemble);

    cameraAt(it, l);
    if (W / H < 1.1) {
      // narrow screens: step back so the whole subject fits
      tmp.copy(camPos).sub(look).multiplyScalar(1.45);
      camPos.copy(look).add(tmp);
    }
    // the camera eases toward its scripted viewpoint for calm, unhurried moves
    const k = snap ? 1 : 1 - Math.exp(-dt * 1.4);
    camCur.lerp(camPos, k);
    lookCur.lerp(look, k);
    snap = false;
    camera.position.copy(camCur);
    camera.lookAt(lookCur);

    turntable.updateMatrixWorld();
    it.labels.forEach((L, i) => {
      const el = labelEl(i);
      if (!el) return;
      const vis = inWin(l, L.t, 0.025) * ss(assemble, 0.95, 1);
      el.style.opacity = vis.toFixed(3);
      if (vis <= 0.001) return;
      if (el.dataset.text !== L.text) { el.querySelector("span").textContent = L.text; el.dataset.text = L.text; }
      tmp.set(...L.p);
      L.obj.localToWorld(tmp);
      tmp.project(camera);
      el.style.transform = `translate3d(${((tmp.x + 1) / 2) * W}px, ${((1 - tmp.y) / 2) * H}px, 0)`;
    });
    for (let i = it.labels.length; i < pool.length; i++) pool[i].style.opacity = "0";

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    count: items.length,
    setProgress(v) { state.p = v; },
    setVisible(v) { state.visible = v; if (!v) pool.forEach((d) => (d.style.opacity = "0")); },
  };
}
