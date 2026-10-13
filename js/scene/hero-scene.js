// Frank AI hero scene: dependency-free WebGL.
// A faceted core, four capability plates (chat, respond, image, speech), orbit rings with signal beads, and drifting dust.
// - Colours come from the --scene-* CSS tokens, so the scene follows the light and dark themes.
// - One animation loop; it pauses when off-screen, in a hidden tab, or under prefers-reduced-motion (one still frame).
// - Pointer parallax on mouse, drag-to-tilt on touch (vertical scrolling is never blocked), scroll pulls the camera back
//   and separates the plates as the hero leaves the screen.
// - A small frame-time governor lowers quality, then hands over to the static CSS fallback on very slow GPUs.

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function hex(str, fallback) {
  let s = (str || "").trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) s = fallback;
  if (s.length === 4) s = "#" + [...s.slice(1)].map((c) => c + c).join("");
  const n = parseInt(s.slice(1), 16);
  return new Float32Array([((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]);
}

// ---- tiny column-major matrix helpers ----
const I = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
const mul = (a, b) => {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
};
const T = (x, y, z) => { const m = I(); m[12] = x; m[13] = y; m[14] = z; return m; };
const S = (x, y, z) => { const m = I(); m[0] = x; m[5] = y; m[10] = z; return m; };
const RX = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
const RY = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
const RZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); };
const persp = (fov, asp, n, f) => {
  const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f);
  return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) * nf, -1, 0, 0, 2 * f * n * nf, 0]);
};
const rot3 = (m) => new Float32Array([m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10]]);

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- geometry ----
function icosphere() {
  const t = (1 + Math.sqrt(5)) / 2;
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const verts = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(norm);
  let faces = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  const cache = new Map();
  const mid = (a, b) => {
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    if (!cache.has(key)) { verts.push(norm(verts[a].map((x, i) => (x + verts[b][i]) / 2))); cache.set(key, verts.length - 1); }
    return cache.get(key);
  };
  faces = faces.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });

  const data = [];
  for (const f of faces) {
    let [p0, p1, p2] = f.map((i) => verts[i]);
    const e1 = p1.map((x, i) => x - p0[i]), e2 = p2.map((x, i) => x - p0[i]);
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const cen = p0.map((x, i) => x + p1[i] + p2[i]);
    if (n[0] * cen[0] + n[1] * cen[1] + n[2] * cen[2] < 0) { [p1, p2] = [p2, p1]; n = n.map((x) => -x); }
    const l = Math.hypot(...n);
    n = n.map((x) => x / l);
    for (const p of [p0, p1, p2]) data.push(...p, ...n);
  }
  const seen = new Set(), edges = [];
  for (const [a, b, c] of faces) for (const [u, v] of [[a, b], [b, c], [c, a]]) {
    const key = u < v ? `${u}_${v}` : `${v}_${u}`;
    if (!seen.has(key)) { seen.add(key); edges.push(...verts[u], ...verts[v]); }
  }
  return { mesh: new Float32Array(data), vertCount: data.length / 6, edges: new Float32Array(edges), edgeCount: edges.length / 3 };
}

const PW = 1.6, PH = 1.0;
function plateOutline() {
  const x = PW / 2, y = PH / 2, c = 0.14;
  const pts = [[-x + c, y], [x - c, y], [x, y - c], [x, -y + c], [x - c, -y], [-x + c, -y], [-x, -y + c], [-x, y - c]];
  const fill = [0, 0, 0, ...pts.flatMap((p) => [p[0], p[1], 0]), pts[0][0], pts[0][1], 0];
  const line = [];
  pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length]; line.push(p[0], p[1], 0, q[0], q[1], 0); });
  line.push(-x + 0.16, 0.3, 0, x - 0.16, 0.3, 0); // header rule
  return { fill: new Float32Array(fill), fillCount: fill.length / 3, line: new Float32Array(line), lineCount: line.length / 3 };
}

const seg = (out, x1, y1, x2, y2) => out.push(x1, y1, 0, x2, y2, 0);
function glyph(kind) {
  const o = [];
  if (kind === "chat") {
    seg(o, -0.6, 0.1, 0.05, 0.1); seg(o, -0.6, -0.06, 0.38, -0.06); seg(o, 0.02, -0.26, 0.6, -0.26); seg(o, 0.22, -0.4, 0.6, -0.4);
  } else if (kind === "respond") {
    seg(o, -0.6, 0.08, -0.05, 0.08); seg(o, -0.6, -0.08, -0.22, -0.08);
    const sq = [[0.08, 0.14], [0.6, 0.14], [0.6, -0.24], [0.08, -0.24]];
    sq.forEach((p, i) => { const q = sq[(i + 1) % 4]; seg(o, p[0], p[1], q[0], q[1]); });
    for (let i = 0; i < 5; i++) seg(o, -0.6 + i * 0.1, -0.4, -0.6 + i * 0.1, -0.4 + 0.07 + 0.06 * (i % 2));
  } else if (kind === "image") {
    const m = [[-0.6, -0.36], [-0.22, 0.06], [0.02, -0.14], [0.2, -0.02], [0.6, -0.36]];
    for (let i = 0; i < m.length - 1; i++) seg(o, m[i][0], m[i][1], m[i + 1][0], m[i + 1][1]);
    seg(o, -0.6, -0.36, 0.6, -0.36);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, b = ((i + 1) / 10) * Math.PI * 2; seg(o, 0.36 + Math.cos(a) * 0.09, 0.14 + Math.sin(a) * 0.09, 0.36 + Math.cos(b) * 0.09, 0.14 + Math.sin(b) * 0.09); }
  } else {
    for (let i = 0; i < 9; i++) { const x = -0.56 + i * 0.14, h = 0.07 + 0.2 * Math.abs(Math.sin(i * 1.35 + 0.4)); seg(o, x, -0.05 - h, x, -0.05 + h); }
  }
  return new Float32Array(o);
}

function unitRing(dashed) {
  const N = 120, out = [];
  for (let i = 0; i < N; i++) {
    if (dashed && i % 3 === 2) continue;
    const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2;
    out.push(Math.cos(a), Math.sin(a), 0, Math.cos(b), Math.sin(b), 0);
  }
  return new Float32Array(out);
}

function dust(count) {
  const r = rng(7), out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, s = Math.sqrt(1 - u * u), rad = 2.3 + Math.pow(r(), 0.7) * 3.2;
    out.set([s * Math.cos(th) * rad, u * rad * 0.8, s * Math.sin(th) * rad, r()], i * 4);
  }
  return out;
}

// ---- shaders ----
const PREC = "#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n";
const MESH_VS = `attribute vec3 aPos; attribute vec3 aNor; uniform mat4 uProj,uView,uModel; uniform mat3 uRot; varying vec3 vN; varying vec3 vW;
void main(){ vec4 w=uModel*vec4(aPos,1.0); vW=w.xyz; vN=uRot*aNor; gl_Position=uProj*uView*w; }`;
const MESH_FS = PREC + `varying vec3 vN; varying vec3 vW; uniform vec3 uEye,uBase,uRim,uKey,uFill;
void main(){
  vec3 N=normalize(vN); vec3 V=normalize(uEye-vW);
  float fres=pow(1.0-max(dot(N,V),0.0),2.4);
  vec3 L1=normalize(vec3(-0.55,0.8,0.6)); vec3 L2=normalize(vec3(0.75,-0.25,0.4));
  float d1=max(dot(N,L1),0.0), d2=max(dot(N,L2),0.0);
  vec3 R=reflect(-V,N); float env=smoothstep(-0.3,0.9,R.y);
  float spec=pow(max(dot(R,L1),0.0),28.0);
  vec3 col=uBase*(0.28+0.72*d1)+uFill*d2*0.38+uRim*fres*1.05+uKey*spec*0.85+uKey*env*0.10;
  gl_FragColor=vec4(col,1.0);
}`;
const LINE_VS = `attribute vec3 aPos; uniform mat4 uProj,uView,uModel; uniform float uTime,uWave; varying float vZ;
void main(){ vec3 p=aPos; p.y*=1.0+uWave*sin(uTime*2.4+p.x*7.0); vec4 v=uView*uModel*vec4(p,1.0); vZ=-v.z; gl_Position=uProj*v; }`;
const LINE_FS = PREC + `varying float vZ; uniform vec3 uColor; uniform float uAlpha,uNear,uFar;
void main(){ float f=1.0-smoothstep(uNear,uFar,vZ); float a=uAlpha*mix(0.3,1.0,f); gl_FragColor=vec4(uColor*a,a); }`;
const POINT_VS = `attribute vec3 aPos; attribute float aSeed; uniform mat4 uProj,uView,uModel; uniform float uTime,uSize,uDpr,uDrift; varying float vA;
void main(){
  vec3 p=aPos+uDrift*vec3(sin(uTime*0.21+aSeed*6.283),cos(uTime*0.17+aSeed*17.0),sin(uTime*0.13+aSeed*9.0))*0.12;
  vec4 v=uView*uModel*vec4(p,1.0); gl_Position=uProj*v;
  gl_PointSize=uSize*uDpr*(7.0/-v.z)*(0.6+aSeed*0.8); vA=0.35+0.65*fract(aSeed*7.31);
}`;
const POINT_FS = PREC + `varying float vA; uniform vec3 uColor; uniform float uAlpha;
void main(){ float r=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.0,r); a*=a*uAlpha*vA; gl_FragColor=vec4(uColor*a,a); }`;

function makeProgram(gl, vsSrc, fsSrc) {
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader error");
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, vsSrc), fs = compile(gl.FRAGMENT_SHADER, fsSrc);
  const p = gl.createProgram();
  gl.attachShader(p, vs); gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, "aPos");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link error");
  gl.deleteShader(vs); gl.deleteShader(fs);
  const u = {}, a = {};
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
  for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i < n; i++) { const info = gl.getActiveAttrib(p, i); a[info.name] = gl.getAttribLocation(p, info.name); }
  return { p, u, a };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{section: HTMLElement, stage: HTMLElement, onFallback?: () => void}} opts
 * @returns {{destroy: () => void} | null} null when WebGL is unavailable (the page keeps its static visual)
 */
export function createHeroScene(canvas, { section, stage, onFallback }) {
  const gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: true, depth: true, powerPreference: "default" });
  if (!gl) return null;

  const reducedMq = matchMedia("(prefers-reduced-motion: reduce)");
  const st = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, scroll: 0, tScroll: 0, touchBase: 0, dragging: false };
  const view = { w: 1, h: 1, dpr: 1, dist: 8.4, small: false };
  let res = null, raf = 0, last = 0, inView = true, lost = false, destroyed = false, level = 0, ema = 0.016, slow = 0;
  let reduced = reducedMq.matches;
  let colors = null;

  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    const c = (name, fb) => hex(cs.getPropertyValue(name), fb);
    colors = {
      base: c("--scene-base", "#232832"), rim: c("--scene-rim", "#E98A45"), key: c("--scene-key", "#F3B77C"), fill: c("--scene-fill", "#C65D24"),
      line: c("--scene-line", "#E98A45"), plate: c("--scene-plate", "#1D212A"), dust: c("--scene-dust", "#F3B77C"),
      p: [c("--scene-p1", "#E98A45"), c("--scene-p2", "#F3B77C"), c("--scene-p3", "#C65D24"), c("--scene-p4", "#F3B77C")],
      light: document.documentElement.getAttribute("data-theme") === "light",
    };
  };

  const buf = (data) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; };

  function build() {
    const ico = icosphere(), po = plateOutline();
    res = {
      mesh: makeProgram(gl, MESH_VS, MESH_FS), line: makeProgram(gl, LINE_VS, LINE_FS), pts: makeProgram(gl, POINT_VS, POINT_FS),
      ico, po,
      icoBuf: buf(ico.mesh), edgeBuf: buf(ico.edges), fillBuf: buf(po.fill), outlineBuf: buf(po.line),
      glyphs: ["chat", "respond", "image", "speech"].map((k) => { const d = glyph(k); return { buf: buf(d), count: d.length / 3, wave: k === "speech" ? 0.38 : 0 }; }),
      ringSolid: buf(unitRing(false)), ringDash: buf(unitRing(true)),
      dust: buf(dust(320)), dustCount: 320,
      bead: gl.createBuffer(),
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, res.bead);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(4), gl.DYNAMIC_DRAW);
    res.ringSolidCount = unitRing(false).length / 3;
    res.ringDashCount = unitRing(true).length / 3;
  }

  function dispose() {
    if (!res) return;
    for (const k of ["icoBuf", "edgeBuf", "fillBuf", "outlineBuf", "ringSolid", "ringDash", "dust", "bead"]) gl.deleteBuffer(res[k]);
    res.glyphs.forEach((g) => gl.deleteBuffer(g.buf));
    for (const k of ["mesh", "line", "pts"]) gl.deleteProgram(res[k].p);
    res = null;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const cssW = Math.max(1, r.width), cssH = Math.max(1, r.height);
    view.small = Math.min(cssW, window.innerWidth) < 560 || matchMedia("(pointer: coarse)").matches;
    const maxDpr = level >= 1 ? 1 : view.small ? 1.5 : 2;
    view.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    view.w = Math.round(cssW * view.dpr);
    view.h = Math.round(cssH * view.dpr);
    if (canvas.width !== view.w || canvas.height !== view.h) { canvas.width = view.w; canvas.height = view.h; }
    gl.viewport(0, 0, view.w, view.h);
    const aspect = cssW / cssH;
    view.dist = clamp(Math.max(8.8, 10.9 / aspect), 8.8, 16);
    if (!animating()) draw(1.6);
  }

  const animating = () => !destroyed && !lost && inView && !document.hidden && !reduced;

  function draw(t) {
    if (!res || !colors) return;
    const { mesh, line, pts } = res;
    const sc = st.scroll, fade = 1 - sc * 0.45;
    const proj = persp((36 * Math.PI) / 180, view.w / view.h, 0.1, 60);
    const viewM = T(0, 0, -view.dist - sc * 2.2);
    const root = mul(RX(0.1 + st.pitch), RY(st.yaw + 0.12));
    const near = view.dist - 3, far = view.dist + 3.6;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // --- core (opaque) ---
    const ck = 1.18 * (1 - sc * 0.12);
    const coreM = mul(root, mul(RY(t * 0.14 + sc * 1.4), mul(RX(0.28), S(ck, ck, ck))));
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.useProgram(mesh.p);
    gl.uniformMatrix4fv(mesh.u.uProj, false, proj); gl.uniformMatrix4fv(mesh.u.uView, false, viewM); gl.uniformMatrix4fv(mesh.u.uModel, false, coreM);
    gl.uniformMatrix3fv(mesh.u.uRot, false, rot3(coreM));
    gl.uniform3f(mesh.u.uEye, 0, 0, view.dist + sc * 2.2);
    gl.uniform3fv(mesh.u.uBase, colors.base); gl.uniform3fv(mesh.u.uRim, colors.rim); gl.uniform3fv(mesh.u.uKey, colors.key); gl.uniform3fv(mesh.u.uFill, colors.fill);
    gl.bindBuffer(gl.ARRAY_BUFFER, res.icoBuf);
    gl.enableVertexAttribArray(mesh.a.aPos); gl.vertexAttribPointer(mesh.a.aPos, 3, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(mesh.a.aNor); gl.vertexAttribPointer(mesh.a.aNor, 3, gl.FLOAT, false, 24, 12);
    gl.drawArrays(gl.TRIANGLES, 0, res.ico.vertCount);
    gl.disableVertexAttribArray(mesh.a.aNor);

    // --- everything translucent ---
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);

    gl.useProgram(line.p);
    gl.uniformMatrix4fv(line.u.uProj, false, proj); gl.uniformMatrix4fv(line.u.uView, false, viewM);
    gl.uniform1f(line.u.uTime, t); gl.uniform1f(line.u.uNear, near); gl.uniform1f(line.u.uFar, far);
    const drawLine = (buffer, count, mode, model, color, alpha, wave = 0) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(line.a.aPos); gl.vertexAttribPointer(line.a.aPos, 3, gl.FLOAT, false, 0, 0);
      gl.uniformMatrix4fv(line.u.uModel, false, model); gl.uniform3fv(line.u.uColor, color); gl.uniform1f(line.u.uAlpha, alpha * fade); gl.uniform1f(line.u.uWave, wave);
      gl.drawArrays(mode, 0, count);
    };

    drawLine(res.edgeBuf, res.ico.edgeCount, gl.LINES, mul(coreM, S(1.012, 1.012, 1.012)), colors.line, colors.light ? 0.5 : 0.34);

    const rings = [
      { r: 1.95, tx: 1.3, tz: 0.15, spin: 0.16, dash: true, a: 0.7 },
      { r: 2.55, tx: 0.42, tz: 0.7, spin: -0.1, dash: false, a: 0.36 },
      { r: 2.95, tx: -0.62, tz: -0.35, spin: 0.07, dash: true, a: 0.55 },
    ];
    const ringModels = rings.map((g) => mul(root, mul(RZ(g.tz), mul(RX(g.tx), mul(RZ(g.spin * t), S(g.r, g.r, g.r))))));
    rings.forEach((g, i) => drawLine(g.dash ? res.ringDash : res.ringSolid, g.dash ? res.ringDashCount : res.ringSolidCount, gl.LINES, ringModels[i], colors.line, g.a));

    // plates, far to near
    const R = (view.small ? 2.4 : 2.75) * (1 + sc * 0.5), step = (view.small ? 0.5 : 0.56) * (1 + sc * 0.9), ps = view.small ? 0.62 : 0.72;
    const base = [-0.9, -0.32, 0.32, 0.9];
    const plates = base.map((a, i) => {
      const th = a + Math.sin(t * 0.35 + i * 1.3) * 0.1;
      const y = (i - 1.5) * step + Math.sin(t * 0.6 + i) * 0.05;
      const model = mul(root, mul(T(R * Math.sin(th), y, R * Math.cos(th)), mul(RY(th), mul(RX(-0.08), S(ps, ps, 1)))));
      return { i, model, z: model[14] };
    }).sort((p, q) => p.z - q.z);
    for (const p of plates) {
      drawLine(res.fillBuf, res.po.fillCount, gl.TRIANGLE_FAN, p.model, colors.plate, colors.light ? 0.66 : 0.58);
      drawLine(res.outlineBuf, res.po.lineCount, gl.LINES, p.model, colors.p[p.i], 0.95);
      const g = res.glyphs[p.i];
      drawLine(g.buf, g.count, gl.LINES, p.model, colors.p[p.i], 0.9, g.wave);
    }

    // signal beads travelling along the rings + drifting dust
    gl.useProgram(pts.p);
    gl.uniformMatrix4fv(pts.u.uProj, false, proj); gl.uniformMatrix4fv(pts.u.uView, false, viewM);
    gl.uniform1f(pts.u.uTime, t); gl.uniform1f(pts.u.uDpr, view.dpr); gl.uniform3fv(pts.u.uColor, colors.dust);
    gl.bindBuffer(gl.ARRAY_BUFFER, res.dust);
    gl.enableVertexAttribArray(pts.a.aPos); gl.vertexAttribPointer(pts.a.aPos, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(pts.a.aSeed); gl.vertexAttribPointer(pts.a.aSeed, 1, gl.FLOAT, false, 16, 12);
    gl.uniformMatrix4fv(pts.u.uModel, false, root); gl.uniform1f(pts.u.uSize, view.small ? 5 : 6.5); gl.uniform1f(pts.u.uDrift, reduced ? 0 : 1); gl.uniform1f(pts.u.uAlpha, 0.7 * fade);
    gl.drawArrays(gl.POINTS, 0, level >= 1 || view.small ? Math.floor(res.dustCount / 2) : res.dustCount);

    gl.disableVertexAttribArray(pts.a.aSeed);
    gl.bindBuffer(gl.ARRAY_BUFFER, res.bead);
    gl.vertexAttribPointer(pts.a.aPos, 3, gl.FLOAT, false, 16, 0);
    gl.uniform1f(pts.u.uSize, 22); gl.uniform1f(pts.u.uDrift, 0); gl.uniform1f(pts.u.uAlpha, 1 * fade);
    gl.vertexAttrib1f(pts.a.aSeed, 0.5);
    gl.uniform3fv(pts.u.uColor, colors.p[1]);
    [0, 2, 1].forEach((ri, n) => {
      const a = t * (0.55 + n * 0.17) * (rings[ri].spin < 0 ? -1 : 1) + n * 2.1;
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array([Math.cos(a), Math.sin(a), 0, 0.5]));
      gl.uniformMatrix4fv(pts.u.uModel, false, ringModels[ri]);
      gl.drawArrays(gl.POINTS, 0, 1);
    });
    gl.disableVertexAttribArray(pts.a.aSeed);
    gl.depthMask(true);
  }

  function frame(now) {
    raf = 0;
    if (!animating()) return;
    const t = now / 1000, rawDt = Math.min(0.25, t - last);
    last = t;
    const dt = Math.min(0.05, rawDt), k = 1 - Math.exp(-dt * 5);
    st.yaw += (st.tYaw + (st.dragging ? 0 : Math.sin(t * 0.22) * 0.1) - st.yaw) * k;
    st.pitch += (st.tPitch - st.pitch) * k;
    st.scroll += (st.tScroll - st.scroll) * k;
    draw(t);

    ema = ema * 0.93 + rawDt * 0.07;
    slow = ema > 0.045 ? slow + 1 : Math.max(0, slow - 2);
    if (slow > 150) { slow = 0; degrade(); }
    if (animating()) raf = requestAnimationFrame(frame);
  }

  function degrade() {
    level += 1;
    if (level === 1) resize();
    else { stop(); destroy(); onFallback?.(); }
  }
  const start = () => { if (!raf && animating()) { last = performance.now() / 1000; raf = requestAnimationFrame(frame); } };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  // ---- input ----
  const onPointer = (e) => {
    if (e.pointerType === "touch" || reduced) return;
    const r = section.getBoundingClientRect();
    st.tYaw = clamp((e.clientX - r.left) / r.width - 0.5, -0.5, 0.5) * 0.6;
    st.tPitch = clamp((e.clientY - r.top) / r.height - 0.5, -0.5, 0.5) * 0.3;
  };
  let startX = 0;
  const onDown = (e) => { if (e.pointerType !== "touch" || reduced) return; st.dragging = true; startX = e.clientX; };
  const onMove = (e) => { if (!st.dragging) return; st.tYaw = clamp((e.clientX - startX) / Math.max(1, stage.clientWidth), -0.6, 0.6) * 1.4; };
  const onUp = () => { st.dragging = false; st.tYaw = 0; };
  const onScroll = () => {
    const r = section.getBoundingClientRect();
    st.tScroll = reduced ? 0 : clamp(-r.top / (r.height * 0.85), 0, 1);
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  stage.addEventListener("pointerdown", onDown, { passive: true });
  stage.addEventListener("pointermove", onMove, { passive: true });
  stage.addEventListener("pointerup", onUp, { passive: true });
  stage.addEventListener("pointercancel", onUp, { passive: true });

  // ---- lifecycle ----
  const ro = new ResizeObserver(() => resize());
  ro.observe(canvas);
  const io = new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; inView ? start() : stop(); }, { threshold: 0 });
  io.observe(canvas);
  const onVis = () => (document.hidden ? stop() : start());
  const onTheme = () => { readColors(); if (!animating()) draw(1.6); };
  const onReduced = () => {
    reduced = reducedMq.matches;
    if (reduced) { stop(); st.tYaw = st.tPitch = st.tScroll = st.yaw = st.pitch = st.scroll = 0; draw(1.6); } else start();
  };
  const onLost = (e) => { e.preventDefault(); lost = true; stop(); onFallback?.(); };
  const onRestored = () => { try { build(); lost = false; resize(); start(); } catch { /* stay on the static visual */ } };
  document.addEventListener("visibilitychange", onVis);
  window.addEventListener("themechange", onTheme);
  reducedMq.addEventListener("change", onReduced);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stop();
    window.removeEventListener("pointermove", onPointer);
    window.removeEventListener("scroll", onScroll);
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", onUp);
    stage.removeEventListener("pointercancel", onUp);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("themechange", onTheme);
    reducedMq.removeEventListener("change", onReduced);
    canvas.removeEventListener("webglcontextlost", onLost);
    canvas.removeEventListener("webglcontextrestored", onRestored);
    ro.disconnect();
    io.disconnect();
    dispose();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  try {
    build();
    readColors();
    onScroll();
    resize();
    if (reduced) draw(1.6);
    else start();
  } catch (err) {
    console.warn("Frank AI scene could not start; using the static visual.", err);
    destroy();
    return null;
  }
  return { destroy };
}
