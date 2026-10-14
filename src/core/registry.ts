import type { GameModule } from './types';
// 新ゲーム追加: src/games/<id>/index.ts を作り、ここに1行足すだけ。
export const GAME_LOADERS: Record<string, () => Promise<GameModule>> = {
  stack: () => import('../games/stack').then(m => m.default),
  fart: () => import('../games/fart').then(m => m.default),
  hair: () => import('../games/hair').then(m => m.default),
  nose: () => import('../games/nose').then(m => m.default),
  button: () => import('../games/button').then(m => m.default),
};
/** 一覧表示用メタ（ゲーム本体は遅延ロード）。各ゲームの meta.ts を参照 */
import { meta as stack } from '../games/stack/meta';
import { meta as fart } from '../games/fart/meta';
import { meta as hair } from '../games/hair/meta';
import { meta as nose } from '../games/nose/meta';
import { meta as button } from '../games/button/meta';
export const ALL_META = [stack, fart, hair, nose, button];

export const bySlug = (s: string) => ALL_META.find(m => m.slug === s || m.id === s);
export const gamePath = (id: string) => `/games/${ALL_META.find(m => m.id === id)?.slug ?? id}`;
