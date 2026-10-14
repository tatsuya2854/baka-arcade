// 開始画面のループアニメ(軽量2D)。担当エージェントが実装する（スタブ）
export const demo = (g: CanvasRenderingContext2D, w: number, h: number, t: number) => { g.font = '900 64px sans-serif'; g.textAlign = 'center'; g.fillText('🪥', w / 2, h / 2 + Math.sin(t * 3) * 10); };
