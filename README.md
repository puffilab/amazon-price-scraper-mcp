# Amazon Price MCP

A Model Context Protocol (MCP) server that searches Amazon for the lowest price of any product — no PA-API required, with built-in CAPTCHA resistance via Playwright stealth mode.

Supports **20 Amazon country stores** and works with **Claude Desktop** and any MCP-compatible client.

---

## English

### Features

- 🔍 Search any Amazon store for the lowest price
- 🌏 20 country stores supported (US, JP, DE, UK, FR, CN, and more)
- 🛡️ CAPTCHA-resistant: uses Playwright + stealth plugin, randomized User-Agents and delays
- 🔌 Proxy support via `PROXY_URL` environment variable
- 📡 Two transports: **stdio** (Claude Desktop) and **HTTP/SSE** (OpenAI/ChatGPT)

### Supported Countries

| Code | Domain | Currency |
|------|--------|----------|
| `us` | amazon.com | USD |
| `jp` | amazon.co.jp | JPY |
| `uk` | amazon.co.uk | GBP |
| `de` | amazon.de | EUR |
| `fr` | amazon.fr | EUR |
| `it` | amazon.it | EUR |
| `es` | amazon.es | EUR |
| `ca` | amazon.ca | CAD |
| `au` | amazon.com.au | AUD |
| `in` | amazon.in | INR |
| `mx` | amazon.com.mx | MXN |
| `br` | amazon.com.br | BRL |
| `cn` | amazon.cn | CNY |
| `nl` | amazon.nl | EUR |
| `se` | amazon.se | SEK |
| `pl` | amazon.pl | PLN |
| `sg` | amazon.sg | SGD |
| `ae` | amazon.ae | AED |
| `sa` | amazon.sa | SAR |
| `tr` | amazon.com.tr | TRY |

### Installation

**Requirements:** Node.js 18+

```bash
git clone https://github.com/puffilab/amazon-price-mcp.git
cd amazon-price-mcp
npm install
npx playwright install chromium
```

### Claude Desktop Setup

Add to your `claude_desktop_config.json`:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "amazon-price": {
      "command": "node",
      "args": ["/absolute/path/to/amazon-price-mcp/src/index.js"],
      "env": {
        "PROXY_URL": ""
      }
    }
  }
}
```

Restart Claude Desktop. Then just ask naturally:

> *"Find the lowest price for Sony WH-1000XM5 on Amazon Japan"*
> *"Search Amazon US for AirPods Pro cheapest price"*

### HTTP/SSE Server (OpenAI / ChatGPT)

```bash
npm run start:sse        # starts on port 8000
```

Expose with ngrok and add `https://<your-url>/sse` as an MCP connector in ChatGPT.

### Tools

| Tool | Description |
|------|-------------|
| `search_amazon_lowest_price` | Search a product and return results sorted by price |
| `list_amazon_countries` | List all supported Amazon country stores |

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PROXY_URL` | *(empty)* | HTTP/SOCKS proxy URL, e.g. `http://user:pass@host:port` |
| `PORT` | `8000` | Port for the SSE server |

### Anti-CAPTCHA Strategy

| Method | Details |
|--------|---------|
| Playwright stealth | Hides automation flags (webdriver, CDP, etc.) |
| User-Agent rotation | 5 realistic browser UAs randomly selected |
| Random delays | 800–2200ms between actions |
| Realistic fingerprint | Viewport, locale, and timezone match the target country |
| Proxy support | Optional HTTP/SOCKS proxy via env var |

---

## 日本語

### 特徴

- 🔍 任意のAmazonストアで最安値を検索
- 🌏 20カ国のAmazonストアに対応（US、JP、DE、UK、FR、CNなど）
- 🛡️ CAPTCHA対策済み：Playwright + ステルスプラグイン、UAランダム化、遅延ランダム化
- 🔌 `PROXY_URL` 環境変数でプロキシに対応
- 📡 2つのトランスポート：**stdio**（Claude Desktop）と **HTTP/SSE**（OpenAI/ChatGPT）

### インストール

```bash
git clone https://github.com/puffilab/amazon-price-mcp.git
cd amazon-price-mcp
npm install
npx playwright install chromium
```

### Claude Desktop の設定

`claude_desktop_config.json` に以下を追加してください：

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "amazon-price": {
      "command": "node",
      "args": ["/絶対パス/amazon-price-mcp/src/index.js"],
      "env": {
        "PROXY_URL": ""
      }
    }
  }
}
```

Claude Desktop を再起動後、自然な言葉で話しかけるだけです：

> *「Sony WH-1000XM5 を日本のAmazonで最安値で探して」*
> *「AirPods Pro のAmazon US での最安値を調べて」*

### HTTPサーバー（OpenAI / ChatGPT 向け）

```bash
npm run start:sse   # ポート8000で起動
```

ngrokで公開し、`https://<your-url>/sse` をChatGPTのMCPコネクタに追加してください。

---

## 中文

### 功能特点

- 🔍 在任意 Amazon 站点搜索商品最低价
- 🌏 支持 20 个 Amazon 国家站点（美国、日本、德国、英国、法国、中国等）
- 🛡️ 防 CAPTCHA：使用 Playwright + 隐身插件、随机 User-Agent 和随机延迟
- 🔌 通过 `PROXY_URL` 环境变量支持代理
- 📡 两种传输方式：**stdio**（Claude Desktop）和 **HTTP/SSE**（OpenAI/ChatGPT）

### 安装

```bash
git clone https://github.com/puffilab/amazon-price-mcp.git
cd amazon-price-mcp
npm install
npx playwright install chromium
```

### Claude Desktop 配置

在 `claude_desktop_config.json` 中添加以下内容：

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "amazon-price": {
      "command": "node",
      "args": ["/绝对路径/amazon-price-mcp/src/index.js"],
      "env": {
        "PROXY_URL": ""
      }
    }
  }
}
```

重启 Claude Desktop 后，直接用自然语言提问即可：

> *"帮我在日本亚马逊搜索 Sony WH-1000XM5 最低价"*
> *"查一下美国亚马逊 AirPods Pro 最便宜多少钱"*

### HTTP 服务器（OpenAI / ChatGPT）

```bash
npm run start:sse   # 在 8000 端口启动
```

用 ngrok 暴露后，将 `https://<your-url>/sse` 添加为 ChatGPT 的 MCP 连接器。

### 使用示例

| 查询 | 国家代码 |
|------|---------|
| iPhone 15 最低价 | `us` |
| Sony WH-1000XM5 | `jp` |
| Dyson V15 | `de` |
| AirPods Pro | `uk` |

---

## License

MIT
