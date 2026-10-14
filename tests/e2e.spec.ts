import { test, expect, type Page } from '@playwright/test';

const play: Record<string, (p: Page) => Promise<void>> = {
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
    await page.goto('/#/play/' + id); await page.locator('#start').click();
    await page.waitForTimeout(500); await play[id](page);
    await expect(page.locator('.res')).toBeVisible({ timeout: 100_000 }); await page.mouse.up();
    await expect(page.locator('#art')).toBeVisible(); await expect(page.locator('.atitle')).not.toBeEmpty();
    // 保存データ
    const save = await page.evaluate(() => JSON.parse(localStorage.getItem('baka.save.v1')!));
    expect(save.plays[id]).toBe(1); expect(save.best[id]).toBeGreaterThanOrEqual(0);
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
  await expect(page.locator('.ov')).toContainText('挑戦状'); await expect(page.locator('.ov')).toContainText('自己申告');
  await page.locator('#mute').click(); expect(await page.evaluate(() => localStorage.getItem('baka.mute'))).toBe('1');
});
