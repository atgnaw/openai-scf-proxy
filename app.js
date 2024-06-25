const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

// 创建第一个应用实例，监听端口9000
const app1 = express();
const port1 = 9000;

app1.use('/', createProxyMiddleware({
  target: 'https://api.openai.com',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // 移除 'x-forwarded-for' 和 'x-real-ip' 头，以确保不传递原始客户端 IP 地址等信息
    proxyReq.removeHeader('x-forwarded-for');
    proxyReq.removeHeader('x-real-ip');
  },
  onProxyRes: function (proxyRes, req, res) {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
  }
}));

app1.listen(port1, () => {
  console.log(`Proxy to OpenAI API listening at http://localhost:${port1}`);
});

// 创建第二个应用实例，监听端口9001
const app2 = express();
const port2 = 9100;

app2.use('/', createProxyMiddleware({
  target: 'https://api.anthropic.com',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    // 移除 'x-forwarded-for' 和 'x-real-ip' 头，以确保不传递原始客户端 IP 地址等信息
    proxyReq.removeHeader('x-forwarded-for');
    proxyReq.removeHeader('x-real-ip');
  },
  onProxyRes: function (proxyRes, req, res) {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
  }
}));

app2.listen(port2, () => {
  console.log(`Proxy to Anthropic API listening at http://localhost:${port2}`);
});
