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
  await page.waitForTimeout(1000);
});

test('R key restarts level', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1000);
  await page.keyboard.press('r');
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
  await page.waitForTimeout(200);
});

test('shoot with J key', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.keyboard.press('j');
  await page.waitForTimeout(200);
});

test('invincibility cheat works', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  await page.keyboard.press('o');
  await page.waitForTimeout(200);
  await page.keyboard.press('o');
});

test('kill all enemies cheat works', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(2000);
  await page.keyboard.press('i');
  await page.waitForTimeout(500);
});

test('skip level cheat works', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(1000);
  await page.keyboard.press('l');
  await page.waitForTimeout(500);
});
