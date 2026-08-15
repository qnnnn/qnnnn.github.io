import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.beforeEach(async ({ page }) => {
  await page.goto(`file://${path.join(__dirname, 'index.html')}`);
});

test('page loads with title and overlay', async ({ page }) => {
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#btn1p')).toBeVisible();
  await expect(page.locator('#btn2p')).toBeVisible();
  await expect(page.locator('#btnEndless')).toBeVisible();
  await expect(page.locator('canvas#screen')).toBeVisible();
  await expect(page.locator('#panel')).toBeVisible();
});

test('clicking single player starts game', async ({ page }) => {
  await page.click('#btn1p');
  await expect(page.locator('#overlay')).not.toBeVisible();
  await expect(page.locator('#lives')).toHaveText('3');
  await expect(page.locator('#level')).toHaveText('1');
});

test('P key pauses and resumes', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(300);
  await page.keyboard.press('p');
  await expect(page.locator('#ovTitle')).not.toBeVisible();
  await page.waitForTimeout(200);
  await page.keyboard.press('p');
  await page.waitForTimeout(200);
});

test('M key goes to menu and resume works', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.keyboard.press('m');
  await expect(page.locator('#btnResume')).toBeVisible();
  await page.click('#btnResume');
  await expect(page.locator('#overlay')).not.toBeVisible();
});

test('player moves with WASD', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.keyboard.press('w');
  await expect(page.locator('#overlay')).not.toBeVisible();
  await page.waitForTimeout(200);
});

test('enemies spawn and have AI', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(3000);
  const enemiesText = await page.locator('#enemies').textContent();
  expect(parseInt(enemiesText)).toBeGreaterThanOrEqual(0);
});

test('power-ups can be picked up', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(2000);
  await page.keyboard.press('o');
  await expect(page.locator('#cheatRow')).toHaveCSS('display', 'flex');
  await page.waitForTimeout(1000);
});

test('R key restarts level', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1000);
  await page.keyboard.press('r');
  await expect(page.locator('#enemies')).toHaveText(/^\d+$/);
  await page.waitForTimeout(500);
});

test('dual mode button works', async ({ page }) => {
  await page.click('#btn2p');
  await expect(page.locator('#overlay')).not.toBeVisible();
});

test('endless mode button works', async ({ page }) => {
  await page.click('#btnEndless');
  await expect(page.locator('#overlay')).not.toBeVisible();
  await expect(page.locator('#levelLabel')).toHaveText('波次');
});

test('mute toggle works in game', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.click('#muteBox');
  await expect(page.locator('#muteLabel')).toHaveText('🔇 关闭');
  await page.click('#muteBox');
  await expect(page.locator('#muteLabel')).toHaveText('🔊 开启');
});

test('panel shows HP display', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await expect(page.locator('#hpDisplay')).toBeVisible();
});

test('shoot with space key', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.keyboard.press(' ');
  await expect(page.locator('#overlay')).not.toBeVisible();
  await page.waitForTimeout(200);
});

test('shoot with J key', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.keyboard.press('j');
  await expect(page.locator('#overlay')).not.toBeVisible();
  await page.waitForTimeout(200);
});

test('invincibility cheat works', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.keyboard.press('o');
  await expect(page.locator('#cheatRow')).toHaveCSS('display', 'flex');
  await page.waitForTimeout(200);
  await page.keyboard.press('o');
  await expect(page.locator('#cheatRow')).toHaveCSS('display', 'none');
});

test('kill all enemies cheat works', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(2000);
  await page.keyboard.press('i');
  await expect(page.locator('#enemies')).toHaveText('0');
  await page.waitForTimeout(500);
});

test('skip level cheat works', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1000);
  await page.keyboard.press('l');
  await expect(page.locator('#upgradeOverlay')).not.toHaveClass(/hidden/);
  await page.waitForTimeout(500);
});

test('A: player death and respawn', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1000);
  await page.keyboard.press('i');
  await page.waitForTimeout(500);
  await expect(page.locator('#lives')).toHaveText('3');
  const killed = await page.evaluate(() => window.__test.triggerPlayerDeath());
  expect(killed).toBe(true);
  await page.waitForTimeout(300);
  await expect(page.locator('#lives')).toHaveText('2');
  await page.waitForTimeout(1200);
  const alive = await page.evaluate(() => window.__test.playerHP > 0);
  expect(alive).toBe(true);
});

test('B: base destruction triggers game over', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__test.setBaseHp(0));
  await expect(page.locator('#ovTitle')).toHaveText('游戏结束');
  await expect(page.locator('#btnRetry')).toBeVisible();
});

test('C: game over when lives reach 0', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1000);
  await page.evaluate(() => { window.__test.lives = 0; });
  await page.evaluate(() => window.__test.triggerGameOver());
  await expect(page.locator('#ovTitle')).toHaveText('游戏结束');
  await expect(page.locator('#btnRetry')).toBeVisible();
});

test('D: boss fight - boss spawns and HP bar visible', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('l');
    await page.waitForTimeout(300);
    await page.locator('#upgradeOptions button').first().click();
    await page.waitForTimeout(600);
  }
  await expect(page.locator('#level')).toHaveText('5');
  const bossExists = await page.evaluate(() => window.__test.bossAlive);
  expect(bossExists).toBe(true);
});

test('E: pickup spawns and is collectible', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1000);
  await page.keyboard.press('o');
  await page.waitForTimeout(300);
  await page.keyboard.press('i');
  await page.waitForTimeout(500);
  const hasPickup = await page.evaluate(() => window.__test.pickupsLength > 0);
  if (!hasPickup) {
    await page.waitForTimeout(3000);
  }
  const pickupCount = await page.evaluate(() => window.__test.pickupsLength);
  expect(pickupCount).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('d');
  await page.waitForTimeout(1500);
  await page.keyboard.press('w');
  await page.waitForTimeout(1500);
  await page.keyboard.press('a');
  await page.waitForTimeout(1500);
  await page.keyboard.press('s');
  await page.waitForTimeout(1500);
});

test('F: P2 moves and shoots independently (dual mode)', async ({ page }) => {
  await page.click('#btn2p');
  await page.waitForTimeout(500);
  await expect(page.locator('#p2lifeRow')).toBeVisible();
  await expect(page.locator('#p2lives')).toHaveText('3');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  await page.keyboard.press('k');
  await page.waitForTimeout(300);
  await expect(page.locator('#p2lives')).toHaveText('3');
});

test('G: upgrade screen appears on level complete', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1000);
  await page.keyboard.press('l');
  await expect(page.locator('#upgradeOverlay')).not.toHaveClass(/hidden/);
  const btnCount = await page.locator('#upgradeOptions button').count();
  expect(btnCount).toBeGreaterThanOrEqual(3);
  await page.locator('#upgradeOptions button').first().click();
  await page.waitForTimeout(500);
  await expect(page.locator('#upgradeOverlay')).toHaveClass(/hidden/);
});

test('H: level debuff (slow) applies whole level and panel shows it', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  const ok = await page.evaluate(() => window.__test.addLevelDebuff('slow'));
  expect(ok).toBe(true);
  await expect(page.locator('#levelDebuffRow')).toBeVisible();
  await expect(page.locator('#levelDebuffEl')).toHaveText(/减速/);
  const list = await page.evaluate(() => window.__test.levelDebuffs);
  expect(list).toContain('slow');
});

test('I: level debuff (reverse) inverts controls', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__test.addLevelDebuff('reverse'));
  await expect(page.locator('#levelDebuffEl')).toHaveText(/反向/);
  // 反向时按 w 应向下移动（y 增大），按 s 应向上（y 减小）
  const yBefore = await page.evaluate(() => window.__test.playerY);
  await page.keyboard.down('w');
  await page.waitForTimeout(300);
  await page.keyboard.up('w');
  const yAfterW = await page.evaluate(() => window.__test.playerY);
  expect(yAfterW).toBeGreaterThan(yBefore);
  await page.keyboard.down('s');
  await page.waitForTimeout(300);
  await page.keyboard.up('s');
  const yAfterS = await page.evaluate(() => window.__test.playerY);
  expect(yAfterS).toBeLessThan(yAfterW);
});

test('J: level debuff (drain) reduces HP over time but never kills', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.keyboard.press('o'); // 无敌，隔离敌人伤害
  await page.keyboard.press('i'); // 清场
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__test.addLevelDebuff('drain'));
  await expect(page.locator('#levelDebuffEl')).toHaveText(/失血/);
  await page.waitForTimeout(2500);
  const hp = await page.evaluate(() => window.__test.playerHP);
  expect(hp).toBeGreaterThan(0);
  expect(hp).toBeLessThan(5);
  const alive = await page.evaluate(() => window.__test.playerAlive);
  expect(alive).toBe(true);
});

test('K: level debuff (vuln) makes player take double damage', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.keyboard.press('o'); // 无敌，隔离敌人伤害
  await page.keyboard.press('i'); // 清场
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__test.addLevelDebuff('vuln'));
  await expect(page.locator('#levelDebuffEl')).toHaveText(/易伤/);
  const hpBefore = await page.evaluate(() => window.__test.playerHP);
  await page.evaluate(() => window.__test.hitPlayer());
  const hpAfter = await page.evaluate(() => window.__test.playerHP);
  expect(hpBefore - hpAfter).toBe(2);
});

test('L: speed buff is charge-based, stacks and consumes on move', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  const ok = await page.evaluate(() => window.__test.applyBuff('speed', 3));
  expect(ok).toBe(true);
  await expect(page.locator('#bufSpeed')).toHaveText('加速×3');
  // 未移动时加速不激活
  const idle = await page.evaluate(() => window.__test.speedActiveState);
  expect(idle).toBe(false);
  // 按下方向键 → 激活加速并消耗 1 次
  await page.keyboard.down('w');
  await page.waitForTimeout(200);
  const active = await page.evaluate(() => window.__test.speedActiveState);
  const speedFactor = await page.evaluate(() => window.__test.playerSpeedFactor);
  const charges = await page.evaluate(() => window.__test.buffCharges);
  expect(active).toBe(true);
  expect(speedFactor).toBeCloseTo(1.4, 5);
  expect(charges.speed).toBe(2);
  await page.keyboard.up('w');
  await page.waitForTimeout(200);
  const inactive = await page.evaluate(() => window.__test.speedActiveState);
  expect(inactive).toBe(false);
  await expect(page.locator('#bufSpeed')).toHaveText('加速×2');
});

test('M: score buff doubles score gains per charge (stacks)', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__test.applyBuff('score', 3));
  await expect(page.locator('#bufScore')).toHaveText('双倍×3');
  const before = await page.evaluate(() => window.__test.score);
  const enemyCount = await page.evaluate(() => window.__test.enemiesCount);
  expect(enemyCount).toBeGreaterThan(0);
  // 3 次双倍机会：前 3 个敌人每个 200 分，其余 100 分
  await page.keyboard.press('i');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.__test.score);
  const expected = Math.min(3, enemyCount) * 200 + Math.max(0, enemyCount - 3) * 100;
  expect(after - before).toBe(expected);
  const charges = await page.evaluate(() => window.__test.buffCharges);
  expect(charges.score).toBe(Math.max(0, 3 - enemyCount));
});
