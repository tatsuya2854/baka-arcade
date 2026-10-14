// 「絶対に押すな」の3D描画（Three.js）。Stage3D(おじさん/カメラ/ライト)の world に、台座+赤ドームを載せる。
// 重ね順: 背景2D → three → 前景2D。WebGL失敗時は throw → 呼び出し側が2Dにフォールバック。
import {
  Color, CylinderGeometry, Group, InstancedMesh, Material, Matrix4, Mesh, MeshPhongMaterial, Object3D, SphereGeometry, BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Stage3D } from '../../core/uncle3d';
import type { Expr } from '../../core/characters';
import type { R3 } from './events';

const MAX_MINI = 64, MAX_UNCLE = 4, TILT = 1.05;

function domeGeo(): BufferGeometry {
  const hemi = new SphereGeometry(0.98, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2); hemi.scale(1, 0.62, 1); hemi.translate(0, 0.2, 0);
  const collar = new CylinderGeometry(0.98, 0.98, 0.2, 28, 1, true); collar.translate(0, 0.1, 0);
  const g = mergeGeometries([hemi.toNonIndexed(), collar.toNonIndexed()])!; hemi.dispose(); collar.dispose(); return g;
}

export class View3D implements R3 {
  readonly stage: Stage3D;
  private world: Group;
  private geos: BufferGeometry[] = []; private mats: Material[] = [];
  private root = new Group(); private squash = new Group(); private tilt = new Group(); private art = new Group(); private dome: Mesh; private plate: Mesh; private well: Mesh;
  private domeMat: MeshPhongMaterial; private plateMat: MeshPhongMaterial; private wellMat: MeshPhongMaterial;
  private miniDome: InstancedMesh; private miniBase: InstancedMesh;
  private nMini = 0; private nUncle = 0; private alphaOn = false;
  private cw = 390; private ch = 844;
  private tmp = new Object3D(); private col = new Color(); private mtx = new Matrix4();
  lost = false;

  constructor(onLost: () => void) {
    this.stage = new Stage3D(() => { this.lost = true; onLost(); });
    this.world = (this.stage as unknown as { world: Group }).world;
    this.stage.setPlatform(-1e6, 0, false); // おじさん用ステージの土台は使わない
    const dg = domeGeo(), pg = new CylinderGeometry(1.22, 1.3, 0.3, 36), wg = new CylinderGeometry(1.04, 1.04, 0.02, 32), bg = new CylinderGeometry(1.0, 1.04, 0.16, 20);
    this.geos.push(dg, pg, wg, bg);
    this.domeMat = new MeshPhongMaterial({ color: 0xff2a2a, shininess: 110, specular: 0xffffff });
    this.plateMat = new MeshPhongMaterial({ color: 0x8a909c, shininess: 60, specular: 0x9999aa });
    this.wellMat = new MeshPhongMaterial({ color: 0x14161a, shininess: 5 });
    this.mats.push(this.domeMat, this.plateMat, this.wellMat);
    this.plate = new Mesh(pg, this.plateMat); this.plate.position.y = 0; this.well = new Mesh(wg, this.wellMat); this.well.position.y = 0.16;
    this.dome = new Mesh(dg, this.domeMat); this.dome.position.y = 0.17;
    this.art.add(this.plate, this.well, this.dome); this.art.position.y = -0.3;
    this.tilt.rotation.x = TILT; this.tilt.add(this.art); this.squash.add(this.tilt); this.root.add(this.squash); this.root.rotation.order = 'ZXY';
    this.world.add(this.root);
    // 増殖ボタン用 InstancedMesh
    const miniMat = new MeshPhongMaterial({ color: 0xffffff, shininess: 110, specular: 0xffffff }), baseMat = new MeshPhongMaterial({ color: 0x4a1010, shininess: 10 });
    this.mats.push(miniMat, baseMat);
    this.miniDome = new InstancedMesh(dg, miniMat, MAX_MINI); this.miniBase = new InstancedMesh(bg, baseMat, MAX_MINI);
    this.miniBase.position.y = 0;
    for (const im of [this.miniDome, this.miniBase]) { im.frustumCulled = false; im.count = 0; this.world.add(im); }
    this.col.setRGB(1, 1, 1); for (let i = 0; i < MAX_MINI; i++) this.miniDome.setColorAt(i, this.col);
    this.stage.canvas.dataset.view = 'button3d';
  }
  get canvas() { return this.stage.canvas; }
  resize(cw: number, ch: number, dpr: number) { this.cw = cw; this.ch = ch; this.stage.resize(cw, ch, dpr); this.stage.setView(1, cw / 2, ch / 2, cw, ch); }

  beginFrame(shakeX: number, shakeY: number, rot: number) {
    this.stage.beginFrame(); this.nMini = 0; this.nUncle = 0;
    this.world.position.set(shakeX, -shakeY, 0); this.world.rotation.z = -rot;
  }
  /** メインボタン。press: 0..1（押し込み）。 */
  main(x: number, y: number, r: number, sx: number, sy: number, rot: number, hue: number, alpha: number, press: number, visible: boolean) {
    this.root.visible = visible; if (!visible) return;
    this.root.position.set(x - this.cw / 2, this.ch / 2 - y, 0); this.root.rotation.z = -rot;
    const p3 = Math.max(0, Math.min(1, press)), depth = 0.3 * p3 * Math.cos((1 - p3) * 6);
    this.squash.scale.set(sx, sy * (1 - 0.05 * p3), (sx + sy) / 2);
    this.tilt.scale.setScalar(r); this.dome.position.y = 0.17 - depth;
    this.domeMat.color.setHSL(hue / 360, 0.9, 0.5);
    const on = alpha < 0.999; if (on !== this.alphaOn) { this.alphaOn = on; for (const m of [this.domeMat, this.plateMat, this.wellMat]) { m.transparent = on; m.needsUpdate = true; } }
    if (on) { const a = Math.max(0, alpha); this.domeMat.opacity = a; this.plateMat.opacity = a; this.wellMat.opacity = a; }
  }
  btn(x: number, y: number, r: number, rot: number, hue: number) {
    if (this.nMini >= MAX_MINI) return; const i = this.nMini++, t = this.tmp;
    t.rotation.order = 'ZXY'; t.rotation.set(TILT, 0, -rot); t.position.set(x - this.cw / 2, this.ch / 2 - y - r * 0.15, 0); t.scale.setScalar(r); t.updateMatrix();
    this.miniDome.setMatrixAt(i, t.matrix); this.miniBase.setMatrixAt(i, t.matrix);
    this.col.setHSL(hue / 360, 0.9, 0.5); this.miniDome.setColorAt(i, this.col);
  }
  uncle(x: number, y: number, h: number, expr: Expr, flail: number, flip: boolean, rot: number) {
    if (this.nUncle >= MAX_UNCLE) return; const id = -100 - this.nUncle++;
    const o = this.stage.uncle(id, 'normal', 'skin_normal');
    o.pose(this.stage.kit, expr, flail, performance.now() / 1000, id);
    o.place(x - this.cw / 2, this.ch / 2 - y, 0, rot, h, 0, flip ? -0.5 : 0.5);
  }
  render() {
    const n = this.nMini; this.miniDome.count = n; this.miniBase.count = n;
    this.miniDome.instanceMatrix.needsUpdate = true; this.miniBase.instanceMatrix.needsUpdate = true;
    if (this.miniDome.instanceColor) this.miniDome.instanceColor.needsUpdate = true;
    this.stage.endFrame(); this.stage.render();
  }
  dispose() {
    this.world.remove(this.root, this.miniDome, this.miniBase);
    this.miniDome.dispose(); this.miniBase.dispose();
    for (const g of this.geos) g.dispose(); for (const m of this.mats) m.dispose();
    this.stage.dispose();
  }
}
