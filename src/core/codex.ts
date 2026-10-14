// レア結果図鑑。発見はローカル保存（storage.extra.codex）。未発見はヒントのみ表示。
import { load, mutate } from './storage';
import type { GameMeta } from './types';
export function discovered(): Record<string, number> { return ((load().extra.codex as Record<string, number>) ?? {}); }
export function register(meta: GameMeta, rareId?: string): { isNew: boolean; name?: string } {
  if (!rareId) return { isNew: false };
  const def = meta.rares.find(r => r.id === rareId); if (!def) return { isNew: false };
  const key = `${meta.id}:${rareId}`, d = discovered(), isNew = !d[key];
  mutate(s => { s.extra.codex = { ...d, [key]: (d[key] ?? 0) + 1 }; });
  return { isNew, name: def.name };
}
