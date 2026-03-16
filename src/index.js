import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { searchAmazonLowestPrice } from './scraper.js';
import { listCountries } from './domains.js';

const server = new Server(
  { name: 'amazon-price-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// ─── List tools ──────────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_amazon_lowest_price',
      description:
        'Search Amazon for a product and return results sorted by price (lowest first). ' +
        'Supports multiple Amazon country stores. No PA-API required.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Product name or search query (e.g. "iPhone 15 case", "Sony WH-1000XM5")',
          },
          country: {
            type: 'string',
            description:
              'Amazon country code. Supported: us, uk, de, fr, it, es, ca, jp, au, in, mx, br, nl, se, pl, sg, ae, sa, tr, cn. Defaults to "us".',
            default: 'us',
          },
          max_results: {
            type: 'number',
            description: 'Max number of products to return (1-20, default 5)',
            default: 5,
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'list_amazon_countries',
      description: 'List all supported Amazon country stores with their codes, domains, and currencies.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ],
}));

// ─── Call tools ──────────────────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'list_amazon_countries') {
    const countries = listCountries();
    const lines = countries.map(c => `• ${c.code.padEnd(4)} ${c.domain.padEnd(25)} (${c.currency})`).join('\n');
    return {
      content: [{ type: 'text', text: `Supported Amazon stores:\n\n${lines}` }],
    };
  }

  if (name === 'search_amazon_lowest_price') {
    const query = (args?.query || '').trim();
    if (!query) {
      return {
        content: [{ type: 'text', text: 'Error: query parameter is required.' }],
        isError: true,
      };
    }

    const country = (args?.country || 'us').toLowerCase();
    const maxResults = Math.min(Math.max(parseInt(args?.max_results) || 5, 1), 20);

    let result;
    try {
      result = await searchAmazonLowestPrice(query, country, maxResults);
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Scraping error: ${err.message}` }],
        isError: true,
      };
    }

    if (!result.success) {
      return {
        content: [{ type: 'text', text: `Failed: ${result.error}` }],
        isError: true,
      };
    }

    // Format a human-readable summary + raw JSON
    const lines = [];
    lines.push(`## Amazon ${country.toUpperCase()} — "${query}"`);
    lines.push(`Search URL: ${result.searchUrl}`);
    lines.push('');

    if (result.lowestPrice) {
      const lp = result.lowestPrice;
      lines.push(`**Lowest price: ${lp.currency} ${lp.price} — ${lp.title}**`);
      if (lp.url) lines.push(`Link: ${lp.url}`);
      lines.push('');
    }

    lines.push(`### All results (sorted by price)`);
    result.results.forEach((p, i) => {
      const priceStr = p.price != null ? `${p.currency} ${p.price}` : `N/A (${p.priceRaw})`;
      const prime = p.isPrime ? ' [Prime]' : '';
      const rating = p.rating ? ` ★${p.rating}` : '';
      lines.push(`${i + 1}. ${priceStr}${prime}${rating} — ${p.title}`);
      if (p.url) lines.push(`   ${p.url}`);
    });

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
    };
  }

  return {
    content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// ─── Start ───────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
