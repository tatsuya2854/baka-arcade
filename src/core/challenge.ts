// 挑戦URL。サーバー検証済み(#/c/v/<id>)と自己申告(#/c/g/<game>/<score>/<nick>)を区別する。
export interface Challenge { game: string; score: number; nick: string; verified: boolean; text?: string }
export function selfUrl(game: string, score: number, nick: string) { return `${location.origin}/?r=c#/c/g/${game}/${score}/${encodeURIComponent(nick.slice(0, 12) || '名無し')}`; }
export function verifiedUrl(id: string) { return `${location.origin}/?r=c#/c/v/${id}`; }
export async function parse(hash: string): Promise<Challenge | null> {
  let m = hash.match(/^#\/c\/g\/(\w+)\/([\d.]+)\/([^/]*)/);
  if (m) { const score = Number(m[2]); if (!Number.isFinite(score)) return null; return { game: m[1], score, nick: decodeURIComponent(m[3]).slice(0, 12), verified: false }; }
  m = hash.match(/^#\/c\/v\/([\w-]+)/);
  if (m) { try { const r = await fetch('/api/challenge?id=' + m[1]); if (!r.ok) return null; const j = (await r.json()) as Challenge; return { ...j, verified: true }; } catch { return null; } }
  return null;
}
