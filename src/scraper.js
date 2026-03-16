import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { getCountryConfig } from './domains.js';

chromium.use(StealthPlugin());

// ─── helpers ────────────────────────────────────────────────────────────────

function randomDelay(min = 800, max = 2200) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min)) + min));
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

function randomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
];

function randomViewport() {
  return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
}

// Parse a raw price string like "€29,99" / "$12.34" / "¥1,234" into a number
function parsePrice(raw) {
  if (!raw) return null;
  // Remove currency symbols and whitespace
  const cleaned = raw.replace(/[^\d.,]/g, '').trim();
  if (!cleaned) return null;
  // Handle formats: 1.234,56 (European) or 1,234.56 (US)
  let normalized;
  if (/,\d{2}$/.test(cleaned)) {
    // European: 1.234,56
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // US: 1,234.56
    normalized = cleaned.replace(/,/g, '');
  }
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

// ─── main scrape function ────────────────────────────────────────────────────

export async function searchAmazonLowestPrice(query, countryCode = 'us', maxResults = 5) {
  const config = getCountryConfig(countryCode);
  const ua = randomUA();
  const viewport = randomViewport();

  const proxyServer = process.env.PROXY_URL || null;

  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  };
  if (proxyServer) launchOptions.proxy = { server: proxyServer };

  const browser = await chromium.launch(launchOptions);

  try {
    const context = await browser.newContext({
      userAgent: ua,
      viewport,
      locale: config.locale,
      timezoneId: localeToTimezone(config.locale),
      extraHTTPHeaders: {
        'Accept-Language': `${config.locale},en;q=0.9`,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    // Mask webdriver flag
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await context.newPage();

    const searchUrl = buildSearchUrl(config.domain, query);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check for CAPTCHA page
    const isCaptcha = await page.$('form[action*="validateCaptcha"]');
    if (isCaptcha) {
      await browser.close();
      return {
        success: false,
        error: 'Amazon presented a CAPTCHA. Try again in a few minutes, use a proxy (set PROXY_URL env var), or reduce request frequency.',
        country: countryCode,
        query,
      };
    }

    await randomDelay(1000, 2000);

    // Wait for search results container
    await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 15000 }).catch(() => null);

    const products = await page.evaluate((maxN) => {
      const results = [];
      const cards = document.querySelectorAll('[data-component-type="s-search-result"]');

      for (const card of cards) {
        if (results.length >= maxN) break;

        // Title — brand cards put title in .a-text-normal, third-party in h2 > span
        const titleEl =
          card.querySelector('h2 span.a-text-normal') ||
          card.querySelector('.a-size-base-plus.a-text-normal') ||
          card.querySelector('.a-size-medium.a-text-normal') ||
          card.querySelector('h2 span');
        let title = titleEl ? titleEl.textContent.trim() : null;

        // Fallback: image alt text often has full product title
        if (!title || title.length < 5) {
          const img = card.querySelector('img.s-image');
          if (img) title = img.getAttribute('alt')?.trim() || null;
        }
        if (!title || title.length < 2) continue;

        // URL — find link to product detail page
        const linkEl =
          card.querySelector('a[href*="/dp/"]') ||
          card.querySelector('h2 a');
        const relUrl = linkEl ? linkEl.getAttribute('href') : null;

        // Price — .a-offscreen is most reliable across all locales/currencies
        const offscreenEl = card.querySelector('.a-price .a-offscreen');
        let priceText = offscreenEl ? offscreenEl.textContent.trim() : null;

        // Fallback: reconstruct from whole + fraction
        if (!priceText) {
          const wholeEl  = card.querySelector('.a-price-whole');
          const fracEl   = card.querySelector('.a-price-fraction');
          const symbolEl = card.querySelector('.a-price-symbol');
          if (wholeEl) {
            const whole = wholeEl.textContent.replace(/[.,]$/, '').trim();
            const frac  = fracEl ? fracEl.textContent.trim() : '';
            const sym   = symbolEl ? symbolEl.textContent.trim() : '';
            priceText = frac ? `${sym}${whole}.${frac}` : `${sym}${whole}`;
          }
        }

        // Rating
        const ratingEl = card.querySelector('.a-icon-alt');
        const rating = ratingEl ? ratingEl.textContent.trim() : null;

        // Review count
        const reviewEl = card.querySelector('.a-size-base.s-underline-text');
        const reviews = reviewEl ? reviewEl.textContent.trim() : null;

        // Prime badge
        const isPrime = !!card.querySelector('.s-prime, [aria-label="Amazon Prime"], [aria-label="プライム"]');

        // ASIN
        const asin = card.getAttribute('data-asin') || null;

        results.push({ title, priceText, relUrl, rating, reviews, isPrime, asin });
      }
      return results;
    }, maxResults);

    // Enrich products: parse price, build absolute URL
    const enriched = products
      .map(p => ({
        title: p.title,
        price: parsePrice(p.priceText),
        priceRaw: p.priceText,
        currency: config.currency,
        url: p.relUrl ? `https://${config.domain}${p.relUrl.split('?')[0]}` : null,
        asin: p.asin,
        rating: p.rating,
        reviews: p.reviews,
        isPrime: p.isPrime,
      }))
      .filter(p => p.price !== null)
      .sort((a, b) => a.price - b.price);

    // Items with no parseable price still included, after sorted
    const noPrice = products
      .filter(p => parsePrice(p.priceText) === null)
      .map(p => ({
        title: p.title,
        price: null,
        priceRaw: p.priceText || 'N/A',
        currency: config.currency,
        url: p.relUrl ? `https://${config.domain}${p.relUrl.split('?')[0]}` : null,
        asin: p.asin,
        rating: p.rating,
        reviews: p.reviews,
        isPrime: p.isPrime,
      }));

    const all = [...enriched, ...noPrice].slice(0, maxResults);

    return {
      success: true,
      query,
      country: countryCode,
      domain: config.domain,
      currency: config.currency,
      searchUrl,
      lowestPrice: enriched.length > 0 ? enriched[0] : null,
      results: all,
    };
  } finally {
    await browser.close();
  }
}

// ─── utils ───────────────────────────────────────────────────────────────────

function buildSearchUrl(domain, query) {
  const encoded = encodeURIComponent(query);
  return `https://${domain}/s?k=${encoded}&s=price-asc-rank`;
}

function localeToTimezone(locale) {
  const map = {
    'en-US': 'America/New_York',
    'en-GB': 'Europe/London',
    'de-DE': 'Europe/Berlin',
    'fr-FR': 'Europe/Paris',
    'it-IT': 'Europe/Rome',
    'es-ES': 'Europe/Madrid',
    'en-CA': 'America/Toronto',
    'ja-JP': 'Asia/Tokyo',
    'en-AU': 'Australia/Sydney',
    'en-IN': 'Asia/Kolkata',
    'es-MX': 'America/Mexico_City',
    'pt-BR': 'America/Sao_Paulo',
    'nl-NL': 'Europe/Amsterdam',
    'sv-SE': 'Europe/Stockholm',
    'pl-PL': 'Europe/Warsaw',
    'en-SG': 'Asia/Singapore',
    'ar-AE': 'Asia/Dubai',
    'ar-SA': 'Asia/Riyadh',
    'tr-TR': 'Europe/Istanbul',
    'zh-CN': 'Asia/Shanghai',
  };
  return map[locale] || 'America/New_York';
}
