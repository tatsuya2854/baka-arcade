// おならエレベーター用 3D ステージ（Three.js・プリミティブのみ）。uncle3d.ts の UncleKit/Uncle3D を利用し、障害物・ガス粒子・噴射炎は自前。
// 座標は 2D ワールド(px)→画面(CSS px)の写像に合わせる。z=0 が画面面。初期化に失敗したら throw（呼び出し側が2Dへフォールバック）。
import {
  AmbientLight, BoxGeometry, BufferAttribute, BufferGeometry, ConeGeometry, CylinderGeometry, DirectionalLight, DynamicDrawUsage, Group,
  IcosahedronGeometry, Material, Mesh, MeshBasicMaterial, MeshToonMaterial, PerspectiveCamera, Points, Scene, ShaderMaterial,
  SphereGeometry, TorusGeometry, WebGLRenderer,
} from 'three';
import { Uncle3D, UncleKit } from '../../core/uncle3d';
import type { Expr } from '../../core/characters';

export interface ObsLike { kind: string; x: number; y: number; vx: number; vy: number; ph: number; col: string }
export interface PartLike { x: number; y: number; life: number; max: number; r: number; k: number }

interface Inst { root: Group; upd: (o: ObsLike) => void; mark: number }
const MAXP = 360;

export class Fart3D {
  readonly canvas: HTMLCanvasElement;
  readonly kit: UncleKit;
  lost = false;
  private renderer: WebGLRenderer; private scene = new Scene(); private camera: PerspectiveCamera;
  private onLost: (e: Event) => void;
  private geos: BufferGeometry[] = []; private mats: Material[] = [];
  private sph: SphereGeometry; private box: BoxGeometry; private cone: ConeGeometry; private cyl: CylinderGeometry; private ico: IcosahedronGeometry; private tor: TorusGeometry; private flameGeo: ConeGeometry;
  private insts = new Map<ObsLike, Inst>(); private frame = 0;
  private cw = 390; private ch = 844; private S = 1; private OX = 0; private H = 640; private camY = 0; private shX = 0; private shY = 0;
  private uncle: Uncle3D;
  private flame1: Mesh; private flame2: Mesh; private flameG = new Group();
  private pts: Points; private pPos: Float32Array; private pCol: Float32Array; private pSize: Float32Array; private pGeo = new BufferGeometry();
  private yellow: MeshBasicMaterial; private pink: MeshBasicMaterial;

  constructor(onLost?: () => void) {
    const canvas = this.canvas = document.createElement('canvas');
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.setClearColor(0x000000, 0);
    this.onLost = (e) => { e.preventDefault(); this.lost = true; onLost?.(); };
    canvas.addEventListener('webglcontextlost', this.onLost);
    this.kit = new UncleKit();
    this.camera = new PerspectiveCamera(18, 1, 10, 6000);
    this.scene.add(new AmbientLight(0xffffff, 1.5));
    const dl = new DirectionalLight(0xffffff, 2.4); dl.position.set(-0.6, 0.9, 1); this.scene.add(dl);
    const rim = new DirectionalLight(0x9fb8ff, 0.8); rim.position.set(0.8, 0.2, 0.6); this.scene.add(rim);
    const G = <T extends BufferGeometry>(g: T) => { this.geos.push(g); return g; };
    this.sph = G(new SphereGeometry(1, 16, 12)); this.box = G(new BoxGeometry(1, 1, 1)); this.cone = G(new ConeGeometry(1, 1, 12));
    this.cyl = G(new CylinderGeometry(1, 1, 1, 10)); this.ico = G(new IcosahedronGeometry(1, 0)); this.tor = G(new TorusGeometry(1, 0.25, 6, 12, Math.PI));
    this.flameGeo = G(new ConeGeometry(1, 1, 10)); this.flameGeo.translate(0, 0.5, 0);
    this.yellow = this.basic('#ffe35a'); this.pink = this.basic('#ff5a8a');
    // 噴射炎（先端が下）
    const fm1 = this.basic('#6aff6a', 0.8), fm2 = this.basic('#fff58a', 0.95);
    this.flame1 = new Mesh(this.flameGeo, fm1); this.flame2 = new Mesh(this.flameGeo, fm2);
    this.flame1.rotation.z = this.flame2.rotation.z = Math.PI; this.flame2.position.z = 1;
    this.flameG.add(this.flame1, this.flame2); this.flameG.visible = false; this.scene.add(this.flameG);
    // 主人公
    this.uncle = new Uncle3D(this.kit, 'normal', 'skin_normal'); this.scene.add(this.uncle.group);
    // ガス粒子（Points + 柔らかい円）
    this.pPos = new Float32Array(MAXP * 3); this.pCol = new Float32Array(MAXP * 4); this.pSize = new Float32Array(MAXP);
    const ap = new BufferAttribute(this.pPos, 3), ac = new BufferAttribute(this.pCol, 4), as = new BufferAttribute(this.pSize, 1);
    ap.setUsage(DynamicDrawUsage); ac.setUsage(DynamicDrawUsage); as.setUsage(DynamicDrawUsage);
    this.pGeo.setAttribute('position', ap); this.pGeo.setAttribute('col', ac); this.pGeo.setAttribute('size', as); this.pGeo.setDrawRange(0, 0);
    const pm = new ShaderMaterial({
      transparent: true, depthWrite: false,
      vertexShader: 'attribute float size; attribute vec4 col; varying vec4 vC; void main(){ vC=col; gl_PointSize=size; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'precision mediump float; varying vec4 vC; void main(){ float d=length(gl_PointCoord-0.5)*2.0; gl_FragColor=vec4(vC.rgb, vC.a*smoothstep(1.0,0.55,d)); }',
    });
    this.mats.push(pm);
    this.pts = new Points(this.pGeo, pm); this.pts.frustumCulled = false; this.scene.add(this.pts);
  }
  private basic(color: string, opacity = 1) { const m = new MeshBasicMaterial({ color, transparent: opacity < 1, opacity }); this.mats.push(m); return m; }
  private own(color: string, opacity = 1) { const m = new MeshToonMaterial({ color, gradientMap: this.kit.gradient, transparent: opacity < 1, opacity }); this.mats.push(m); return m; }

  resize(cw: number, ch: number, dpr: number) {
    this.cw = cw; this.ch = ch;
    this.renderer.setPixelRatio(Math.min(dpr, 2)); this.renderer.setSize(cw, ch, false);
    const fov = this.camera.fov * Math.PI / 180, D = ch / 2 / Math.tan(fov / 2);
    this.camera.aspect = cw / ch; this.camera.position.set(0, 0, D); this.camera.near = D * 0.3; this.camera.far = D * 3; this.camera.updateProjectionMatrix();
  }
  /** 2Dと同じ写像: 画面x = OX+wx*S, 画面y = (H-(wy-camY))*S。 */
  setMap(S: number, OX: number, H: number, camY: number, shX: number, shY: number) { this.S = S; this.OX = OX; this.H = H; this.camY = camY; this.shX = shX; this.shY = shY; }
  private X(wx: number) { return this.OX + (wx + this.shX) * this.S - this.cw / 2; }
  private Y(wy: number) { return this.ch / 2 - (this.H - (wy - this.camY) + this.shY) * this.S; }
  begin() { this.frame++; }
  end() {
    for (const [o, i] of this.insts) if (i.mark !== this.frame) { this.scene.remove(i.root); this.insts.delete(o); }
  }

  /** 主人公。h=ワールドpx。 */
  player(x: number, y: number, h: number, rot: number, expr: Expr, flail: number, t: number, jp: number, yaw: number, pitch: number, visible: boolean) {
    const u = this.uncle; u.group.visible = visible;
    u.pose(this.kit, expr, flail, t, 1);
    u.place(this.X(x), this.Y(y), 0, rot, h * this.S, -0.16 * jp, yaw);
    u.group.rotation.x = pitch;
    // 噴射炎：おじさんの尻の下
    const f = this.flameG; f.visible = visible && jp > 0;
    if (f.visible) {
      const S = this.S, len = (34 + 70 * jp + Math.random() * 14) * S, w = (12 + jp * 8) * S;
      f.position.set(this.X(x), this.Y(y) - h * S * 0.2, -4); f.rotation.z = -rot * 0.6;
      this.flame1.scale.set(w, len, w); this.flame2.scale.set(w * 0.55, len * 0.6, w * 0.55);
    }
  }

  /** ガス粒子（2Dの配列をそのまま転写）。 */
  parts(list: PartLike[], H: number) {
    void H;
    const n = Math.min(list.length, MAXP), S = this.S, dp = this.renderer.getPixelRatio();
    for (let i = 0; i < n; i++) {
      const p = list[i], k = p.life / p.max, i3 = i * 3, i4 = i * 4;
      this.pPos[i3] = this.X(p.x); this.pPos[i3 + 1] = this.Y(p.y); this.pPos[i3 + 2] = p.k < 2 ? -24 : 8;
      let r = p.r, R: number, Gc: number, B: number, A: number;
      if (p.k >= 2) { R = 1; Gc = 0.9; B = 0.35; A = 1 - k; r = p.r * (1 - k * 0.5) * 1.3; }
      else {
        r = p.r * (1 + k * 1.2) * 1.5;
        if (k < 0.3) { R = (255 + (150 - 255) * (k / 0.3)) / 255; Gc = 1; B = (120 + (100 - 120) * (k / 0.3)) / 255; A = 0.95 - k; }
        else { R = (150 + (110 - 150) * k) / 255; Gc = (220 + (150 - 220) * k) / 255; B = 0.35; A = (1 - k) * 0.7; }
      }
      this.pCol[i4] = R; this.pCol[i4 + 1] = Gc; this.pCol[i4 + 2] = B; this.pCol[i4 + 3] = Math.max(0, A);
      this.pSize[i] = r * 2 * S * dp;
    }
    this.pGeo.setDrawRange(0, n);
    (this.pGeo.attributes.position as BufferAttribute).needsUpdate = true; (this.pGeo.attributes.col as BufferAttribute).needsUpdate = true; (this.pGeo.attributes.size as BufferAttribute).needsUpdate = true;
  }

  /** 障害物 1 つ（無ければ生成）。 */
  obstacle(o: ObsLike) {
    let i = this.insts.get(o);
    if (!i) { i = this.build(o); this.insts.set(o, i); this.scene.add(i.root); }
    i.mark = this.frame;
    i.root.position.set(this.X(o.x), this.Y(o.y), 0); i.root.scale.setScalar(this.S);
    i.upd(o);
  }

  private mesh(parent: Group, geo: BufferGeometry, mat: Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0, outline = false) {
    const m = new Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m);
    if (outline) { const q = new Mesh(geo, this.kit.outlineMat); q.scale.set(sx * 1.08 + 1.6, sy * 1.08 + 1.6, sz * 1.08 + 1.6); q.position.set(x, y, z); parent.add(q); }
    return m;
  }

  private build(o: ObsLike): Inst {
    const root = new Group(), inner = new Group(); root.add(inner);
    const T = (c: string) => this.kit.toon(c);
    const m = (p: Group, g: BufferGeometry, mat: Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0, ol = false) => this.mesh(p, g, mat, sx, sy, sz, x, y, z, ol);
    const { sph, box, cone, cyl, ico, tor } = this;
    let upd: (o: ObsLike) => void = () => {};
    switch (o.kind) {
      case 'bird': {
        const col = T(o.col);
        m(inner, sph, col, 20, 12, 12, 0, 0, 0, true); m(inner, sph, col, 9, 8, 8, 14, 4, 0, true);
        const beak = m(inner, cone, T('#ffb02e'), 4, 10, 4, 25, 3, 0); beak.rotation.z = -Math.PI / 2;
        for (const s of [-1, 1]) { m(inner, sph, T('#ffffff'), 3.2, 3.2, 1.6, 17, 6, s * 7); m(inner, sph, T('#111111'), 1.6, 1.6, 1, 18, 6, s * 8.2); }
        const tail = m(inner, cone, col, 6, 16, 2, -26, 0, 0); tail.rotation.z = Math.PI / 2;
        const wl = new Group(), wr = new Group(); wl.position.set(-2, 3, 0); wr.position.set(-2, 3, 0); inner.add(wl, wr);
        m(wl, sph, col, 8, 1.8, 17, 0, 0, 13, true); m(wr, sph, col, 8, 1.8, 17, 0, 0, -13, true);
        upd = (b) => { const f = Math.sin(b.ph * 14) * 0.9; wl.rotation.x = f; wr.rotation.x = -f; inner.rotation.y = b.vx >= 0 ? -0.55 : Math.PI + 0.55; inner.rotation.z = Math.sin(b.ph * 14) * 0.05; };
        break;
      }
      case 'balloon': {
        const col = T(o.col);
        m(inner, sph, col, 24, 30, 24, 0, 0, 0, true);
        m(inner, sph, T('#ffffff'), 5, 9, 3, -10, 10, 19);
        const knot = m(inner, cone, col, 5, 8, 5, 0, -31, 0); knot.rotation.z = Math.PI;
        m(inner, cyl, T('#555555'), 0.8, 18, 0.8, 0, -40, 0); m(inner, box, T('#8a5a2b'), 14, 9, 14, 0, -53, 0, true);
        for (const s of [-1, 1]) m(inner, sph, T('#111111'), 2.8, 3.2, 2, s * 8, 3, 22);
        const mo = m(inner, tor, T('#111111'), 6, 6, 3, 0, -2, 22.5); mo.rotation.z = Math.PI;
        upd = (b) => { inner.rotation.z = Math.sin(b.ph * 2) * 0.08; inner.rotation.y = Math.sin(b.ph * 1.3) * 0.25; };
        break;
      }
      case 'storm': {
        const dark = T('#585868'), light = T('#8c8c9c'), puffs: Mesh[] = [];
        for (const [x, y, r] of [[-26, 0, 25], [-1, 9, 32], [30, 0, 25], [4, -9, 28]]) puffs.push(m(inner, sph, dark, r, r * 0.92, r * 0.9, x, y, 0, true));
        for (const x of [-12, 14]) m(inner, sph, T('#111111'), 4, 4.5, 2, x, 0, 27);
        for (const s of [-1, 1]) { const br = m(inner, box, T('#111111'), 13, 2.6, 2, 1 + s * 13, 8, 28); br.rotation.z = -s * 0.28; }
        const boltG = new Group(), bm = this.basic('#fff6a0'); inner.add(boltG);
        const pts: [number, number][] = [[0, -14], [-10, -60], [6, -90], [-8, -140], [0, -220]];
        for (let i = 0; i < pts.length - 1; i++) {
          const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0) + 4;
          const s = m(boltG, box, bm, L, 8, 4, (x0 + x1) / 2, (y0 + y1) / 2, 6); s.rotation.z = Math.atan2(y1 - y0, x1 - x0);
        }
        const warnM = m(inner, box, this.basic('#ffef60'), 4, 40, 3, 0, -34, 4);
        upd = (b) => {
          const c = b.ph % 3.2, warn = c > 2.2 && c < 2.7, bolt = c >= 2.7 && c < 3.0;
          for (const p of puffs) p.material = warn || bolt ? light : dark;
          boltG.visible = bolt; warnM.visible = warn && Math.sin(c * 40) > -0.2; inner.position.y = Math.sin(b.ph * 2) * 2;
        };
        break;
      }
      case 'plane': {
        const red = T('#e04a4a');
        m(inner, sph, T('#f2f4f8'), 46, 11, 11, 0, 0, 0, true);
        const fin = m(inner, cone, red, 10, 22, 2.5, -38, 12, 0); fin.rotation.z = 0.5;
        m(inner, box, T('#c8d0e0'), 20, 2.4, 56, -2, -3, 0, true); m(inner, box, T('#c8d0e0'), 9, 2, 24, -40, 3, 0);
        for (let i = 0; i < 5; i++) for (const s of [-1, 1]) m(inner, sph, T('#4aa3ff'), 2.6, 2.6, 1.5, -16 + i * 9, 3, s * 10.5);
        const prop = new Group(); prop.position.set(47, 0, 0); inner.add(prop);
        m(prop, box, T('#222222'), 2, 28, 3, 0, 0, 0); m(prop, box, T('#222222'), 2, 3, 28, 0, 0, 0); m(inner, sph, red, 5, 5, 5, 46, 0, 0);
        upd = (b) => { inner.rotation.y = b.vx >= 0 ? -0.5 : Math.PI + 0.5; prop.rotation.x = b.ph * 40; inner.rotation.z = Math.sin(b.ph * 2) * 0.03; };
        break;
      }
      case 'ufo': {
        const lights = new Group(), ls: Mesh[] = [];
        m(inner, sph, T('#9aa4b8'), 38, 9, 38, 0, 0, 0, true); m(inner, sph, T('#c9d2e4'), 30, 5, 30, 0, 5, 0);
        m(inner, sph, this.own('#9ee8ff', 0.85), 17, 15, 17, 0, 8, 0);
        m(inner, sph, T('#66ee66'), 5.5, 6, 5.5, 0, 9, 0); for (const s of [-1, 1]) m(inner, sph, T('#111111'), 1.4, 2, 1, s * 2.4, 10, 4.8);
        inner.add(lights);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ls.push(m(lights, sph, this.yellow, 3.2, 3.2, 3.2, Math.cos(a) * 33, -1, Math.sin(a) * 33)); }
        upd = (b) => {
          lights.rotation.y = b.ph * 2; inner.rotation.x = 0.3; inner.rotation.z = Math.sin(b.ph * 3) * 0.1; inner.rotation.y = b.ph * 0.5;
          const f = Math.floor(b.ph * 6); for (let i = 0; i < ls.length; i++) ls[i].material = (f + i) % 2 ? this.yellow : this.pink;
        };
        break;
      }
      default: { // meteor
        const rock = new Group(); inner.add(rock);
        m(rock, ico, T('#7a5a48'), 21, 18, 18, 0, 0, 0, true); m(rock, ico, T('#5a3f30'), 7, 6, 6, 8, 6, 12);
        const tail = m(inner, cone, this.basic('#ff9a30', 0.85), 16, 80, 16, -45, 0, 0); tail.rotation.z = Math.PI / 2;
        const tail2 = m(inner, cone, this.basic('#fff0a0', 0.9), 9, 48, 9, -30, 0, 1); tail2.rotation.z = Math.PI / 2;
        upd = (b) => { inner.rotation.z = Math.atan2(b.vy, b.vx); rock.rotation.set(b.ph * 3, b.ph * 2.3, 0); };
      }
    }
    return { root, upd, mark: 0 };
  }

  render() { if (!this.lost) this.renderer.render(this.scene, this.camera); }
  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.insts.clear(); this.scene.clear(); this.kit.dispose();
    for (const g of this.geos) g.dispose(); this.pGeo.dispose(); for (const mt of this.mats) mt.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.canvas.remove();
  }
}
