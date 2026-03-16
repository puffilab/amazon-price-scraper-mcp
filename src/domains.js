/**
 * Amazon country domain mapping
 * Key = country code, Value = { domain, currency, locale }
 */
export const AMAZON_DOMAINS = {
  us:  { domain: 'www.amazon.com',     currency: 'USD', locale: 'en-US' },
  uk:  { domain: 'www.amazon.co.uk',   currency: 'GBP', locale: 'en-GB' },
  de:  { domain: 'www.amazon.de',      currency: 'EUR', locale: 'de-DE' },
  fr:  { domain: 'www.amazon.fr',      currency: 'EUR', locale: 'fr-FR' },
  it:  { domain: 'www.amazon.it',      currency: 'EUR', locale: 'it-IT' },
  es:  { domain: 'www.amazon.es',      currency: 'EUR', locale: 'es-ES' },
  ca:  { domain: 'www.amazon.ca',      currency: 'CAD', locale: 'en-CA' },
  jp:  { domain: 'www.amazon.co.jp',   currency: 'JPY', locale: 'ja-JP' },
  au:  { domain: 'www.amazon.com.au',  currency: 'AUD', locale: 'en-AU' },
  in:  { domain: 'www.amazon.in',      currency: 'INR', locale: 'en-IN' },
  mx:  { domain: 'www.amazon.com.mx',  currency: 'MXN', locale: 'es-MX' },
  br:  { domain: 'www.amazon.com.br',  currency: 'BRL', locale: 'pt-BR' },
  nl:  { domain: 'www.amazon.nl',      currency: 'EUR', locale: 'nl-NL' },
  se:  { domain: 'www.amazon.se',      currency: 'SEK', locale: 'sv-SE' },
  pl:  { domain: 'www.amazon.pl',      currency: 'PLN', locale: 'pl-PL' },
  sg:  { domain: 'www.amazon.sg',      currency: 'SGD', locale: 'en-SG' },
  ae:  { domain: 'www.amazon.ae',      currency: 'AED', locale: 'ar-AE' },
  sa:  { domain: 'www.amazon.sa',      currency: 'SAR', locale: 'ar-SA' },
  tr:  { domain: 'www.amazon.com.tr',  currency: 'TRY', locale: 'tr-TR' },
  cn:  { domain: 'www.amazon.cn',      currency: 'CNY', locale: 'zh-CN' },
};

export function getCountryConfig(countryCode) {
  const code = (countryCode || 'us').toLowerCase();
  return AMAZON_DOMAINS[code] || AMAZON_DOMAINS['us'];
}

export function listCountries() {
  return Object.entries(AMAZON_DOMAINS).map(([code, info]) => ({
    code,
    domain: info.domain,
    currency: info.currency,
  }));
}
