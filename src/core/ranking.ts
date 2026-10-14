// オンラインランキングのクライアント。サーバー未接続なら null を返し、架空データは出さない。
import { load } from './storage';
export type Period = 'today' | 'week' | 'all';
export interface RankRow { nickname: string; score: number; at: number }
export interface Session { sid: string; sig: string; t0: number }
let session: Session | null = null;

export async function beginSession(game: string): Promise<void> {
  session = null;
  try {
    const r = await fetch('/api/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ game }) });
    if (r.ok) session = (await r.json()) as Session;
  } catch { /* オフライン */ }
}
export async function submitScore(game: string, score: number, durationMs: number): Promise<{ ok: boolean; rank?: number; reason?: string }> {
  const s = load();
  if (!session || !s.nickname) return { ok: false, reason: !s.nickname ? 'nickname' : 'offline' };
  try {
    const r = await fetch('/api/score', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ game, score, durationMs, nickname: s.nickname, uid: s.uid, ...session }) });
    session = null;
    return (await r.json()) as { ok: boolean; rank?: number; reason?: string };
  } catch { return { ok: false, reason: 'offline' }; }
}
export async function fetchRanking(game: string, period: Period): Promise<RankRow[] | null> {
  try { const r = await fetch(`/api/ranking?game=${game}&period=${period}`); if (!r.ok) return null; return ((await r.json()) as { rows: RankRow[] }).rows; } catch { return null; }
}
