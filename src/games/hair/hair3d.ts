// ハゲを守れ！ の3D描画層（Three.js）。物理は index.ts の2Dのまま、描画だけを担当。
// uncle3d.ts の UncleKit/Uncle3D を再利用し、髪(verlet各節)・押さえる手・舞う髪を自前で追加する。
import {
  AmbientLight, CylinderGeometry, DirectionalLight, Group, Material, Mesh, MeshBasicMaterial, MeshToonMaterial, PerspectiveCamera,
  Scene, SphereGeometry, Vector3, WebGLRenderer,
} from 'three';
import type { Expr } from '../../core/characters';
import { Uncle3D, UncleKit } from '../../core/uncle3d';

export interface HairFrame {
  W: number; H: number; cx: number; uy: number; h: number; rx: number; ry: number; hr: number;
  zoom: number; zx: number; zy: number; shX: number; shY: number;       // zoom中心(px)・画面揺れ(px)
  wind: number; expr: Expr; flail: number; stress: number; dmg: number; fatigue: number; real: number;
  detached: boolean; over: boolean; overT: number;
  nodes: { x: number; y: number }[];
  hand: { x: number; y: number; rot: number; t: number; dir: number };
  flying: { x: number; y: number; rot: number; size: number; a: number }[]; nFlying: number;
}

const NODE_MAX = 16, FLY_MAX = 32;

export class Hair3D {
  readonly canvas: HTMLCanvasElement;
  lost = false;
  private renderer: WebGLRenderer; private scene = new Scene(); private camera = new PerspectiveCamera(12, 1, 10, 6000);
  private world = new Group(); private kit: UncleKit; private uncle: Uncle3D;
  private cyl = new CylinderGeometry(1, 1, 1, 6, 1, false); private sph = new SphereGeometry(1, 10, 8);
  private segs: Mesh[] = []; private joints: Mesh[] = []; private fly: Mesh[] = [];
  private flushMat: MeshBasicMaterial; private flush: Mesh;
  private hand = new Group(); private handMat: MeshToonMaterial; private handParts: Mesh[] = []; private handOutline = new Group();
  private thumb: Mesh; private thumbO: Mesh;
  private matA: MeshToonMaterial; private matB: MeshToonMaterial; private hairRed = false;
  private onLost: (e: Event) => void;
  private v = new Vector3(); private D = 1000; private cw = 390; private ch = 844;

  constructor(onLost?: () => void) {
    const canvas = this.canvas = document.createElement('canvas');
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.setClearColor(0x000000, 0);
    this.onLost = (e) => { e.preventDefault(); this.lost = true; onLost?.(); };
    canvas.addEventListener('webglcontextlost', this.onLost);
    this.kit = new UncleKit();
    this.scene.add(this.world);
    this.scene.add(new AmbientLight(0xffffff, 1.5));
    const dl = new DirectionalLight(0xffffff, 2.4); dl.position.set(-0.6, 0.9, 1); this.scene.add(dl);
    const rim = new DirectionalLight(0x9fb8ff, 0.8); rim.position.set(0.8, 0.2, 0.6); this.scene.add(rim);
    // おじさん（頭の髪キャップは非表示=ハゲ）
    this.uncle = new Uncle3D(this.kit, 'normal', 'skin_normal');
    this.uncle.group.traverse((o) => { if ((o as Mesh).isMesh && (o as Mesh).geometry === this.kit.hairGeo) o.visible = false; });
    this.world.add(this.uncle.group);
    // 髪（節ごとの円柱 + 関節の球）
    this.matA = this.kit.toon('#3b2a20'); this.matB = this.kit.toon('#7a2a1a');
    for (let i = 0; i < NODE_MAX; i++) {
      const s = new Mesh(this.cyl, this.matA); s.visible = false; this.segs.push(s); this.world.add(s);
      const j = new Mesh(this.sph, this.matA); j.visible = false; this.joints.push(j); this.world.add(j);
    }
    for (let i = 0; i < FLY_MAX; i++) { const f = new Mesh(this.cyl, this.matA); f.visible = false; this.fly.push(f); this.world.add(f); }
    // 根元の赤み
    this.flushMat = new MeshBasicMaterial({ color: '#ff6a5e', transparent: true, opacity: 0.4, depthWrite: false });
    this.flush = new Mesh(this.sph, this.flushMat); this.flush.visible = false; this.world.add(this.flush);
    // 手
    this.handMat = new MeshToonMaterial({ color: '#f6c9a0', gradientMap: this.kit.gradient, transparent: true });
    const part = (sx: number, sy: number, sz: number, x: number, y: number) => {
      const m = new Mesh(this.sph, this.handMat); m.scale.set(sx, sy, sz); m.position.set(x, y, 0); this.hand.add(m); this.handParts.push(m);
      const o = new Mesh(this.sph, this.kit.outlineMat); o.scale.set(sx * 1.12 + 0.04, sy * 1.12 + 0.04, sz * 1.12 + 0.04); o.position.set(x, y, 0); this.handOutline.add(o);
      return [m, o] as const;
    };
    part(0.95, 0.62, 0.5, 0, 0);
    for (let f = -2; f <= 1; f++) part(0.19, 0.5, 0.22, f * 0.4 + 0.2, 0.6);
    const [tm, to] = part(0.5, 0.2, 0.22, 0, 0.1); this.thumb = tm; this.thumbO = to;
    this.hand.add(this.handOutline); this.world.add(this.hand);
  }

  resize(cw: number, ch: number, dpr: number) {
    this.cw = cw; this.ch = ch;
    this.renderer.setPixelRatio(Math.min(dpr, 2)); this.renderer.setSize(cw, ch, false);
    const fov = this.camera.fov * Math.PI / 180; this.D = ch / 2 / Math.tan(fov / 2);
    this.camera.aspect = cw / ch; this.camera.position.set(0, 0, this.D); this.camera.near = this.D * 0.3; this.camera.far = this.D * 3; this.camera.updateProjectionMatrix();
  }

  /** 画面座標(px, y下向き)→ワールド */
  render(f: HairFrame) {
    if (this.lost) return;
    const W = f.W, H = f.H, h = f.h, z = f.zoom;
    this.world.scale.set(z, z, z);
    this.world.position.set(f.zx * (1 - z) + f.shX - W / 2, H / 2 - (f.zy * (1 - z) + f.shY), 0);
    const wx = (x: number) => x - W / 2, wy = (y: number) => H / 2 - y;
    // ---- おじさん ----
    const u = this.uncle, g = u.group;
    u.pose(this.kit, 'idle', f.flail, f.real, 0); u.setExpr(f.expr, this.kit);   // 腕の上げ下げはflailだけで決める
    const pain = Math.min(1, f.dmg), over = f.over ? Math.min(1, f.overT / 0.5) : 0;
    const wind = f.wind;
    g.rotation.set(-0.12 * Math.min(1, Math.abs(wind)) - pain * 0.1 - over * 0.25, -wind * 0.35 + (f.over ? Math.sin(f.real * 3) * 0.2 * over : 0), -wind * 0.09 + (f.over ? Math.sin(f.real * 9) * 0.04 * over : 0));
    const sq = pain * 0.04 + (f.over ? Math.sin(f.real * 14) * 0.015 : 0);
    g.scale.set(h * (1 + sq), h * (1 - sq), h);
    // 髪の根元(頭頂)が2D物理の位置に来るよう、頭頂を支点に回転させる
    this.v.set(0, (f.uy - f.ry) * (1 - sq), 0).applyEuler(g.rotation);
    g.position.set(wx(f.rx) - this.v.x, wy(f.ry) - this.v.y, -this.v.z);
    // ---- 髪 ----
    const n = Math.min(f.nodes.length, NODE_MAX), red = f.stress > 0.7;
    if (red !== this.hairRed) { this.hairRed = red; const m = red ? this.matB : this.matA; for (let i = 0; i < NODE_MAX; i++) { this.segs[i].material = m; this.joints[i].material = m; } }
    for (let i = 0; i < NODE_MAX; i++) {
      const s = this.segs[i], j = this.joints[i];
      if (i >= n) { s.visible = false; j.visible = false; continue; }
      const k = i / (n - 1), r = 3.6 - 2 * k, zi = h * (0.03 + k * 0.2);
      const a = f.nodes[i];
      j.visible = true; j.position.set(wx(a.x), wy(a.y), zi); j.scale.set(r, r, r);
      if (i < n - 1) {
        const b = f.nodes[i + 1], dx = b.x - a.x, dy = -(b.y - a.y), len = Math.hypot(dx, dy) || 1e-3, zb = h * (0.03 + (i + 1) / (n - 1) * 0.2);
        const rr = 3.6 - 2 * ((i + 0.5) / (n - 1));
        s.visible = true; s.position.set(wx((a.x + b.x) / 2), wy((a.y + b.y) / 2), (zi + zb) / 2);
        s.rotation.set(0, 0, Math.atan2(dy, dx) - Math.PI / 2); s.scale.set(rr, len, rr);
      } else s.visible = false;
    }
    // 根元の赤み
    const fl = !f.detached && f.stress > 0.15;
    this.flush.visible = fl;
    if (fl) { this.flush.position.set(wx(f.rx), wy(f.ry + 2), h * 0.02); this.flush.scale.set(5 + f.stress * 8, 3 + f.stress * 4, 4); this.flushMat.opacity = 0.25 + f.stress * 0.5; }
    // 舞う髪
    for (let i = 0; i < FLY_MAX; i++) {
      const q = this.fly[i];
      if (i >= f.nFlying) { q.visible = false; continue; }
      const p = f.flying[i], sc = Math.max(0.01, p.a);
      q.visible = true; q.position.set(wx(p.x), wy(p.y), h * (0.1 + (i % 5) * 0.06)); q.rotation.set(0, 0, -p.rot + Math.PI / 2); q.scale.set(1.5 * sc, p.size * 2 * sc, 1.5 * sc);
    }
    // ---- 手 ----
    const hd = f.hand, sz = f.hr * 0.5, ho = hd.t > 0.5;
    this.hand.position.set(wx(hd.x), wy(hd.y), h * 0.42);
    this.hand.rotation.set(-0.35 * hd.t, 0, -hd.dir * (0.25 - hd.t * 0.25));
    this.hand.scale.set(sz, sz, sz);
    this.handOutline.visible = ho;
    this.handMat.opacity = 0.55 + hd.t * 0.45;
    const hurt = Math.min(1, f.dmg);
    this.handMat.color.setRGB(246 / 255, (201 - hurt * 90 - f.fatigue * 20) / 255, (160 - hurt * 90) / 255);
    this.thumb.position.x = -hd.dir * 0.9; this.thumb.position.y = -0.1; this.thumb.rotation.z = hd.dir * 0.5;
    this.thumbO.position.copy(this.thumb.position); this.thumbO.rotation.z = this.thumb.rotation.z;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.world.clear(); this.kit.dispose();
    this.cyl.dispose(); this.sph.dispose();
    for (const m of [this.flushMat, this.handMat] as Material[]) m.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.canvas.remove();
  }
}
