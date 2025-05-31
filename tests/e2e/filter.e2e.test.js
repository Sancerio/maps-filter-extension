const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname, '../../'); // Adjust if your extension root is elsewhere
const FIXTURE_URL = `file://${path.resolve(__dirname, '../fixtures/maps_list_mock.html')}`;

describe('Google Maps List Filter E2E Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    // Launch the browser with the extension loaded
    // Note: loading extensions in headless mode can be tricky and has changed across Puppeteer versions.
    // 'new' headless mode is generally better. If issues arise, try headless: false.
    browser = await puppeteer.launch({
      headless: 'new', // Or true, or false for debugging
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox', // Often needed in CI environments
        '--disable-setuid-sandbox'
      ]
    });
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto(FIXTURE_URL, { waitUntil: 'networkidle0' });
    // Ensure the filter input is available before each test runs
    try {
      await page.waitForSelector('#maps-filter-input', { timeout: 10000 });
    } catch (e) {
      console.error('Filter input #maps-filter-input did not appear in beforeEach.');
      // Optionally, dump page content for debugging if input not found
      // const content = await page.content();
      // console.log(content);
      throw e; // Re-throw to fail the test explicitly if it doesn't appear
    }
  });

  afterEach(async () => {
    if (page) await page.close();
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  test('should inject the filter UI onto the page', async () => {
    // Wait for the filter input to appear
    const filterInput = await page.$('#maps-filter-input');
    expect(filterInput).not.toBeNull();
    
    // Check its placeholder
    const placeholder = await page.evaluate(el => el.placeholder, filterInput);
    expect(placeholder).toBe('Filter places by name, type, price, or notes... (use -word to exclude)');
  });

  test('should show all items when filter is empty', async () => {
    await new Promise(resolve => setTimeout(resolve, 500)); 
    const item1 = await page.$('#item1');
    const item2 = await page.$('#item2');
    const item3 = await page.$('#item3');
    expect(await page.evaluate(el => el.style.display, item1)).not.toBe('none');
    expect(await page.evaluate(el => el.style.display, item2)).not.toBe('none');
    expect(await page.evaluate(el => el.style.display, item3)).not.toBe('none');
  });

  test('should filter items by name', async () => {
    await page.type('#maps-filter-input', 'Coffee Supreme');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item1 = await page.$('#item1');
    const item2 = await page.$('#item2');
    expect(await page.evaluate(el => el.style.display, item1)).not.toBe('none');
    expect(await page.evaluate(el => el.style.display, item2)).toBe('none');
  });

  test('should filter items by details/type (e.g., Bookstore)', async () => {
    await page.type('#maps-filter-input', 'Bookstore');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item1 = await page.$('#item1');
    const item2 = await page.$('#item2');
    expect(await page.evaluate(el => el.style.display, item1)).toBe('none');
    expect(await page.evaluate(el => el.style.display, item2)).not.toBe('none');
  });

  test('should filter items by note content', async () => {
    await page.type('#maps-filter-input', 'cold brew');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item1 = await page.$('#item1');
    const item2 = await page.$('#item2');
    expect(await page.evaluate(el => el.style.display, item1)).not.toBe('none');
    expect(await page.evaluate(el => el.style.display, item2)).toBe('none');
  });

  test('should filter with diacritics (querying for Pâtisserie)', async () => {
    await page.type('#maps-filter-input', 'Pâtisserie');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item4 = await page.$('#item4');
    const item1 = await page.$('#item1');
    expect(await page.evaluate(el => el.style.display, item4)).not.toBe('none');
    expect(await page.evaluate(el => el.style.display, item1)).toBe('none');
  });

  test('should filter with diacritics (querying for delices from note)', async () => {
    await page.type('#maps-filter-input', 'delices');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item4 = await page.$('#item4');
    const item1 = await page.$('#item1');
    expect(await page.evaluate(el => el.style.display, item4)).not.toBe('none');
    expect(await page.evaluate(el => el.style.display, item1)).toBe('none');
  });

  test('should show all items when filter is cleared', async () => {
    await page.type('#maps-filter-input', 'something specific to hide most');
    await new Promise(resolve => setTimeout(resolve, 300));
    await page.evaluate(() => (document.getElementById('maps-filter-input').value = ''));
    await page.click('#maps-filter-input');
    await page.keyboard.press('Space'); 
    await page.keyboard.press('Backspace');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item1 = await page.$('#item1');
    const item2 = await page.$('#item2');
    expect(await page.evaluate(el => el.style.display, item1)).not.toBe('none');
    expect(await page.evaluate(el => el.style.display, item2)).not.toBe('none');
  });

  test('should exclude items using minus syntax', async () => {
    await page.type('#maps-filter-input', '-Coffee');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item1 = await page.$('#item1'); // Coffee Supreme
    const item2 = await page.$('#item2'); // Page Turner Bookstore
    expect(await page.evaluate(el => el.style.display, item1)).toBe('none'); // Should be hidden (contains Coffee)
    expect(await page.evaluate(el => el.style.display, item2)).not.toBe('none'); // Should be visible (no Coffee)
  });

  test('should apply both include and exclude filters', async () => {
    await page.type('#maps-filter-input', 'Bookstore -used');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item2 = await page.$('#item2'); // Page Turner Bookstore
    const item1 = await page.$('#item1'); // Coffee Supreme
    expect(await page.evaluate(el => el.style.display, item2)).not.toBe('none'); // Should be visible (has Bookstore, no 'used')
    expect(await page.evaluate(el => el.style.display, item1)).toBe('none'); // Should be hidden (no Bookstore)
  });

  test('should exclude by note content', async () => {
    await page.type('#maps-filter-input', '-brew');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item1 = await page.$('#item1'); // Has 'cold brew' in note
    const item2 = await page.$('#item2'); // No 'brew' in note
    expect(await page.evaluate(el => el.style.display, item1)).toBe('none'); // Should be hidden (note contains 'brew')
    expect(await page.evaluate(el => el.style.display, item2)).not.toBe('none'); // Should be visible (no 'brew' in note)
  });

  test('should handle multiple exclude terms', async () => {
    await page.type('#maps-filter-input', '-Coffee -Bookstore');
    await new Promise(resolve => setTimeout(resolve, 300));
    const item1 = await page.$('#item1'); // Coffee Supreme (contains "Coffee")
    const item2 = await page.$('#item2'); // Best Books with "Bookstore" in details
    const item3 = await page.$('#item3'); // Central Park (should be visible)
    
    expect(await page.evaluate(el => el.style.display, item1)).toBe('none'); // Should be hidden (contains Coffee)
    expect(await page.evaluate(el => el.style.display, item2)).toBe('none'); // Should be hidden (contains Bookstore)
    if (item3) {
      expect(await page.evaluate(el => el.style.display, item3)).not.toBe('none'); // Should be visible if it doesn't contain Coffee or Bookstore
    }
  });

  // TODO: Add tests for observing list changes (dynamically add item and check filter)
  // TODO: Add tests for auto-scroll (might be hard with static fixture, may need to mock scrollHeight/clientHeight via page.evaluate)
}); 