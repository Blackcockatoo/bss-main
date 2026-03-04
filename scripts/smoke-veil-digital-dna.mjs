let chromium;
let devices;

try {
  ({ chromium, devices } = await import('playwright'));
} catch {
  console.error('Playwright is required for this smoke script. Run: npm install playwright --no-save');
  process.exit(1);
}

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3112';
const NAV_TIMEOUT_MS = 120000;

function collectErrorChannels(page) {
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message || String(error));
  });

  return { consoleErrors, pageErrors };
}

async function waitForPrimaryCanvas(page) {
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ state: 'visible', timeout: NAV_TIMEOUT_MS });
  const box = await canvas.boundingBox();
  if (!box || box.width < 100 || box.height < 100) {
    throw new Error(`Canvas size too small: ${box ? `${box.width}x${box.height}` : 'missing'}`);
  }
}

async function assertHelixReady(page, channel) {
  const fallbackHeading = page.getByRole('heading', { name: '3D unavailable on this device.' });
  if (await fallbackHeading.isVisible()) {
    throw new Error(`${channel} opened in fallback mode instead of helix mode.`);
  }

  await waitForPrimaryCanvas(page);

  if (await fallbackHeading.isVisible()) {
    throw new Error(`${channel} switched to fallback mode during smoke run.`);
  }
}

async function runDesktopSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrorChannels(page);

  await page.goto(`${baseUrl}/veil/digital-dna`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.getByText('Digital DNA').first().waitFor({ timeout: NAV_TIMEOUT_MS });
  await assertHelixReady(page, 'desktop');

  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.44);
    await page.mouse.up();
  }

  await page.waitForTimeout(1200);

  await context.close();

  if (pageErrors.length > 0 || consoleErrors.length > 0) {
    throw new Error(
      `Desktop route produced runtime errors. pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)}`
    );
  }
}

async function runMobileSmoke(browser) {
  const iphone = devices['iPhone 13'];
  const context = await browser.newContext({ ...iphone });
  const page = await context.newPage();
  const { consoleErrors, pageErrors } = collectErrorChannels(page);

  await page.goto(`${baseUrl}/veil/digital-dna`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.getByText('Digital DNA').first().waitFor({ timeout: NAV_TIMEOUT_MS });
  await assertHelixReady(page, 'mobile');

  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(700);
  await assertHelixReady(page, 'mobile landscape');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  await assertHelixReady(page, 'mobile portrait');

  await context.close();

  if (pageErrors.length > 0 || consoleErrors.length > 0) {
    throw new Error(
      `Mobile route produced runtime errors. pageErrors=${JSON.stringify(pageErrors)} consoleErrors=${JSON.stringify(consoleErrors)}`
    );
  }
}

async function runForcedFallbackSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const { pageErrors } = collectErrorChannels(page);

  await page.goto(`${baseUrl}/veil/digital-dna?force3dError=1`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.getByRole('heading', { name: '3D unavailable on this device.' }).waitFor({ timeout: NAV_TIMEOUT_MS });

  await page.getByRole('button', { name: 'Switch to 2D mode' }).click();
  await waitForPrimaryCanvas(page);

  await page.goto(`${baseUrl}/veil/digital-dna`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.getByRole('button', { name: 'DNA Helix' }).click();
  await waitForPrimaryCanvas(page);

  await context.close();

  if (pageErrors.length > 0) {
    throw new Error(`Fallback route generated uncaught page errors: ${JSON.stringify(pageErrors)}`);
  }
}

async function runForcedAudioFallbackSmoke(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const { pageErrors } = collectErrorChannels(page);

  await page.goto(`${baseUrl}/veil/digital-dna?forceAudioError=1`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.getByRole('button', { name: 'Sound Temple' }).click();
  await page.getByRole('button', { name: 'Play DNA Sequence' }).click();
  await page.getByRole('heading', { name: 'Audio unavailable on this device.' }).waitFor({ timeout: NAV_TIMEOUT_MS });

  await page.getByRole('button', { name: 'Retry Audio' }).click();
  await page.getByRole('heading', { name: 'Audio unavailable on this device.' }).waitFor({ timeout: NAV_TIMEOUT_MS });

  await page.getByRole('button', { name: 'Switch to Visual Mode' }).click();
  await waitForPrimaryCanvas(page);

  await context.close();

  if (pageErrors.length > 0) {
    throw new Error(`Audio fallback route generated uncaught page errors: ${JSON.stringify(pageErrors)}`);
  }
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
  });
  try {
    await runDesktopSmoke(browser);
    await runMobileSmoke(browser);
    await runForcedFallbackSmoke(browser);
    await runForcedAudioFallbackSmoke(browser);
  } finally {
    await browser.close();
  }

  console.log('PASS: veil digital DNA smoke checks completed (desktop, mobile, 3D fallback, audio fallback).');
}

main().catch((error) => {
  console.error('FAIL: veil digital DNA smoke checks failed.');
  console.error(error);
  process.exitCode = 1;
});
