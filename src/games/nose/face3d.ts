// 「鼻毛を抜け！」専用の3D顔（Three.js・プリミティブのみ・外部素材なし）。座標は2D画面のpxと同じ縮尺（z=0面で一致）。
// 毎フレームの new を避けるため、頂点は事前確保バッファを書き換える。
import {
  AmbientLight, BackSide, BufferAttribute, BufferGeometry, Color, CylinderGeometry, DataTexture, DirectionalLight, DoubleSide, Group,
  Material, Mesh, MeshBasicMaterial, MeshToonMaterial, NearestFilter, Object3D, PerspectiveCamera, RedFormat, Scene, SphereGeometry,
  TorusGeometry, Vector3, WebGLRenderer, CircleGeometry,
} from 'three';

export interface FaceP {
  W: number; H: number; hx: number; hy: number; rx: number; ry: number; nr: number; nx: number; ny: number; time: number;
  expr: number; pull: number; stretch: number; red: number; happy: boolean; tears: boolean; sweat: boolean; tilt: number;
  ox: number; oy: number; zoom: number; lookX: number; flick: number;
  noHand?: boolean; hairKind: number; // 0なし 1つまむ 2戻る/切れ(先端位置のみ)
  tipX: number; tipY: number; amp: number; waves: number; hand: boolean;
  fly: number; flyX: number; flyY: number; flyRot: number; // 0なし 1抜けた毛+手 2切れた毛片
}
export function newFaceP(): FaceP {
  return { W: 1, H: 1, hx: 0, hy: 0, rx: 1, ry: 1, nr: 1, nx: 0, ny: 0, time: 0, expr: 0, pull: 0, stretch: 0, red: 0, happy: false, tears: false, sweat: false, tilt: 0, ox: 0, oy: 0, zoom: 1, lookX: 0, flick: 0, hairKind: 0, tipX: 0, tipY: 0, amp: 10, waves: 1, hand: true, fly: 0, flyX: 0, flyY: 0, flyRot: 0 };
}

/** 事前確保バッファを書き換えるチューブ（鼻毛）。長さが変わっても再生成しない。 */
class Strand {
  readonly mesh: Mesh; readonly cl: Float32Array; // 中心線 (n+1)*3
  private pos: Float32Array; private nor: Float32Array; private pa: BufferAttribute; private na: BufferAttribute;
  constructor(private n: number, private R: number, mat: Material) {
    this.cl = new Float32Array((n + 1) * 3); this.pos = new Float32Array((n + 1) * R * 3); this.nor = new Float32Array((n + 1) * R * 3);
    const idx: number[] = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < R; j++) { const a = i * R + j, b = i * R + (j + 1) % R, c = (i + 1) * R + j, d = (i + 1) * R + (j + 1) % R; idx.push(a, c, b, b, c, d); }
    const g = new BufferGeometry(); this.pa = new BufferAttribute(this.pos, 3); this.na = new BufferAttribute(this.nor, 3);
    g.setAttribute('position', this.pa); g.setAttribute('normal', this.na); g.setIndex(idx);
    this.mesh = new Mesh(g, mat); this.mesh.frustumCulled = false;
  }
  commit(r: number) {
    const { n, R, cl, pos, nor } = this;
    for (let i = 0; i <= n; i++) {
      const p = i > 0 ? i - 1 : 0, q = i < n ? i + 1 : n;
      const tx = cl[q * 3] - cl[p * 3], ty = cl[q * 3 + 1] - cl[p * 3 + 1], tz = cl[q * 3 + 2] - cl[p * 3 + 2];
      let ux = ty, uy = -tx, ul = Math.hypot(ux, uy);
      if (ul < 1e-6) { ux = 1; uy = 0; ul = 1; }
      ux /= ul; uy /= ul;
      let vx = tz * tx, vy = tz * ty, vz = -(tx * tx + ty * ty); const vl = Math.hypot(vx, vy, vz) || 1; vx /= vl; vy /= vl; vz /= vl;
      const rr = r * (1 - 0.4 * i / n);
      for (let j = 0; j < R; j++) {
        const th = j / R * 6.2832, c = Math.cos(th), s = Math.sin(th), o = (i * R + j) * 3;
        const dx = c * ux + s * vx, dy = c * uy + s * vy, dz = s * vz;
        nor[o] = dx; nor[o + 1] = dy; nor[o + 2] = dz;
        pos[o] = cl[i * 3] + dx * rr; pos[o + 1] = cl[i * 3 + 1] + dy * rr; pos[o + 2] = cl[i * 3 + 2] + dz * rr;
      }
    }
    this.pa.needsUpdate = true; this.na.needsUpdate = true;
  }
}

const SKIN = '#f6c9a0', NOSE = '#f0a07d', REDC = '#ff5a5a', OUTL = '#4a2414';

export class NoseStage3D {
  readonly canvas: HTMLCanvasElement;
  lost = false;
  private renderer: WebGLRenderer; private scene = new Scene(); private camera: PerspectiveCamera;
  private onLost: (e: Event) => void;
  private rootG = new Group(); private head = new Group();
  private grad: DataTexture; private mats: Material[] = [];
  private sph = new SphereGeometry(1, 20, 14); private cylG = new CylinderGeometry(1, 1, 1, 14, 1);
  private torus = new TorusGeometry(1, 0.09, 6, 16, Math.PI); private circ = new CircleGeometry(1, 16);
  private skinM: MeshToonMaterial; private noseM: MeshToonMaterial; private skinC = new Color(SKIN); private noseC = new Color(NOSE); private redC = new Color(REDC);
  private headM!: Group; private earL!: Group; private earR!: Group; private noseM3!: Group; private nostrilL!: Mesh; private nostrilR!: Mesh;
  private neck!: Mesh; private shoulder!: Mesh; private strands: Mesh[] = [];
  private browL!: Mesh; private browR!: Mesh; private eyeW: Mesh[] = []; private pupil: Mesh[] = []; private lineA: Mesh[] = []; private lineB: Mesh[] = []; private arcE: Mesh[] = [];
  private mArc!: Mesh; private mOpen!: Mesh; private tongue!: Mesh; private blush: Mesh[] = []; private tear: Mesh[] = []; private sweatM!: Mesh;
  private hair!: Strand; private hand = new Group(); private palmH!: Group; private fingL!: Group; private fingR!: Group;
  private flyG = new Group(); private fly!: Strand; private flyPalm!: Group;
  private zr = 1; private zx = 1; private zy = 1;
  private zAt = (x: number, y: number) => this.zr * Math.sqrt(Math.max(0.03, 1 - (x / this.zx) * (x / this.zx) - (y / this.zy) * (y / this.zy)));
  private tmp = new Vector3(); private D = 1000; private W = 1; private H = 1;

  constructor(onLost?: () => void) {
    const canvas = this.canvas = document.createElement('canvas');
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false });
    if (!this.renderer.getContext()) throw new Error('webgl');
    this.renderer.setClearColor(0x000000, 0);
    this.onLost = (e) => { e.preventDefault(); this.lost = true; onLost?.(); };
    canvas.addEventListener('webglcontextlost', this.onLost);
    this.camera = new PerspectiveCamera(20, 1, 10, 6000);
    this.grad = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat); this.grad.minFilter = this.grad.magFilter = NearestFilter; this.grad.needsUpdate = true;
    // 洗面所の冷たい白色光（上から）に合わせる
    this.scene.add(new AmbientLight(0xeaf2ff, 1.45));
    const dl = new DirectionalLight(0xf4f8ff, 2.2); dl.position.set(-0.3, 1.1, 1); this.scene.add(dl);
    const rim = new DirectionalLight(0xcfe0ff, 0.6); rim.position.set(0.9, 0.3, 0.5); this.scene.add(rim);
    this.scene.add(this.rootG); this.rootG.add(this.head);
    this.skinM = this.toon(SKIN); this.noseM = this.toon(NOSE);
    this.build();
  }

  private toon(col: string): MeshToonMaterial { const m = new MeshToonMaterial({ color: col, gradientMap: this.grad }); this.mats.push(m); return m; }
  private basic(col: string, side = false): MeshBasicMaterial { const m = new MeshBasicMaterial({ color: col, side: side ? BackSide : DoubleSide }); this.mats.push(m); return m; }
  private ball(mat: Material, ol = 0, parent: Object3D = this.head, geo: SphereGeometry | CylinderGeometry = this.sph): Group {
    const g = new Group(); g.add(new Mesh(geo, mat));
    if (ol) { const o = new Mesh(geo, this.basic(OUTL, true)); o.scale.setScalar(1 + ol); g.add(o); }
    parent.add(g); return g;
  }
  private solid(geo: BufferGeometry, col: string, parent: Object3D = this.head, toon = false): Mesh {
    const m = new Mesh(geo, toon ? this.toon(col) : this.basic(col)); parent.add(m); return m;
  }

  private build() {
    const h = this.head;
    this.neck = this.solid(this.cylG, '#e9a97a', h, true); this.shoulder = this.solid(this.sph, '#4aa3ff', h, true);
    this.headM = this.ball(this.skinM, 0.035); this.earL = this.ball(this.skinM, 0.12); this.earR = this.ball(this.skinM, 0.12);
    this.noseM3 = this.ball(this.noseM, 0.07);
    this.nostrilL = this.solid(this.sph, '#4a1f12'); this.nostrilR = this.solid(this.sph, '#4a1f12');
    for (let i = -3; i <= 3; i++) { const m = this.solid(this.cylG, '#3b2a20'); this.strands.push(m); }
    this.browL = this.solid(this.cylG, '#3b2a20'); this.browR = this.solid(this.cylG, '#3b2a20');
    for (let s = 0; s < 2; s++) {
      this.eyeW.push(this.solid(this.sph, '#ffffff', h, true)); this.pupil.push(this.solid(this.sph, '#2b1a10'));
      this.lineA.push(this.solid(this.cylG, '#2b1a10')); this.lineB.push(this.solid(this.cylG, '#2b1a10')); this.arcE.push(this.solid(this.torus, '#2b1a10'));
      this.blush.push(new Mesh(this.circ, new MeshBasicMaterial({ color: '#ff3b55', transparent: true, opacity: 0, depthWrite: false }))); h.add(this.blush[s]); this.mats.push(this.blush[s].material as Material);
    }
    this.mArc = this.solid(this.torus, '#4a1f12'); this.mOpen = this.solid(this.sph, '#6b1a22'); this.tongue = this.solid(this.sph, '#ff7a8a');
    for (let i = 0; i < 4; i++) { const m = this.solid(this.sph, '#8fd3ff', h); this.tear.push(m); }
    this.sweatM = this.solid(this.sph, '#8fd3ff');
    // 鼻毛・手
    const hairMat = new MeshToonMaterial({ color: '#1e140e', gradientMap: this.grad, side: DoubleSide }); this.mats.push(hairMat);
    this.hair = new Strand(40, 6, hairMat); this.rootG.add(this.hair.mesh);
    this.palmH = this.ball(this.skinM, 0.1, this.hand); this.fingL = this.ball(this.skinM, 0.14, this.hand); this.fingR = this.ball(this.skinM, 0.14, this.hand);
    this.rootG.add(this.hand);
    this.fly = new Strand(20, 5, hairMat); this.flyG.add(this.fly.mesh);
    this.flyPalm = this.ball(this.skinM, 0.1, this.flyG); this.rootG.add(this.flyG);
    this.hand.visible = false; this.flyG.visible = false; this.hair.mesh.visible = false;
    // 鼻の穴は前面に出す
    this.nostrilL.renderOrder = this.nostrilR.renderOrder = 2;
  }

  resize(W: number, H: number, dpr: number) {
    this.W = W; this.H = H;
    this.renderer.setPixelRatio(Math.min(dpr, 2)); this.renderer.setSize(W, H, false);
    const fov = this.camera.fov * Math.PI / 180; this.D = H / 2 / Math.tan(fov / 2);
    this.camera.aspect = W / H; this.camera.position.set(0, 0, this.D); this.camera.near = this.D * 0.3; this.camera.far = this.D * 3; this.camera.updateProjectionMatrix();
  }

  update(p: FaceP) {
    const { rx, ry, nr, W, H, time, expr, pull } = p;
    const rz = rx * 0.9, cx = W / 2, cy = H / 2;
    this.zr = rz; this.zx = rx; this.zy = ry; const zAt = this.zAt;
    // ズーム＆ぷるぷる（鼻を中心に）
    const nxw = p.nx - cx, nyw = cy - p.ny;
    this.rootG.scale.setScalar(p.zoom); this.rootG.position.set(nxw * (1 - p.zoom) + p.ox, nyw * (1 - p.zoom) - p.oy, 0);
    // 顔の色（痛みで赤く）
    this.skinM.color.copy(this.skinC).lerp(this.redC, p.red * 0.55); this.noseM.color.copy(this.noseC).lerp(this.redC, Math.min(1, p.red * 0.9));
    // 頭
    this.head.position.set(p.hx - cx, cy - p.hy, 0); this.head.rotation.set(-pull * 0.08, Math.sin(time * 1.7) * 0.05 + pull * 0.12, -p.tilt);
    this.head.scale.set(1 + pull * 0.02, 1 + pull * 0.05, 1);
    this.headM.scale.set(rx * (1 - pull * 0.03), ry, rz);
    for (let s = 0; s < 2; s++) { const e = s ? this.earR : this.earL, sg = s ? 1 : -1; e.position.set(sg * rx * 0.99, -ry * 0.02, 0); e.scale.set(rx * 0.1, ry * 0.16, rx * 0.1); }
    this.neck.position.set(0, -ry * 1.15, -rz * 0.2); this.neck.scale.set(rx * 0.45, ry * 0.9, rx * 0.4);
    this.shoulder.position.set(0, -ry * 1.75, -rz * 0.1); this.shoulder.scale.set(rx * 1.3, ry * 0.6, rx * 0.6);
    // 薄い頭髪
    for (let i = -3; i <= 3; i++) {
      const m = this.strands[i + 3], x = i * rx * 0.13, y = ry * Math.sqrt(Math.max(0.05, 1 - (x / rx) * (x / rx))) * 0.99;
      m.position.set(x, y + 3, zAt(x, y) * 0.2 + 2); m.scale.set(2.2, ry * 0.18, 2.2); m.rotation.z = -i * 0.16;
    }
    // 眉・目
    const closed = expr === 3 || p.happy, er = rx * (expr === 0 ? 0.13 : 0.15), ex = rx * 0.38, ey = ry * 0.16;
    const browY = ry * 0.32 + (expr > 1 ? 8 : 0) + (p.happy ? 6 : 0), ba = p.happy ? -0.1 : expr * 0.2;
    for (let s = 0; s < 2; s++) {
      const sg = s ? 1 : -1, b = s ? this.browR : this.browL;
      b.position.set(sg * ex, browY, zAt(sg * ex, browY) + 3); b.scale.set(5, rx * 0.4, 5); b.rotation.z = Math.PI / 2 + sg * ba;
      const ez = zAt(sg * ex, ey);
      const w = this.eyeW[s], pu = this.pupil[s], la = this.lineA[s], lb = this.lineB[s], ar = this.arcE[s];
      w.visible = pu.visible = !closed; la.visible = lb.visible = expr === 3 && !p.happy; ar.visible = p.happy;
      w.position.set(sg * ex, ey, ez + 2); w.scale.set(er, er * (expr >= 1 ? 1.15 : 0.8), er * 0.5);
      const px = expr >= 2 ? 0 : Math.max(-3, Math.min(3, p.lookX)), py = expr === 0 ? -2 : -er * 0.1;
      pu.position.set(sg * ex + px, ey + py, ez + 2 + er * 0.42); const pr = er * (expr >= 1 ? 0.38 : 0.5); pu.scale.set(pr, pr * 1.1, pr * 0.6);
      la.position.set(sg * ex, ey, ez + 3); la.scale.set(4, er * 1.5, 4); la.rotation.z = Math.PI / 2 + 0.45 * sg;
      lb.position.set(sg * ex, ey, ez + 3); lb.scale.set(4, er * 1.5, 4); lb.rotation.z = Math.PI / 2 - 0.45 * sg;
      ar.position.set(sg * ex, ey - er * 0.4, ez + 3); ar.scale.set(er * 1.1, er * 1.1, er * 1.1); ar.rotation.z = 0;
      // 頬の赤み
      const bm = this.blush[s], bx = sg * rx * 0.6, by = -ry * 0.12;
      bm.position.set(bx, by, zAt(bx, by) + 1.5); bm.scale.set(rx * 0.17, ry * 0.1, 1); (bm.material as MeshBasicMaterial).opacity = Math.min(0.55, p.red * 0.55);
      bm.visible = p.red > 0.08;
    }
    // 涙・汗
    for (let i = 0; i < 4; i++) {
      const m = this.tear[i], sg = i < 2 ? -1 : 1, f = (time * 1.4 + (i % 2) * 0.5 + (sg > 0 ? 0.2 : 0)) % 1;
      m.visible = p.tears; if (!p.tears) continue;
      const x = sg * ex + sg * 4; m.position.set(x, ey - er * 0.9 - f * ry * 0.5, zAt(x, ey - f * ry * 0.4) + 4); m.scale.set(6 * (1 - f * 0.4), 10 * (1 - f * 0.3), 5);
    }
    this.sweatM.visible = p.sweat; if (p.sweat) { const f = (time * 2) % 1; this.sweatM.position.set(rx * 0.72, ry * 0.5 - f * 40, zAt(rx * 0.7, ry * 0.4) * 0.6); this.sweatM.scale.set(7, 12, 6); }
    // 鼻（引っ張りで伸びる）
    const st = p.stretch, ny0 = -ry * 0.2, nz = zAt(0, ny0) + nr * 0.3;
    this.noseM3.position.set(0, ny0 - st * nr * 0.28, nz); this.noseM3.scale.set(nr * (1 - st * 0.12), nr * (1 + st * 0.5), nr * (0.9 + st * 0.25));
    const nyy = ny0 - nr * 0.5 - st * nr * 0.55, nzz = nz + nr * (0.62 + st * 0.15);
    this.nostrilL.position.set(-nr * 0.42, nyy, nzz); this.nostrilR.position.set(nr * 0.42, nyy, nzz);
    this.nostrilL.scale.set(nr * 0.2, nr * 0.26 * (1 + st * 0.4), nr * 0.12); this.nostrilR.scale.copy(this.nostrilL.scale);
    // 口
    const my = -ry * 0.55, mw = rx * 0.34, mz = zAt(0, my) + 2;
    const open = p.happy || expr >= 2, arc = !open;
    this.mArc.visible = arc; this.mOpen.visible = this.tongue.visible = open;
    if (arc) {
      this.mArc.position.set(0, my + (expr === 0 ? mw * 0.5 : mw * 0.25), mz + 2); this.mArc.rotation.z = Math.PI;
      this.mArc.scale.set(mw * 0.8, expr === 0 ? mw * 0.5 : mw * 0.12 + 0.01, mw * 0.8);
    } else {
      const o = p.happy ? 1.1 : expr === 3 ? 1.2 : 0.8, hw = p.happy ? mw : mw * 0.5 * o, hh = p.happy ? mw * 0.6 : mw * (0.35 + (expr - 1) * 0.15) * o + p.flick;
      this.mOpen.position.set(0, my - 4, mz); this.mOpen.scale.set(hw, hh, 7);
      this.tongue.position.set(0, my - 4 - hh * 0.55, mz + 2); this.tongue.scale.set(hw * 0.5, hh * 0.3, 3);
    }
    this.hair.mesh.visible = false; this.hand.visible = false; this.flyG.visible = false;

    // 鼻毛（根元=左の鼻の穴）
    this.rootG.updateMatrixWorld(true);
    this.nostrilL.getWorldPosition(this.tmp); this.rootG.worldToLocal(this.tmp);
    const rX = this.tmp.x, rY = this.tmp.y, rZ = this.tmp.z + 3;
    if (p.hairKind > 0) {
      const tx = p.tipX - cx, ty = cy - p.tipY, n = 40, cl = this.hair.cl;
      for (let i = 0; i <= n; i++) {
        const f = i / n, w = Math.sin(f * p.waves * 6.2832 + time * 2) * p.amp * f * (1 - f * 0.2);
        cl[i * 3] = rX + (tx - rX) * f + w; cl[i * 3 + 1] = rY + (ty - rY) * f; cl[i * 3 + 2] = rZ + f * 40;
      }
      this.hair.commit(3); this.hair.mesh.visible = true;
      if (p.hairKind === 1 && p.hand && !p.noHand) {
        this.hand.visible = true; this.hand.position.set(tx, ty, rZ + 60);
        this.palmH.position.set(0, -18, 0); this.palmH.scale.set(22, 34, 20);
        this.fingL.position.set(-14, 6, 6); this.fingL.scale.set(9, 20, 9); this.fingL.rotation.z = 0.3;
        this.fingR.position.set(14, 6, 6); this.fingR.scale.set(9, 20, 9); this.fingR.rotation.z = -0.3;
      }
    }
    // 抜けた毛／切れた毛片
    if (p.fly) {
      this.flyG.visible = true; this.flyG.position.set(p.flyX - cx, cy - p.flyY, 70); this.flyG.rotation.z = -p.flyRot;
      const cl = this.fly.cl;
      if (p.fly === 1) {
        for (let i = 0; i <= 20; i++) { cl[i * 3] = Math.sin(i * 0.8 + time * 8) * 8; cl[i * 3 + 1] = -i * 10; cl[i * 3 + 2] = 0; }
        this.flyPalm.visible = !p.noHand; this.flyPalm.position.set(0, 10, 0); this.flyPalm.scale.set(24, 32, 20);
      } else {
        for (let i = 0; i <= 20; i++) { cl[i * 3] = Math.sin(i * 0.8) * 7; cl[i * 3 + 1] = -i * 7.2; cl[i * 3 + 2] = 0; }
        this.flyPalm.visible = false;
      }
      this.fly.commit(3);
    }
  }

  render() { this.renderer.render(this.scene, this.camera); }

  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.scene.traverse(o => { const m = o as Mesh; if (m.geometry) m.geometry.dispose(); });
    for (const m of this.mats) m.dispose();
    this.sph.dispose(); this.cylG.dispose(); this.torus.dispose(); this.circ.dispose(); this.grad.dispose();
    this.renderer.dispose(); try { this.renderer.forceContextLoss(); } catch { /* ignore */ }
    this.canvas.remove();
  }
}
