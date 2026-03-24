const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const DEFAULT_HOST = process.env.PROXY_HOST || '0.0.0.0';
const DEFAULT_TIMEOUT_MS = parsePositiveInteger(process.env.PROXY_TIMEOUT_MS, 30000);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const PROXY_CONFIGS = [
  {
    name: 'OpenAI',
    port: parsePort(process.env.OPENAI_PROXY_PORT, 9000),
    target: process.env.OPENAI_PROXY_TARGET || 'https://api.openai.com',
  },
  {
    name: 'Anthropic',
    port: parsePort(process.env.ANTHROPIC_PROXY_PORT, 9100),
    target: process.env.ANTHROPIC_PROXY_TARGET || 'https://api.anthropic.com',
  },
];

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePort(value, fallback) {
  const parsed = parsePositiveInteger(value, fallback);
  return parsed >= 1 && parsed <= 65535 ? parsed : fallback;
}

function applyCors(target) {
  Object.entries(CORS_HEADERS).forEach(([header, value]) => {
    target.setHeader(header, value);
  });
}

function applyCorsToProxyResponse(proxyRes) {
  Object.entries(CORS_HEADERS).forEach(([header, value]) => {
    proxyRes.headers[header] = value;
  });
}

function stripForwardHeaders(proxyReq) {
  [
    'forwarded',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-port',
    'x-forwarded-proto',
    'x-real-ip',
  ].forEach((header) => {
    proxyReq.removeHeader(header);
  });
}

function createProxyApp(config) {
  const app = express();

  app.disable('x-powered-by');

  app.use((req, res, next) => {
    applyCors(res);

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  app.get('/healthz', (req, res) => {
    res.json({
      name: config.name,
      status: 'ok',
      target: config.target,
    });
  });

  app.use('/', createProxyMiddleware({
    target: config.target,
    changeOrigin: true,
    proxyTimeout: DEFAULT_TIMEOUT_MS,
    timeout: DEFAULT_TIMEOUT_MS,
    xfwd: false,
    onProxyReq(proxyReq) {
      stripForwardHeaders(proxyReq);
    },
    onProxyRes(proxyRes) {
      applyCorsToProxyResponse(proxyRes);
    },
    onError(err, req, res) {
      if (res.headersSent) {
        return;
      }

      applyCors(res);
      res.status(502).json({
        error: `${config.name} proxy error`,
        message: err.code || err.message,
      });
    },
  }));

  return app;
}

function startProxyServer(config) {
  const app = createProxyApp(config);

  return app.listen(config.port, DEFAULT_HOST, () => {
    console.log(
      `${config.name} proxy listening on http://${DEFAULT_HOST}:${config.port} -> ${config.target}`,
    );
  });
}

function startAllServers() {
  return PROXY_CONFIGS.map(startProxyServer);
}

if (require.main === module) {
  startAllServers();
}

module.exports = {
  CORS_HEADERS,
  PROXY_CONFIGS,
  applyCors,
  applyCorsToProxyResponse,
  createProxyApp,
  parsePort,
  parsePositiveInteger,
  startAllServers,
  startProxyServer,
  stripForwardHeaders,
};
