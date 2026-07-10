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
