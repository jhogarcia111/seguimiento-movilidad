/**
 * Helper unificado para lanzar Puppeteer:
 *  - En local (dev): usa el paquete `puppeteer` completo, que trae su propio Chromium.
 *  - En Vercel / serverless: usa `puppeteer-core` + `@sparticuz/chromium` (binarios livianos).
 *
 * Uso:
 *   import { launchBrowser, COMMON_LAUNCH_ARGS } from '@/lib/puppeteer';
 *   const browser = await launchBrowser();
 *   try { ... } finally { await browser.close(); }
 */

export const COMMON_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-blink-features=AutomationControlled',
  '--disable-features=IsolateOrigins,site-per-process',
];

function isServerless() {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export async function launchBrowser(options = {}) {
  const { extraArgs = [], headless = true, userDataDir } = options;

  if (isServerless()) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteerCore = (await import('puppeteer-core')).default;

    return puppeteerCore.launch({
      args: [...chromium.args, ...COMMON_LAUNCH_ARGS, ...extraArgs],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless ?? headless,
      ignoreHTTPSErrors: true,
      ...(userDataDir ? { userDataDir } : {}),
    });
  }

  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({
    headless,
    args: [...COMMON_LAUNCH_ARGS, ...extraArgs],
    ...(userDataDir ? { userDataDir } : {}),
  });
}
