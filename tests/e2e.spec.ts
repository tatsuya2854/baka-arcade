import { test, expect, type Page } from '@playwright/test';

const SLUG: Record<string, string> = { stack: 'ojisan-stack', fart: 'fart-elevator', hair: 'save-the-hair', nose: 'nosehair-pull', button: 'dont-press', egg: 'egg-landing', toothpaste: 'toothpaste-10cm', usb: 'usb-insert', ketchup: 'ketchup-pour', tissue: 'tissue-one' };
const play: Record<string, (p: Page) => Promise<void>> = {
  egg: async p => { for (let i = 0; i < 6 && !(await p.locator('.res').count()); i++) { await p.waitForTimeout(1100); await p.mouse.click(195, 420); await p.waitForTimeout(2200); } },
  toothpaste: async p => { for (let i = 0; i < 6 && !(await p.locator('.res').count()); i++) { await p.mouse.move(195, 500); await p.mouse.down(); await p.waitForTimeout(2000); await p.mouse.up(); await p.waitForTimeout(3500); } },
  usb: async p => { for (let i = 0; i < 30 && !(await p.locator('.res').count()); i++) { await p.mouse.move(120 + (i % 5) * 40, 600); await p.mouse.down(); await p.mouse.move(150, 470, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(900); } },
  ketchup: async p => { await p.mouse.move(195, 400); await p.mouse.down(); await p.waitForTimeout(1500); await p.mouse.up(); },
  tissue: async p => { await p.mouse.move(195, 520); await p.mouse.down(); await p.mouse.move(195, 300, { steps: 14 }); await p.mouse.up(); },
  stack: async p => { for (let i = 0; i < 40 && !(await p.locator('.res').count()); i++) { await p.mouse.click(195, 400); await p.waitForTimeout(700); } },
  fart: async p => { await p.mouse.click(195, 400); },
  hair: async p => { await p.mouse.move(195, 420); await p.mouse.down(); },
  nose: async p => { for (let i = 0; i < 30 && !(await p.locator('.res').count()); i++) { await p.mouse.move(195, 420); await p.mouse.down(); await p.waitForTimeout(60); await p.mouse.up(); await p.waitForTimeout(900); } },
  button: async p => { for (let i = 0; i < 400 && !(await p.locator('.res').count()); i++) { const v = p.viewportSize()!; await p.mouse.click(v.width / 2, v.height / 2); await p.waitForTimeout(190); } },
};

test('home renders with all games and no console errors', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto('/'); await expect(page.locator('h1')).toContainText('BAKA');
  expect(await page.locator('[data-play]').count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('#rank')).toContainText(/記録|接続|自己ベスト/);
  expect(errs.filter(e => !/favicon|404/.test(e))).toEqual([]);
});

for (const id of Object.keys(play)) {
  test(`play ${id}: start → gameover → result art → retry`, async ({ page }) => {
    const errs: string[] = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto('/games/' + SLUG[id]); await page.locator('#start').click();
    await page.waitForTimeout(500); await play[id](page);
    await expect(page.locator('.res')).toBeVisible({ timeout: 100_000 }); await page.mouse.up();
    await expect(page.locator('#art')).toBeVisible(); await expect(page.locator('.atitle')).not.toBeEmpty();
    // 保存データ
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('baka.save.v1')!));
    expect(save.plays[id]).toBe(1); expect(save.best[id]).toBeGreaterThanOrEqual(0);
    await page.locator('summary').click(); // 他の共有方法を開く
    await expect(page.locator('#sp')).toBeVisible(); await expect(page.locator('.rankb')).toBeVisible();
    // 画像保存
    await page.waitForTimeout(800);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#si').click()]);
    expect((await dl.suggestedFilename())).toMatch(/\.png$/);
    // 挑戦リンク(自己申告) → コピー文言
    await page.locator('#sc').click(); await expect(page.locator('#smsg')).toContainText(/挑戦状|http|コピー/);
    // ニックネーム→ランキング
    await page.locator('#ni').fill('テスター'); await page.locator('#nb').click();
    await expect(page.locator('#nickbox')).toContainText(/ランキング|オンライン|未登録/, { timeout: 8000 });
    // 再挑戦
    await page.locator('#retry').click(); await expect(page.locator('.res')).toHaveCount(0);
    expect(errs).toEqual([]);
  });
}

test('mute persists and challenge url opens game with banner', async ({ page }) => {
  await page.goto('/#/c/g/stack/23/%E3%83%86%E3%82%B9%E3%83%88');
  await expect(page.locator('.start')).toContainText('挑戦状'); await expect(page.locator('.start')).toContainText('自己申告');
  await page.locator('#mute').click(); expect(await page.evaluate(() => localStorage.getItem('baka.mute'))).toBe('1');
});

test('direct game URL shows start screen immediately (no portal), OGP is per-game', async ({ page, request }) => {
  await page.goto('/games/ojisan-stack');
  await expect(page.locator('.cmd')).toHaveText('おじさんを、落として積め。'); await expect(page.locator('#start')).toBeVisible();
  await expect(page.locator('.hub')).toHaveCount(0); await expect(page.locator('.keyimg')).toBeVisible();
  const html = await (await request.get('/games/dont-press')).text();
  expect(html).toContain('og/dont-press.png'); expect(html).toContain('絶対に押すなボタン｜BAKA ARCADE');
  await page.locator('#start').click(); await expect(page.locator('#groot canvas').first()).toBeVisible();
  await page.goto('/'); await expect(page.locator('a.card[href="/games/fart-elevator"]').first()).toBeVisible();
});
