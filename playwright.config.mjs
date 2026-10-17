import { defineConfig, chromium } from '@playwright/test';
import fs from 'fs';

// 有些环境没有 Playwright 自带的 Chromium（例如没网、执行不了
// `npx playwright install`）。这时回退到系统已安装的 Google Chrome，
// 让 AGENTS.md 里写的 `npx playwright test` 仍然能跑起来。
// 自带 Chromium 存在时，行为和原来完全一致。
//
// 判断依据是"完整版 Chromium"是否存在。若某环境只装了 chrome-headless-shell
// （`playwright install --only-shell`），这里会多余地回退到系统 Chrome；
// 那种环境删掉下面的 fallback 即可。
const CHROME_PATHS = [
  `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

function detectChannel() {
  try {
    if (fs.existsSync(chromium.executablePath())) return undefined;
  } catch {
    // executablePath() 也可能直接抛错，同样按"未安装"处理
  }
  return CHROME_PATHS.some((p) => p && fs.existsSync(p)) ? 'chrome' : undefined;
}

const channel = detectChannel();

export default defineConfig({
  testMatch: '*.spec.mjs',
  use: {
    headless: true,
    viewport: { width: 800, height: 800 },
    ...(channel ? { channel } : {}),
  },
  timeout: 30000,
});
