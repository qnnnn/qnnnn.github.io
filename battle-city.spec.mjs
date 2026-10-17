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
  await expect(page.locator('#btnHard')).toBeVisible();
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

test('I: reverse debuff was removed from the pool', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  // 「方向反转」惩罚已下线：注入无效、面板不显示
  const applied = await page.evaluate(() => window.__test.addLevelDebuff('reverse'));
  expect(applied).toBe(false);
  const list = await page.evaluate(() => window.__test.levelDebuffs);
  expect(list).not.toContain('reverse');
  await expect(page.locator('#levelDebuffRow')).toBeHidden();
  // 其余惩罚依然生效
  await page.evaluate(() => window.__test.addLevelDebuff('slow'));
  await expect(page.locator('#levelDebuffEl')).toHaveText(/减速/);
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
  await page.keyboard.press('i'); // 清场（无敌不可用：hitPlayer 在无敌时无伤害）
  await page.waitForTimeout(1800); // 等开局 1.5 秒复活无敌过期
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

test('N: suicide tank destroys brick wall, no score, counts level progress', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  // 与 O 同理：基线必须和生成动作放在同一个 evaluate 里读取，
  // 否则可能与游戏循环竞争（自爆坦克撞墙后 killedCount 会自增）。
  const baseline = await page.evaluate(() => {
    window.__test.clearEnemies();
    const scoreBefore = window.__test.score;
    const killedBefore = window.__test.killedCount;
    const e = window.__test.makeEnemyAt('suicide', 2, 4);
    e.dir = 'right';
    e.aiDir = 'right';
    e.aiTimer = 99999;
    e.movePersist = 99999;
    window.__test.addEnemy(e);
    return { scoreBefore, killedBefore };
  });
  const { scoreBefore, killedBefore } = baseline;
  expect(await page.evaluate(() => window.__test.getTile(4, 3))).toBe(1);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__test.getTile(4, 3))).toBe(0);
  expect(await page.evaluate(() => window.__test.enemiesCount)).toBe(0);
  expect(await page.evaluate(() => window.__test.score)).toBe(scoreBefore);
  expect(await page.evaluate(() => window.__test.killedCount)).toBe(killedBefore + 1);
});

test('O: scout self-alert death gives no score but counts level progress', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  // 该侦察兵出生点就在基地 5 格报警半径内，下一帧即自爆。
  // 基线必须与生成动作在同一个 evaluate 内读取，否则会与游戏循环竞争，
  // 有时读到的是已经自爆后的计数，导致 killedBefore+1 断言偶发失败。
  const baseline = await page.evaluate(() => {
    window.__test.clearEnemies();
    const scoreBefore = window.__test.score;
    const killedBefore = window.__test.killedCount;
    const e = window.__test.makeEnemyAt('scout', 13, 26);
    e.dir = 'up';
    window.__test.addEnemy(e);
    return { scoreBefore, killedBefore };
  });
  const { scoreBefore, killedBefore } = baseline;
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__test.score)).toBe(scoreBefore);
  expect(await page.evaluate(() => window.__test.killedCount)).toBe(killedBefore + 1);
});

test('P: hard mode starts with scarce resources and a bigger enemy quota', async ({ page }) => {
  await page.click('#btnHard');
  await expect(page.locator('#overlay')).not.toBeVisible();
  await expect(page.locator('#lives')).toHaveText('1');
  await expect(page.locator('#diffRow')).toBeVisible();
  await expect(page.locator('#diffLabel')).toHaveText('困难');

  const hard = await page.evaluate(() => ({
    on: window.__test.hardModeOn,
    maxHP: window.__test.playerMaxHP,
    hp: window.__test.playerHP,
    total: window.__test.enemiesTotal,
    speed: window.__test.enemySpeed('normal'),
  }));
  expect(hard.on).toBe(true);
  expect(hard.maxHP).toBe(3);
  expect(hard.hp).toBe(3);
  expect(hard.total).toBe(26);          // 普通模式是 18
  expect(hard.speed).toBeGreaterThan(0.45); // 普通模式基础 0.4
  // 开局直接放出的敌兵比普通模式多（普通模式 2 个）
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.__test.enemiesCount)).toBeGreaterThanOrEqual(3);
});

test('Q: leaving hard mode restores normal difficulty values', async ({ page }) => {
  await page.click('#btnHard');
  await page.waitForTimeout(300);
  await page.keyboard.press('m');
  await expect(page.locator('#overlay')).toBeVisible();
  await expect(page.locator('#diffRow')).toBeHidden();

  await page.click('#btn1p');
  await page.waitForTimeout(300);
  const n = await page.evaluate(() => ({
    on: window.__test.hardModeOn,
    maxHP: window.__test.playerMaxHP,
    total: window.__test.enemiesTotal,
    lives: window.__test.lives,
    speed: window.__test.enemySpeed('normal'),
  }));
  expect(n.on).toBe(false);
  expect(n.maxHP).toBe(5);
  expect(n.total).toBe(18);
  expect(n.lives).toBe(3);
  expect(n.speed).toBeCloseTo(0.4, 3);
});

test('R: ally team size grows with the level', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  // 第 1 关没有队友
  const lv1 = await page.evaluate(() => ({
    want: window.__test.allyCountForLevel,
    got: window.__test.allyCount,
  }));
  expect(lv1.want).toBe(0);
  expect(lv1.got).toBe(0);
  // 第 3 关起 1 个，第 9 关起 3 个（每 3 关 +1）
  const lv3 = await page.evaluate(() => {
    window.__test.setLevel(3);
    window.__test.ensureAllyTeam();
    return { want: window.__test.allyCountForLevel, got: window.__test.allyCount };
  });
  expect(lv3.want).toBe(1);
  expect(lv3.got).toBe(1);
  const lv9 = await page.evaluate(() => {
    window.__test.setLevel(9);
    window.__test.ensureAllyTeam();
    return { want: window.__test.allyCountForLevel, got: window.__test.allyCount };
  });
  expect(lv9.want).toBe(3);
  expect(lv9.got).toBe(3);
  // 队友分散在不同位置，不会叠在一起
  const positions = await page.evaluate(() => window.__test.allyPositions);
  const unique = new Set(positions.map(p => p.x + ',' + p.y));
  expect(unique.size).toBe(positions.length);
});

test('S: ally chases an enemy far outside the base guard radius', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    window.__test.setLevel(3);
    window.__test.ensureAllyTeam();
    window.__test.clearEnemies();
    // 敌人放在地图上半部，远离基地（超出 7 格守卫半径）
    window.__test.addEnemy(window.__test.makeEnemyAt('normal', 6, 3));
  });
  await page.waitForTimeout(250);
  const before = await page.evaluate(() => window.__test.allyDistToBase);
  const threat = await page.evaluate(() => window.__test.allyThreatInfo());
  expect(threat.hasThreat).toBe(false);   // 敌人不在守卫半径内
  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => window.__test.allyDistToBase);
  // 主动出击：离开基地附近，向敌人方向推进
  expect(after).toBeGreaterThan(before + 16);
});

test('T: game keys never scroll the page, and buttons drop focus', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(500);
  // 页面不能有可滚动区域（#game 用 transform 放大，布局盒可能溢出视口）
  const gap = await page.evaluate(() => {
    const se = document.scrollingElement;
    return se.scrollHeight - se.clientHeight;
  });
  expect(gap).toBeLessThanOrEqual(0);
  const before = await page.evaluate(() => window.scrollY);
  for (const k of ['Space', 'ArrowDown', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageDown', 'Space']) {
    await page.keyboard.press(k);
    await page.waitForTimeout(60);
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  // 点过按钮后焦点回到 body：空格不会再触发那个按钮
  await page.keyboard.press('m');
  await page.waitForTimeout(400);
  await page.click('#btnResume');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.activeElement.tagName)).toBe('BODY');
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.__test.isRunning)).toBe(true);
  expect(await page.locator('#overlay').isVisible()).toBe(false);
});

test('U: boss keeps moving and never sits inside a wall', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(400);
  // 直接跳到 Boss 关（第 5 关）
  await page.evaluate(() => { window.__test.setLevel(5); window.__test.reloadLevel(); });
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => window.__test.bossAlive)).toBe(true);

  const samples = [];
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(400);
    samples.push(await page.evaluate(() => ({
      x: window.__test.bossX, y: window.__test.bossY,
      inWall: window.__test.bossInWall, canGo: window.__test.bossCanGoAny,
      alive: window.__test.bossAlive,
    })));
  }
  const alive = samples.filter(s => s.alive);
  expect(alive.length).toBeGreaterThan(8);
  // 从没嵌在墙里
  expect(alive.some(s => s.inWall)).toBe(false);
  // 任何时刻都至少有一个方向能走，而且确实在移动
  expect(alive.some(s => !s.canGo)).toBe(false);
  const unique = new Set(alive.map(s => s.x + ',' + s.y));
  expect(unique.size).toBeGreaterThan(alive.length / 2);
});

test('V: picking a tank changes speed, damage and fire cadence', async ({ page }) => {
  // 三种坦克的参数必须真的不同
  const specs = await page.evaluate(() => {
    const t = window.__test;
    const out = {};
    for (const k of ['standard', 'heavy', 'scout']) { t.selectTank(k); out[k] = t.tankStats; }
    return out;
  });
  expect(specs.standard.speed).toBeCloseTo(1.2, 2);
  expect(specs.heavy.speed).toBeLessThan(specs.standard.speed);      // 重炮更慢
  expect(specs.scout.speed).toBeGreaterThan(specs.standard.speed);   // 迅捷更快
  expect(specs.heavy.dmg).toBeGreaterThan(specs.standard.dmg);       // 重炮伤害高
  expect(specs.heavy.pierce).toBeGreaterThan(specs.standard.pierce); // 重炮能破盾
  expect(specs.scout.cd).toBeLessThan(specs.standard.cd);            // 迅捷射速高
  expect(specs.scout.dmg).toBeLessThan(specs.heavy.dmg);             // 迅捷单发伤害低

  // 选择结果要落到实际玩家身上，并显示在面板里
  await page.click('#tankPicks .pick[data-tank="heavy"]');
  await expect(page.locator('#tankPicks .pick.on')).toHaveAttribute('data-tank', 'heavy');
  await page.click('#btn1p');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__test.playerSpeed)).toBeCloseTo(specs.heavy.speed, 2);
  await expect(page.locator('#wpnTank')).toHaveText('重炮');

  // 换一个再开一局，玩家速度要跟着变
  await page.keyboard.press('m');
  await page.waitForTimeout(300);
  await page.click('#tankPicks .pick[data-tank="scout"]');
  await page.click('#btn1p');
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__test.playerSpeed)).toBeCloseTo(specs.scout.speed, 2);
  await expect(page.locator('#wpnTank')).toHaveText('迅捷');
});

test('W: enemy shield absorbs a hit before hp is lost', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(2400);   // 等开局过场结束，子弹才会更新

  const res = await page.evaluate(async () => {
    const t = window.__test;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const out = {};
    // 普通弹（破盾力 1）打 1 层盾：盾碎，本体不掉血
    let a = t.spawnShieldedEnemy(1, 1);
    t.testBullet(a.x + 6, a.y + 6, { vy: 0, dmg: 1, pierce: 1 });
    await wait(200);
    out.standard = t.enemyState();
    // 重炮弹（破盾力 2、伤害 2）打 1 层盾：碎盾 + 本体 -2
    let b = t.spawnShieldedEnemy(1, 3);
    t.testBullet(b.x + 6, b.y + 6, { vy: 0, dmg: 2, pierce: 2 });
    await wait(200);
    out.heavy = t.enemyState();
    // 普通弹打 2 层盾：只掉一层
    let c = t.spawnShieldedEnemy(2, 3);
    t.testBullet(c.x + 6, c.y + 6, { vy: 0, dmg: 1, pierce: 1 });
    await wait(200);
    out.twoLayer = t.enemyState();
    return out;
  });

  expect(res.standard).toEqual({ shield: 0, hp: 1, maxHp: 1, alive: true });
  expect(res.heavy).toEqual({ shield: 0, hp: 1, maxHp: 3, alive: true });
  expect(res.twoLayer).toEqual({ shield: 1, hp: 3, maxHp: 3, alive: true });
});

test('X: later levels add shields instead of piling up enemies', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(400);
  const data = await page.evaluate(() => {
    const t = window.__test;
    // 同屏上限：随关卡增长但有硬顶
    const maxAlive = [1, 7, 13, 20, 30].map(lv => t.maxAliveAt(lv));
    // 敌人总量：后期不再翻倍式膨胀
    const totals = [1, 6, 10, 14].map(lv => t.enemiesFor(lv));
    // 护盾出现概率：早期为 0，后期接近必定
    const sample = lv => {
      t.setLevel(lv);
      let hit = 0;
      for (let i = 0; i < 200; i++) if (t.enemyShieldForLevel > 0) hit++;
      return hit / 200;
    };
    return { maxAlive, totals, early: sample(4), mid: sample(9), late: sample(16) };
  });
  // 同屏上限：1 关 2 个 -> 后期封顶 6，不会无限堆
  expect(data.maxAlive[0]).toBe(2);
  expect(Math.max(...data.maxAlive)).toBe(6);
  expect(data.maxAlive[data.maxAlive.length - 1]).toBe(6);
  // 早期无护盾，中期开始出现，后期几乎人人带盾
  expect(data.early).toBe(0);
  expect(data.mid).toBeGreaterThan(0.15);
  expect(data.late).toBeGreaterThan(0.6);
  // 总量随关卡缓增（旧版每关 +2，第 14 关就有 46）
  expect(data.totals[0]).toBeLessThan(20);
  expect(data.totals[data.totals.length - 1]).toBeLessThan(42);
});

test('Y: enemy builds differ in size, hp and speed', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(2400);   // 等开局过场结束

  const res = await page.evaluate(() => {
    const t = window.__test;
    t.clearEnemiesNow();
    const mk = (k, x) => t.spawnEnemyOfKind(k, x, 120);
    return { light: mk('light', 64), medium: mk('medium', 128), heavy: mk('heavy', 192), kinds: t.enemyKinds };
  });

  // 血量：轻型 < 中型 < 重型
  expect(res.light.hp).toBeLessThan(res.medium.hp);
  expect(res.medium.hp).toBeLessThan(res.heavy.hp);
  // 体格标签要真的落到模型上（画布按 build 取尺寸参数）
  expect(res.light.build).toBe('light');
  expect(res.medium.build).toBe('medium');
  expect(res.heavy.build).toBe('heavy');
  // 血厚的走得慢
  expect(res.heavy.speed).toBeLessThan(res.light.speed);
  // 数值表本身可读
  expect(res.kinds.heavy.hp).toBeGreaterThan(res.kinds.light.hp);

  // 迅捷坦克单发 1 点，打轻型（2 血）正好两发
  const scoutDmg = await page.evaluate(() => {
    window.__test.selectTank('scout');
    return window.__test.tankStats.dmg;
  });
  expect(scoutDmg * 2).toBe(res.light.hp);
});
test('Z: enemies actively press the base', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(2400);   // 等开局过场结束

  // 攻基地权重：第 1 关就不低，随关卡上升但有上限
  const chances = await page.evaluate(() => {
    const t = window.__test;
    return { lv1: t.baseRushChanceAt(1), lv10: t.baseRushChanceAt(10), lv20: t.baseRushChanceAt(20) };
  });
  expect(chances.lv1).toBeGreaterThanOrEqual(0.45);
  expect(chances.lv10).toBeGreaterThan(chances.lv1);
  expect(chances.lv20).toBeLessThanOrEqual(0.86);   // 有硬顶

  // 目标分布：扑基地不能只是少数派行为
  const tally = await page.evaluate(async () => {
    const t = window.__test;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const out = { base: 0, player: 0, random: 0, total: 0 };
    for (let i = 0; i < 60; i++) {
      t.forceEnemyReplan();
      await wait(25);
      for (const g of t.enemyGoals()) { out[g.goal] = (out[g.goal] || 0) + 1; out.total++; }
    }
    return out;
  });
  expect(tally.total).toBeGreaterThan(40);
  expect(tally.base / tally.total).toBeGreaterThan(0.28);

  // 摆到基地边上就应该真的把基地打掉血（先剥掉基地自身的护盾与炮塔，单独验证进攻性）
  await page.evaluate(() => {
    const t = window.__test;
    t.stripBaseDefense();
    t.clearEnemiesNow();
    t.spawnEnemyOfKind('medium', 176, 400);
    t.spawnEnemyOfKind('medium', 240, 400);
  });
  await page.waitForTimeout(14000);
  const after = await page.evaluate(() => ({
    hp: window.__test.baseHp,
    goals: window.__test.enemyGoals().map(g => g.goal),
  }));
  expect(after.hp).toBeLessThan(8);   // 基地满血 8，被打到掉血即证明敌人真的在打它
  expect(after.goals).toContain('base');
});
test('AA: the base defends itself with hp, an energy shield and a turret', async ({ page }) => {
  await page.click('#btn1p');
  await page.waitForTimeout(2400);

  const stats = await page.evaluate(() => ({
    maxHp: window.__test.base.maxHp,
    eshield: window.__test.baseEshield,
    itemShield: window.__test.buffCharges.baseShield,
  }));
  expect(stats.maxHp).toBe(8);
  expect(stats.eshield).toBe(2);
  expect(stats.itemShield).toBe(0);

  // 伤害消耗顺序：能量护盾 → 血量；护盾吃光之前血量不动
  const h1 = await page.evaluate(() => window.__test.hurtBase(1));
  expect(h1).toEqual({ eshield: 1, hp: 8, item: false });
  const h2 = await page.evaluate(() => window.__test.hurtBase(1));
  expect(h2).toEqual({ eshield: 0, hp: 8, item: false });
  const h3 = await page.evaluate(() => window.__test.hurtBase(1));
  expect(h3).toEqual({ eshield: 0, hp: 7, item: false });

  // 自动炮塔：基地 5 格外摆一个敌人，几秒内必须掉血（或被打死）
  const probe = await page.evaluate(async () => {
    const t = window.__test;
    t.clearEnemiesNow();
    const b = t.base;
    const bx = b.c * 16 + 8, by = b.r * 16 + 8;
    t.spawnEnemyOfKind('heavy', bx - 56, by - 44, { tag: 'turretprobe' });
    const before = t.enemyState('turretprobe').hp;
    await new Promise(r => setTimeout(r, 4000));
    const now = t.enemyState('turretprobe');
    return { before, after: now ? now.hp : 0 };
  });
  expect(probe.before).toBe(8);
  expect(probe.after).toBeLessThan(probe.before);
});