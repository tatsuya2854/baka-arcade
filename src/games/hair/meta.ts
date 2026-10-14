import type { GameMeta } from '../../core/types';
export const meta: GameMeta = { id: 'hair', no: 3, title: 'ハゲを守れ！', tagline: 'タイミング防衛', desc: '最後の一本を強風から守り抜け。押さえすぎも危険。', howto: '長押しで押さえる。離すと引っ張られる', emoji: '🌬️', color: '#46c8ff', scoreUnit: '秒', bp: { base: 2, perScore: 1.2, cap: 60 }, limits: { maxPerSec: 1.05, maxScore: 600 } };
