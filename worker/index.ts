// BAKA ARCADE API: ランキング(Durable Object + SQLite) と 匿名イベント集計。
// D1 は無料枠が満杯のため使わない。スコアは「サーバー発行の一回限りセッション」＋経過時間で検証する。
import { DurableObject } from 'cloudflare:workers';

interface Env { ASSETS: Fetcher; ARCADE: DurableObjectNamespace<Arcade>; ADMIN_TOKEN?: string }

// src/games/*/meta.ts の limits と同期すること
const LIMITS: Record<string, { maxPerSec: number; maxScore: number }> = {
  stack: { maxPerSec: 1.2, maxScore: 300 }, fart: { maxPerSec: 40, maxScore: 60000 }, hair: { maxPerSec: 1.05, maxScore: 600 },
  nose: { maxPerSec: 130, maxScore: 20000 }, button: { maxPerSec: 3, maxScore: 60 },
  egg: { maxPerSec: 400, maxScore: 1000 }, toothpaste: { maxPerSec: 400, maxScore: 1000 }, usb: { maxPerSec: 400, maxScore: 1000 }, ketchup: { maxPerSec: 400, maxScore: 1000 }, tissue: { maxPerSec: 400, maxScore: 1000 },
};
const PAGES: Record<string, { title: string; command: string }> = {
  'ojisan-stack': { title: 'おじさんを積め！', command: 'おじさんを、落として積め。' }, 'fart-elevator': { title: 'おならエレベーター', command: 'タップで、空まで飛べ。' },
  'save-the-hair': { title: 'ハゲを守れ！', command: '長押しで、最後の一本を守れ。' }, 'nosehair-pull': { title: '鼻毛を抜け！', command: '長押しして、ベストで離せ。' },
  'dont-press': { title: '絶対に押すなボタン', command: '絶対に、押すな。' },
  'egg-landing': { title: '目玉焼きを落とせ', command: '卵を、フライパンの真ん中に落とせ。' }, 'toothpaste-10cm': { title: '歯磨き粉10.0cm', command: '10.0cmだけ、歯磨き粉を出せ。' },
  'usb-insert': { title: 'USBを一発で', command: 'USBを、一発で挿せ。' }, 'ketchup-pour': { title: 'ケチャップ黄金比', command: 'ケチャップを、ちょうどの量だけ出せ。' }, 'tissue-one': { title: 'ティッシュ1枚だけ', command: 'ティッシュを、1枚だけ取れ。' },
};
const SOURCES = new Set(['x', 'note', 'instagram', 'tiktok', 'youtube', 'threads']);
const EVENTS = new Set(['game_start', 'game_over', 'retry', 'game_switch', 'share_click', 'bp_earned', 'character_unlocked', 'visit', 'third_play', 'result_view', 'image_save', 'link_copy', 'challenge_create', 'challenge_visit', 'challenge_play', 'video_save']);
const MIN_PLAY_MS = 3000, SLACK_MS = 2500;
const JST = 9 * 3600e3;
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const dayStart = (now: number) => Math.floor((now + JST) / 864e5) * 864e5 - JST;
const clean = (s: unknown) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>&"'`]/g, '').trim().slice(0, 12);

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) {
      // ゲーム専用URLは、SNSのクローラ向けに OGP(タイトル/説明/画像)をゲームごとに差し替える
      const g = url.pathname.match(/^\/games\/([\w-]+)\/?$/)?.[1], info = g ? PAGES[g] : undefined;
      if (info && req.method === 'GET') {
        const base = await env.ASSETS.fetch(new Request(new URL('/', url), req)), img = `${url.origin}/og/${g}.png`, title = `${info.title}｜BAKA ARCADE`;
        return new HTMLRewriter()
          .on('title', { element(e) { e.setInnerContent(title); } })
          .on('meta[property="og:title"]', { element(e) { e.setAttribute('content', title); } })
          .on('meta[property="og:description"]', { element(e) { e.setAttribute('content', info.command); } })
          .on('meta[name="description"]', { element(e) { e.setAttribute('content', info.command); } })
          .on('meta[property="og:image"]', { element(e) { e.setAttribute('content', img); } })
          .on('head', { element(e) { e.append(`<meta property="og:url" content="${url.origin}/games/${g}"><meta name="twitter:image" content="${img}">`, { html: true }); } })
          .transform(base);
      }
      return env.ASSETS.fetch(req);
    }
    const stub = env.ARCADE.get(env.ARCADE.idFromName('main'));
    return stub.handle(req.method, url.pathname, url.search, await readBody(req), req.headers.get('cf-connecting-ip') ?? 'x', req.headers.get('authorization') ?? '', env.ADMIN_TOKEN ?? '');
  },
};
async function readBody(req: Request): Promise<unknown> {
  if (req.method !== 'POST') return null;
  const t = await req.text(); if (t.length > 8192) return null;
  try { return JSON.parse(t); } catch { return null; }
}

export class Arcade extends DurableObject<Env> {
  private sql: SqlStorage;
  constructor(state: DurableObjectState, env: Env) {
    super(state, env); this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions(sid TEXT PRIMARY KEY, game TEXT, t0 INTEGER, ipk TEXT);
      CREATE TABLE IF NOT EXISTS scores(id INTEGER PRIMARY KEY AUTOINCREMENT, game TEXT, uid TEXT, nickname TEXT, score REAL, at INTEGER);
      CREATE INDEX IF NOT EXISTS sc_g ON scores(game, at);
      CREATE TABLE IF NOT EXISTS ch(id TEXT PRIMARY KEY, game TEXT, nickname TEXT, score REAL, at INTEGER);
      CREATE TABLE IF NOT EXISTS ev(day TEXT, k TEXT, n INTEGER, PRIMARY KEY(day,k));
      CREATE TABLE IF NOT EXISTS rl(k TEXT PRIMARY KEY, n INTEGER, win INTEGER);`);
  }
  private limited(key: string, max: number, windowMs: number): boolean {
    const now = Date.now(), r = this.sql.exec('SELECT n, win FROM rl WHERE k=?', key).toArray()[0] as { n: number; win: number } | undefined;
    if (!r || now - r.win > windowMs) { this.sql.exec('INSERT OR REPLACE INTO rl VALUES(?,?,?)', key, 1, now); return false; }
    if (r.n >= max) return true; this.sql.exec('UPDATE rl SET n=n+1 WHERE k=?', key); return false;
  }
  async handle(method: string, path: string, search: string, body: any, ip: string, auth: string, adminToken: string): Promise<Response> {
    const now = Date.now(), q = new URLSearchParams(search);
    if (method === 'POST' && path === '/api/start') {
      const game = String(body?.game ?? ''); if (!LIMITS[game]) return json({ error: 'bad game' }, 400);
      if (this.limited('start:' + ip, 120, 3600e3)) return json({ error: 'rate' }, 429);
      const sid = crypto.randomUUID();
      this.sql.exec('DELETE FROM sessions WHERE t0 < ?', now - 3600e3);
      this.sql.exec('INSERT INTO sessions VALUES(?,?,?,?)', sid, game, now, ip);
      return json({ sid, sig: 'v1', t0: now });
    }
    if (method === 'POST' && path === '/api/score') {
      const b = body ?? {}, game = String(b.game ?? ''), lim = LIMITS[game];
      if (!lim) return json({ ok: false, reason: 'bad game' }, 400);
      const nickname = clean(b.nickname), uid = String(b.uid ?? '').slice(0, 64), score = Number(b.score), claimed = Number(b.durationMs);
      if (!nickname) return json({ ok: false, reason: 'nickname' });
      if (!uid || !Number.isFinite(score) || score <= 0 || !Number.isFinite(claimed)) return json({ ok: false, reason: 'invalid' });
      if (this.limited('score:' + uid, 40, 3600e3) || this.limited('scoreip:' + ip, 120, 3600e3)) return json({ ok: false, reason: 'rate' }, 429);
      const s = this.sql.exec('SELECT game, t0 FROM sessions WHERE sid=?', String(b.sid ?? '')).toArray()[0] as { game: string; t0: number } | undefined;
      if (!s || s.game !== game) return json({ ok: false, reason: 'no session' });
      this.sql.exec('DELETE FROM sessions WHERE sid=?', String(b.sid)); // 1回限り
      const elapsed = now - s.t0;
      if (elapsed < MIN_PLAY_MS || claimed > elapsed + SLACK_MS) return json({ ok: false, reason: 'time' });
      const cap = Math.min(lim.maxScore, lim.maxPerSec * (elapsed / 1000) + 8);
      if (score > cap) return json({ ok: false, reason: 'implausible' });
      this.sql.exec('INSERT INTO scores(game,uid,nickname,score,at) VALUES(?,?,?,?,?)', game, uid, nickname, Math.round(score * 10) / 10, now);
      this.sql.exec('DELETE FROM scores WHERE at < ?', now - 400 * 864e5);
      const since = dayStart(now);
      const rank = (this.sql.exec('SELECT COUNT(*) c FROM (SELECT uid, MAX(score) m FROM scores WHERE game=? AND at>=? GROUP BY uid) WHERE m > ?', game, since, score).toArray()[0] as { c: number }).c + 1;
      const cid = crypto.randomUUID().replace(/-/g, '').slice(0, 10);
      this.sql.exec('INSERT INTO ch VALUES(?,?,?,?,?)', cid, game, nickname, Math.round(score * 10) / 10, now);
      this.sql.exec('DELETE FROM ch WHERE at < ?', now - 120 * 864e5);
      return json({ ok: true, rank, cid });
    }
    if (method === 'GET' && path === '/api/challenge') {
      const c = this.sql.exec('SELECT game, nickname nick, score FROM ch WHERE id=?', (q.get('id') ?? '').slice(0, 32)).toArray()[0];
      return c ? json(c) : json({ error: 'not found' }, 404);
    }
    if (method === 'GET' && path === '/api/ranking') {
      const game = q.get('game') ?? '', period = q.get('period') ?? 'today'; if (!LIMITS[game]) return json({ error: 'bad game' }, 400);
      const since = period === 'all' ? 0 : period === 'week' ? now - 7 * 864e5 : dayStart(now);
      const rows = this.sql.exec(`SELECT nickname, MAX(score) score, MAX(at) at FROM scores WHERE game=? AND at>=? GROUP BY uid ORDER BY score DESC, at ASC LIMIT 20`, game, since).toArray();
      return json({ rows });
    }
    if (method === 'POST' && path === '/api/event') {
      if (this.limited('ev:' + ip, 300, 3600e3)) return json({ ok: false }, 429);
      const evs = Array.isArray(body?.events) ? body.events.slice(0, 20) : [], first = body?.first === true, day = new Date(now + JST).toISOString().slice(0, 10);
      for (const e of evs) {
        if (!EVENTS.has(e?.ev)) continue;
        const game = typeof e.props?.game === 'string' && LIMITS[e.props.game] ? e.props.game : '';
        const keys = [`${e.ev}|${game}`]; if (first && (e.ev === 'visit' || e.ev === 'third_play')) keys.push(`${e.ev}_new|`);
        const via = e.props?.via; if (e.ev === 'share_click' && ['x', 'line', 'web', 'image'].includes(via)) keys.push(`share_click_${via}|${game}`);
        const rare = e.props?.rare; if (e.ev === 'game_over' && game && typeof rare === 'string' && /^\w{1,20}$/.test(rare)) keys.push(`rare|${game}:${rare}`);
        const ref = e.props?.ref; if (ref === 'share' || ref === 'challenge') { keys.push(`${e.ev}@${ref}|${game}`); if (e.props?.returning === true) keys.push(`${e.ev}_returning@${ref}|`); }
        // 流入元別（SNS）・投稿別。許可リスト＋英数のみ（キー爆発とインジェクション防止）
        const src = String(e.props?.src ?? ''), ct = String(e.props?.ct ?? '');
        if (SOURCES.has(src)) { keys.push(`${e.ev}~${src}|${game}`); if (/^[\w-]{1,32}$/.test(ct)) keys.push(`${e.ev}~${src}:${ct}|${game}`); }
        for (const k of keys) this.sql.exec('INSERT INTO ev VALUES(?,?,1) ON CONFLICT(day,k) DO UPDATE SET n=n+1', day, k);
      }
      return json({ ok: true });
    }
    if (method === 'POST' && path === '/api/admin/purge') {
      if (!adminToken || auth !== 'Bearer ' + adminToken) return json({ error: 'not found' }, 404);
      const nick = clean(body?.nickname); if (!nick) return json({ error: 'nickname' }, 400);
      const n = (this.sql.exec('SELECT COUNT(*) c FROM scores WHERE nickname=?', nick).toArray()[0] as { c: number }).c;
      this.sql.exec('DELETE FROM ch WHERE nickname=?', nick); this.sql.exec('DELETE FROM scores WHERE nickname=?', nick);
      return json({ deleted: n });
    }
    if (method === 'GET' && path === '/api/percentile') { // 実記録だけで計算。母数が少ない間は null（架空の順位は出さない）
      const game = q.get('game') ?? '', score = Number(q.get('score')); if (!LIMITS[game] || !Number.isFinite(score)) return json({ error: 'bad' }, 400);
      const r = this.sql.exec('SELECT COUNT(*) n, SUM(CASE WHEN m >= ? THEN 1 ELSE 0 END) hi FROM (SELECT MAX(score) m FROM scores WHERE game=? GROUP BY uid)', score, game).toArray()[0] as { n: number; hi: number | null };
      return json({ n: r.n, top: r.n >= 20 ? Math.max(1, Math.round(((r.hi ?? 0) / r.n) * 100)) : null });
    }
    if (method === 'GET' && path === '/api/rare') { // レア出現率の実測（公開・集計値のみ）
      const game = q.get('game') ?? ''; if (!LIMITS[game]) return json({ error: 'bad game' }, 400);
      const plays = (this.sql.exec('SELECT COALESCE(SUM(n),0) c FROM ev WHERE k=?', `game_over|${game}`).toArray()[0] as { c: number }).c;
      const rares: Record<string, number> = {};
      for (const r of this.sql.exec('SELECT k, SUM(n) n FROM ev WHERE k LIKE ? GROUP BY k', `rare|${game}:%`).toArray() as { k: string; n: number }[]) rares[r.k.split(':')[1]] = r.n;
      return json({ plays, rares });
    }
    if (method === 'GET' && path === '/api/stats') {
      if (!adminToken || auth !== 'Bearer ' + adminToken) return json({ error: 'not found' }, 404);
      const rows = this.sql.exec('SELECT day,k,n FROM ev ORDER BY day DESC LIMIT 600').toArray() as { day: string; k: string; n: number }[];
      const tot: Record<string, number> = {}; for (const r of rows) tot[r.k] = (tot[r.k] ?? 0) + r.n;
      const kpi = { third_play_rate_new_visitors: (tot['visit_new|'] ?? 0) ? (tot['third_play_new|'] ?? 0) / tot['visit_new|'] : null };
      const g = (k: string) => tot[k] ?? 0, sum = (p: string) => Object.entries(tot).filter(([k]) => k.startsWith(p)).reduce((a, [, n]) => a + n, 0), div = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 1000 : null);
      // バイラルループ指標。share_click は「共有ボタン押下」であり投稿完了ではない（実際の投稿数は計測不能）
      const starts = sum('game_start|'), overs = sum('game_over|'), views = sum('result_view|'), shares = sum('share_click|');
      const viral = {
        starts, completions: overs, completion_rate: div(overs, starts), replay_rate: div(sum('retry|'), overs),
        result_views: views, share_click_rate: div(shares, views), x_share_rate: div(sum('share_click_x|'), views), line_share_rate: div(sum('share_click_line|'), views), web_share_rate: div(sum('share_click_web|'), views), image_save_rate: div(sum('image_save|'), views),
        challenge_created: sum('challenge_create|'), inflow_visits_share: g('visit@share|'), inflow_visits_challenge: sum('challenge_visit|'),
        inflow_play_rate_challenge: div(sum('game_start@challenge|'), sum('challenge_visit|')), inflow_play_rate_share: div(sum('game_start@share|'), g('visit@share|')),
        reshare_rate_from_inflow: div(sum('share_click@challenge|') + sum('share_click@share|'), sum('game_start@challenge|') + sum('game_start@share|')),
        note: 'shares=ボタン押下。SNSへの実投稿数は取得不能（推定のみ）',
      };
      // SNS別・投稿別: キー形式 `<event>~<source>[:<post>]|<game>`
      const by_source: Record<string, Record<string, number>> = {};
      for (const [k, n] of Object.entries(tot)) { const m = k.match(/^(\w+)~([\w-]+)(?::([\w-]+))?\|/); if (!m) continue; const id = m[3] ? `${m[2]}:${m[3]}` : m[2]; (by_source[id] ??= {})[m[1]] = (by_source[id][m[1]] ?? 0) + n; }
      return json({ kpi, viral, by_source, totals: tot, rows });
    }
    return json({ error: 'not found' }, 404);
  }
}
