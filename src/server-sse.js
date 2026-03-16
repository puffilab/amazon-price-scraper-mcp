/**
 * SSE transport MCP server — for OpenAI / ChatGPT integration
 * Runs on HTTP, exposes /sse endpoint
 */
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { searchAmazonLowestPrice } from './scraper.js';
import { listCountries } from './domains.js';

const PORT = process.env.PORT || 8000;
const app = express();
app.use(express.json());

// ── Tool definitions (same as stdio version) ────────────────────────────────

const TOOLS = [
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
          description: 'Product name or search query',
        },
        country: {
          type: 'string',
          description:
            'Amazon country code: us, uk, de, fr, it, es, ca, jp, au, in, mx, br, nl, se, pl, sg, ae, sa, tr, cn. Defaults to "us".',
          default: 'us',
        },
        max_results: {
          type: 'number',
          description: 'Max results to return (1-20, default 5)',
          default: 5,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_amazon_countries',
    description: 'List all supported Amazon country stores.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
];

// ── SSE endpoint (one session per connection) ────────────────────────────────

const transports = {};

app.get('/sse', async (req, res) => {
  const server = new Server(
    { name: 'amazon-price-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'list_amazon_countries') {
      const countries = listCountries();
      const lines = countries
        .map(c => `• ${c.code.padEnd(4)} ${c.domain.padEnd(25)} (${c.currency})`)
        .join('\n');
      return { content: [{ type: 'text', text: `Supported Amazon stores:\n\n${lines}` }] };
    }

    if (name === 'search_amazon_lowest_price') {
      const query = (args?.query || '').trim();
      if (!query) {
        return { content: [{ type: 'text', text: 'Error: query is required.' }], isError: true };
      }
      const country = (args?.country || 'us').toLowerCase();
      const maxResults = Math.min(Math.max(parseInt(args?.max_results) || 5, 1), 20);

      try {
        const result = await searchAmazonLowestPrice(query, country, maxResults);
        if (!result.success) {
          return { content: [{ type: 'text', text: `Failed: ${result.error}` }], isError: true };
        }

        const lines = [];
        lines.push(`## Amazon ${country.toUpperCase()} — "${query}"`);
        lines.push(`Search URL: ${result.searchUrl}\n`);
        if (result.lowestPrice) {
          const lp = result.lowestPrice;
          lines.push(`**Lowest price: ${lp.currency} ${lp.price} — ${lp.title}**`);
          if (lp.url) lines.push(`Link: ${lp.url}\n`);
        }
        lines.push('### All results (sorted by price)');
        result.results.forEach((p, i) => {
          const priceStr = p.price != null ? `${p.currency} ${p.price}` : `N/A`;
          const prime = p.isPrime ? ' [Prime]' : '';
          const rating = p.rating ? ` ★${p.rating}` : '';
          lines.push(`${i + 1}. ${priceStr}${prime}${rating} — ${p.title}`);
          if (p.url) lines.push(`   ${p.url}`);
        });

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (err) {
        return { content: [{ type: 'text', text: `Scraping error: ${err.message}` }], isError: true };
      }
    }

    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  });

  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => delete transports[transport.sessionId]);
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (!transport) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  await transport.handlePostMessage(req, res, req.body);
});

// Health check
app.get('/', (req, res) => {
  res.json({ name: 'amazon-price-mcp', version: '1.0.0', status: 'running', endpoint: '/sse' });
});

app.listen(PORT, () => {
  console.log(`Amazon Price MCP (SSE) running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`\nFor ChatGPT/OpenAI: expose via ngrok and add the public URL`);
});
