// 3D おじさん（Three.js・プリミティブのみ・外部素材なし）。物理は2Dのまま、描画だけ3Dにするための部品。
// モデルは身長=1 の正規化座標（y上向き・原点=身体中心）。呼び出し側で group.scale = h にする。
import {
  AdditiveBlending, AmbientLight, BackSide, BoxGeometry, BufferGeometry, CanvasTexture, CapsuleGeometry, DataTexture,
  DirectionalLight, DoubleSide, Group, LinearFilter, Material, Mesh, MeshBasicMaterial, MeshToonMaterial, NearestFilter,
  PerspectiveCamera, RedFormat, Scene, Shape, ShapeGeometry, SphereGeometry, Sprite, SpriteMaterial, SRGBColorSpace, Texture, WebGLRenderer,
} from 'three';
import { TYPE_DIM, type Expr, type UncleType } from './characters';

const SKIN_STYLE: Record<string, { hair: string; skinTone: string; shirt?: string; helmet?: boolean; aura?: boolean }> = {
  skin_normal: { hair: '#3b2a20', skinTone: '#f6c9a0' }, skin_blond: { hair: '#ffd23f', skinTone: '#f6c9a0' },
  skin_muscle: { hair: '#2b2b2b', skinTone: '#e0a070', shirt: '#222222' }, skin_space: { hair: '#3b2a20', skinTone: '#f6c9a0', shirt: '#e8eef5', helmet: true },
  skin_legend: { hair: '#fff2a8', skinTone: '#ffe0b8', shirt: '#ffd700', aura: true },
};
const EXPRS: Expr[] = ['idle', 'happy', 'scared', 'wow', 'angry', 'dead', 'sweat', 'cry'];
const OUTLINE = '#1a0a2a';
const FACE_W = 256, FACE_H = 208, FACE_PHI = 1.6, FACE_THETA = 1.3; // 顔パッチの角度幅(rad)。160px/rad で縦横等倍

/** 共有ジオメトリ・マテリアル・テクスチャの持ち主。dispose() で全解放。 */
export class UncleKit {
  readonly sph = new SphereGeometry(0.5, 16, 12);
  readonly hairGeo = new SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  readonly torsoGeo = new CapsuleGeometry(0.5, 0.4, 4, 12);
  readonly limbGeo = (() => { const g = new CapsuleGeometry(0.5, 1, 3, 8); g.translate(0, -1, 0); return g; })();   // 上端が支点, 全長2
  readonly faceGeo = new SphereGeometry(0.5 * 1.012, 20, 14, Math.PI / 2 - FACE_PHI / 2, FACE_PHI, Math.PI / 2 - FACE_THETA / 2, FACE_THETA);
  readonly tieGeo: ShapeGeometry; readonly starGeo: ShapeGeometry;
  readonly auraTex: CanvasTexture;
  readonly faceMats: Record<Expr, MeshBasicMaterial> = {} as Record<Expr, MeshBasicMaterial>;
  readonly outlineMat = new MeshBasicMaterial({ color: OUTLINE, side: BackSide });
  readonly starMat = new MeshBasicMaterial({ color: '#ffffff', side: DoubleSide });
  readonly tieMat: MeshToonMaterial; readonly shoeMat: MeshToonMaterial; readonly pantsMat: MeshToonMaterial; readonly mustMat: MeshToonMaterial;
  readonly helmetMat = new MeshBasicMaterial({ color: '#a8dcff', transparent: true, opacity: 0.22, depthWrite: false });
  readonly auraMat: SpriteMaterial;
  readonly gradient: DataTexture;
  private toons = new Map<string, MeshToonMaterial>();
  private texs: Texture[] = [];

  constructor() {
    this.gradient = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat);
    this.gradient.minFilter = this.gradient.magFilter = NearestFilter; this.gradient.needsUpdate = true;
    this.tieMat = this.toon('#e63946'); this.shoeMat = this.toon('#222222'); this.pantsMat = this.toon('#2b3a67'); this.mustMat = this.toon('#2b2118');
    const tie = new Shape(); tie.moveTo(-0.018, 0); tie.lineTo(0.018, 0); tie.lineTo(0.03, -0.1); tie.lineTo(0, -0.14); tie.lineTo(-0.03, -0.1); tie.closePath();
    this.tieGeo = new ShapeGeometry(tie);
    const star = new Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.5 : 1, a = -Math.PI / 2 + i * Math.PI / 5; const x = Math.cos(a) * r, y = -Math.sin(a) * r; i ? star.lineTo(x, y) : star.moveTo(x, y); } star.closePath();
    this.starGeo = new ShapeGeometry(star);
    for (const e of EXPRS) {
      const tex = new CanvasTexture(this.drawFace(e)); tex.colorSpace = SRGBColorSpace; tex.minFilter = LinearFilter; tex.generateMipmaps = false; this.texs.push(tex);
      this.faceMats[e] = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    }
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(32, 32, 4, 32, 32, 32); gr.addColorStop(0, 'rgba(255,230,120,0.7)'); gr.addColorStop(1, 'rgba(255,230,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.auraTex = new CanvasTexture(c); this.auraTex.colorSpace = SRGBColorSpace;
    this.auraMat = new SpriteMaterial({ map: this.auraTex, blending: AdditiveBlending, depthWrite: false, transparent: true });
  }
  toon(color: string): MeshToonMaterial {
    let m = this.toons.get(color);
    if (!m) { m = new MeshToonMaterial({ color, gradientMap: this.gradient }); this.toons.set(color, m); }
    return m;
  }
  /** 顔テクスチャ。座標は「顔中心からの角度(rad)」。x右+, y上+ */
  private drawFace(e: Expr): HTMLCanvasElement {
    const c = document.createElement('canvas'); c.width = FACE_W; c.height = FACE_H; const g = c.getContext('2d')!;
    const K = FACE_W / FACE_PHI, X = (a: number) => FACE_W / 2 + a * K, Y = (a: number) => FACE_H / 2 - a * K;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#222'; g.fillStyle = '#fff'; g.lineWidth = 5;
    const ex = 0.4, ey = 0.1, big = e === 'scared' || e === 'wow' ? 1.35 : 1;
    // 目
    for (const s of [-1, 1]) {
      const x = X(s * ex), y = Y(ey);
      if (e === 'dead') { g.lineWidth = 7; const r = 0.12 * K; g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke(); }
      else if (e === 'happy') { g.lineWidth = 7; g.beginPath(); g.arc(x, y + 8, 0.14 * K, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
      else {
        g.lineWidth = 5; g.beginPath(); g.ellipse(x, y, 0.15 * K * big, 0.19 * K * big, 0, 0, 7); g.fillStyle = '#fff'; g.fill(); g.stroke();
        g.fillStyle = '#111'; g.beginPath(); g.arc(x, y + (e === 'cry' ? 4 : 0), 0.065 * K * (e === 'scared' ? 0.7 : 1), 0, 7); g.fill();
        if (e === 'cry') { g.fillStyle = '#8fd3ff'; for (const yy of [0.2, 0.32]) { g.beginPath(); g.ellipse(x + s * 3, Y(ey - yy), 7, 13, 0, 0, 7); g.fill(); } }
      }
    }
    // 眉
    g.strokeStyle = '#222'; g.lineWidth = 8;
    for (const s of [-1, 1]) {
      const inner = e === 'angry' ? -0.1 : e === 'scared' || e === 'sweat' || e === 'cry' ? 0.1 : 0, up = e === 'wow' || e === 'scared' ? 0.08 : 0;
      const yo = ey + 0.3 * big + up;
      g.beginPath(); g.moveTo(X(s * (ex + 0.17)), Y(yo)); g.lineTo(X(s * (ex - 0.17)), Y(yo + inner)); g.stroke();
    }
    // ひげ
    g.fillStyle = '#2b2118'; g.beginPath(); g.ellipse(X(0), Y(-0.25), 0.36 * K, 0.075 * K, 0, 0, 7); g.fill();
    // 口
    const mx = X(0), my = Y(-0.5); g.strokeStyle = '#7a1f1f'; g.fillStyle = '#7a1f1f'; g.lineWidth = 7;
    if (e === 'scared' || e === 'wow') { g.beginPath(); g.ellipse(mx, my, 0.1 * K, 0.14 * K, 0, 0, 7); g.fill(); }
    else if (e === 'happy') { g.beginPath(); g.arc(mx, my - 14, 0.21 * K, 0.1, Math.PI - 0.1); g.fill(); }
    else if (e === 'angry' || e === 'cry') { g.beginPath(); g.arc(mx, my + 22, 0.17 * K, Math.PI + 0.35, -0.35); g.stroke(); }
    else if (e === 'dead') { g.beginPath(); g.moveTo(mx - 20, my); g.lineTo(mx + 20, my); g.stroke(); }
    else if (e === 'sweat') { g.beginPath(); g.moveTo(mx - 20, my + 4); g.quadraticCurveTo(mx - 8, my - 6, mx, my + 4); g.quadraticCurveTo(mx + 8, my + 14, mx + 20, my + 2); g.stroke(); }
    else { g.beginPath(); g.moveTo(mx - 20, my); g.quadraticCurveTo(mx, my + 14, mx + 20, my); g.stroke(); }
    if (e === 'sweat' || e === 'scared') { g.fillStyle = '#8fd3ff'; g.strokeStyle = '#4a8fc0'; g.lineWidth = 3; g.beginPath(); g.ellipse(X(0.68), Y(0.28), 9, 16, 0, 0, 7); g.fill(); g.stroke(); }
    return c;
  }
  dispose() {
    for (const g of [this.sph, this.hairGeo, this.torsoGeo, this.limbGeo, this.faceGeo, this.tieGeo, this.starGeo] as BufferGeometry[]) g.dispose();
    for (const m of [this.outlineMat, this.starMat, this.helmetMat, this.auraMat, ...Object.values(this.faceMats), ...this.toons.values()] as Material[]) m.dispose();
    for (const t of [...this.texs, this.auraTex, this.gradient]) t.dispose();
    this.toons.clear(); this.texs.length = 0;
  }
}

/** 1体ぶんのメッシュ一式（ジオメトリ/マテリアルは UncleKit 共有）。 */
export class Uncle3D {
  readonly group = new Group();     // 位置・回転・スケール(=身長)を呼び出し側が設定
  private inner = new Group();
  private face: Mesh;
  private arms: Group[] = []; private legs: Group[] = [];
  private expr: Expr | null = null;
  private bw: number;
  constructor(kit: UncleKit, type: UncleType, skin: string) {
    const d = TYPE_DIM[type], sk = SKIN_STYLE[skin] ?? SKIN_STYLE.skin_normal;
    const bw = this.bw = d.w, headR = type === 'giant' ? 0.21 : 0.19, torsoH = 0.36, legH = 0.3;
    const hr = headR * (type === 'fat' ? 1.12 : 1) * 1.1;
    const headCy = 0.5 - headR * 1.1, torsoTop = headCy - hr * 0.85, torsoBot = torsoTop - torsoH, shirt = sk.shirt ?? d.shirt;
    const depth = bw * (type === 'fat' ? 0.95 : type === 'thin' ? 0.8 : 0.72);
    this.group.add(this.inner);
    const add = (parent: Group, geo: BufferGeometry, mat: Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0) => {
      const m = new Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); parent.add(m); return m;
    };
    const skinMat = kit.toon(sk.skinTone), shirtMat = kit.toon(shirt);
    // 胴体 + アウトライン
    const tH = torsoH * 1.08, tcy = torsoTop - torsoH / 2;
    add(this.inner, kit.torsoGeo, shirtMat, bw, tH / 1.4, depth, 0, tcy);
    add(this.inner, kit.torsoGeo, kit.outlineMat, bw * 1.07 + 0.012, tH / 1.4 * 1.05 + 0.01, depth * 1.07, 0, tcy);
    if (type === 'special') { const s = add(this.inner, kit.starGeo, kit.starMat, bw * 0.4, bw * 0.4, 1, 0, tcy, depth / 2 + 0.004); s.scale.z = 1; }
    else if (type === 'normal' || type === 'thin') add(this.inner, kit.tieGeo, kit.tieMat, 1, 1, 1, 0, torsoTop - 0.015, depth / 2 * 0.985 + 0.004);
    // 脚
    const lw = Math.max(0.05, bw * 0.22);
    for (const s of [-1, 1]) {
      const leg = new Group(); leg.position.set(s * bw * 0.2, torsoBot + 0.02, 0); this.inner.add(leg);
      add(leg, kit.limbGeo, kit.pantsMat, lw, (legH + 0.01) / 2, lw);
      add(leg, kit.sph, kit.shoeMat, lw * 1.35, 0.075, lw * 2.1, 0, -legH, lw * 0.35);
      this.legs.push(leg);
    }
    // 腕
    const aw = bw * (type === 'muscle' ? 0.26 : 0.16), aL = type === 'muscle' ? 0.27 : 0.25;
    for (const s of [-1, 1]) {
      const arm = new Group(); arm.position.set(s * bw * 0.5, torsoTop - 0.05, 0); this.inner.add(arm);
      add(arm, kit.limbGeo, skinMat, aw, aL / 2, aw);
      this.arms.push(arm);
    }
    // 頭（髪・ひげ・顔）
    const head = new Group(); head.position.set(0, headCy, 0); this.inner.add(head);
    const hw = hr * 2.1, hh = hr * 2, hd = hr * 1.9;
    add(head, kit.sph, skinMat, hw, hh, hd);
    add(head, kit.sph, kit.outlineMat, hw * 1.06 + 0.01, hh * 1.06 + 0.01, hd * 1.06 + 0.01);
    const hair = add(head, kit.hairGeo, kit.toon(sk.hair), hw * 1.07, hh * 1.07, hd * 1.07); hair.rotation.x = -0.5;
    this.face = add(head, kit.faceGeo, kit.faceMats.idle, hw / 1.0 * 0.995, hh * 0.995, hd * 0.995);
    // ひげは顔テクスチャに描画済み。耳代わりの小球
    if (type === 'fat' || type === 'giant') add(head, kit.sph, skinMat, hr * 0.5, hr * 0.5, hr * 0.5, 0, -hr * 0.55, hr * 0.5);
    if (sk.helmet) add(head, kit.sph, kit.helmetMat, hr * 2.7, hr * 2.7, hr * 2.7);
    if (sk.aura) { const sp = new Sprite(kit.auraMat); sp.scale.set(1.8, 1.8, 1); sp.position.z = -0.15; this.group.add(sp); }
    this.setExpr('idle');
  }
  setExpr(e: Expr, kit?: UncleKit) {
    if (e === this.expr) return;
    this.expr = e; if (kit) this.face.material = kit.faceMats[e];
  }
  /** 表情と手足のばたつき。material切替のため kit を渡す。 */
  pose(kit: UncleKit, e: Expr, flail: number, t: number, seed: number) {
    this.setExpr(e, kit);
    const wob = Math.sin(t * 8 + seed) * flail, up = e === 'scared' || e === 'wow' || flail > 0.4;
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1;
      this.arms[i].rotation.z = s * (up ? 2.5 + wob * 0.55 : 0.12 + wob * 0.3);
      this.legs[i].rotation.z = s * (0.04 + Math.abs(wob) * 0.4);
    }
  }
  place(x: number, y: number, z: number, angle: number, h: number, sq: number, ry: number) {
    const g = this.group; g.position.set(x, y, z); g.rotation.set(0, ry, -angle); g.scale.set(h * (1 + sq), h * (1 - sq), h);
  }
}

interface Slot { o: Uncle3D; mark: number; key: string }

/** WebGL ステージ。初期化に失敗したら throw する（呼び出し側で2Dにフォールバック）。 */
export class Stage3D {
  readonly canvas: HTMLCanvasElement;
  readonly kit: UncleKit;
  private renderer: WebGLRenderer; private scene = new Scene(); private camera: PerspectiveCamera; private world = new Group();
  private slots = new Map<number, Slot>(); private frame = 0;
  private platform = new Group(); private pillar: Mesh; private platGeos: BufferGeometry[] = []; private platMats: Material[] = []; private platTex: CanvasTexture;
  private onLost: (e: Event) => void;
  private D = 1000;
  lost = false;

  constructor(onLost?: () => void) {
    const canvas = this.canvas = document.createElement('canvas');
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance', stencil: false });
    this.renderer.setClearColor(0x000000, 0);
    this.onLost = (e) => { e.preventDefault(); this.lost = true; onLost?.(); };
    canvas.addEventListener('webglcontextlost', this.onLost);
    this.kit = new UncleKit();
    this.camera = new PerspectiveCamera(18, 1, 10, 6000);
    this.scene.add(this.world);
    this.scene.add(new AmbientLight(0xffffff, 1.5));
    const dl = new DirectionalLight(0xffffff, 2.4); dl.position.set(-0.6, 0.9, 1); this.scene.add(dl);
    const rim = new DirectionalLight(0x9fb8ff, 0.8); rim.position.set(0.8, 0.2, 0.6); this.scene.add(rim);
    // 土台（箱）
    const pw = 320, th = 40, pd = 90;
    const c = document.createElement('canvas'); c.width = 640; c.height = 80; const g = c.getContext('2d')!;
    const sg = g.createLinearGradient(0, 0, 0, 80); sg.addColorStop(0, '#ffb35a'); sg.addColorStop(0.2, '#ff7a3d'); sg.addColorStop(1, '#a8341f'); g.fillStyle = sg; g.fillRect(0, 0, 640, 80);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(14, 4, 612, 8); g.fillStyle = 'rgba(0,0,0,0.28)';
    for (let x = 30; x < 600; x += 72) { g.beginPath(); g.moveTo(x, 74); g.lineTo(x + 28, 74); g.lineTo(x + 56, 26); g.lineTo(x + 28, 26); g.closePath(); g.fill(); }
    this.platTex = new CanvasTexture(c); this.platTex.colorSpace = SRGBColorSpace;
    const side = new MeshToonMaterial({ color: '#d9582a', gradientMap: this.kit.gradient }), top = new MeshToonMaterial({ color: '#ffb35a', gradientMap: this.kit.gradient });
    const front = new MeshBasicMaterial({ map: this.platTex });
    this.platMats.push(side, top, front);
    const box = new BoxGeometry(pw, th, pd); this.platGeos.push(box);
    const pm = new Mesh(box, [side, side, top, side, front, side]); pm.position.y = -th / 2; this.platform.add(pm);
    const pil = new BoxGeometry(72, 4000, 60); this.platGeos.push(pil);
    const pillMat = new MeshToonMaterial({ color: '#7a45b0', gradientMap: this.kit.gradient }); this.platMats.push(pillMat);
    this.pillar = new Mesh(pil, pillMat); this.pillar.position.y = -th - 2000; this.platform.add(this.pillar);
    this.world.add(this.platform);
  }
  resize(cw: number, ch: number, dpr: number) {
    this.renderer.setPixelRatio(Math.min(dpr, 2)); this.renderer.setSize(cw, ch, false);
    const fov = this.camera.fov * Math.PI / 180; this.D = ch / 2 / Math.tan(fov / 2);
    this.camera.aspect = cw / ch; this.camera.position.set(0, 0, this.D); this.camera.near = this.D * 0.3; this.camera.far = this.D * 3; this.camera.updateProjectionMatrix();
  }
  /** 2Dワールド→画面と同じ写像。sc=拡大率, ox,oy=画面座標でのワールド原点(px)。 */
  setView(sc: number, ox: number, oy: number, cw: number, ch: number) {
    this.world.scale.set(sc, sc, sc); this.world.position.set(ox - cw / 2, ch / 2 - oy, 0);
  }
  setPlatform(y: number, rot: number, pillar: boolean) { this.platform.position.y = -y; this.platform.rotation.z = -rot; this.pillar.visible = pillar; }
  beginFrame() { this.frame++; }
  /** id のおじさんを取得（無ければ生成）。type/skin が変わったら作り直す。 */
  uncle(id: number, type: UncleType, skin: string): Uncle3D {
    const key = type + '|' + skin; let s = this.slots.get(id);
    if (s && s.key !== key) { this.world.remove(s.o.group); s = undefined; }
    if (!s) { s = { o: new Uncle3D(this.kit, type, skin), mark: 0, key }; this.slots.set(id, s); this.world.add(s.o.group); }
    s.mark = this.frame; return s.o;
  }
  endFrame() {
    for (const [id, s] of this.slots) if (s.mark !== this.frame) { this.world.remove(s.o.group); this.slots.delete(id); }
  }
  render() { if (!this.lost) this.renderer.render(this.scene, this.camera); }
  dispose() {
    this.canvas.removeEventListener('webglcontextlost', this.onLost);
    this.slots.clear(); this.world.clear(); this.kit.dispose();
    for (const g of this.platGeos) g.dispose(); for (const m of this.platMats) m.dispose(); this.platTex.dispose();
    this.renderer.dispose(); this.renderer.forceContextLoss(); this.canvas.remove();
  }
}
