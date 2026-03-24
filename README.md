# openai-scf-proxy

一个轻量的本地代理服务，用来把请求转发到 OpenAI 和 Anthropic API。

默认会同时启动两个 HTTP 服务：

- OpenAI 代理：`http://localhost:9000`
- Anthropic 代理：`http://localhost:9100`

项目基于 `express` 和 `http-proxy-middleware`，已经包含：

- 基础 CORS 支持
- `OPTIONS` 预检处理
- 代理超时设置
- 统一错误返回
- `/healthz` 健康检查接口

## 安装与启动

先安装依赖：

```bash
npm install
```

启动服务：

```bash
npm start
```

启动后默认会监听：

- `http://0.0.0.0:9000`，转发到 `https://api.openai.com`
- `http://0.0.0.0:9100`，转发到 `https://api.anthropic.com`

## 使用方法

### 1. OpenAI 接口

把原本发往 OpenAI 的请求改为发到本地代理即可。

示例：

```bash
curl http://localhost:9000/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

如果你在 SDK 里配置基础地址，可以这样写：

```js
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'http://localhost:9000/v1',
});
```

### 2. Anthropic 接口

Anthropic 请求同理，改为走 `9100` 端口。

示例：

```bash
curl http://localhost:9100/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d "{\"model\":\"claude-3-5-sonnet-latest\",\"max_tokens\":64,\"messages\":[{\"role\":\"user\",\"content\":\"hello\"}]}"
```

## 健康检查

可以用下面两个地址检查服务是否启动成功：

- `http://localhost:9000/healthz`
- `http://localhost:9100/healthz`

返回示例：

```json
{
  "name": "OpenAI",
  "status": "ok",
  "target": "https://api.openai.com"
}
```

## 环境变量

可通过环境变量覆盖默认配置：

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `PROXY_HOST` | `0.0.0.0` | 服务监听地址 |
| `PROXY_TIMEOUT_MS` | `30000` | 代理超时时间，单位毫秒 |
| `OPENAI_PROXY_PORT` | `9000` | OpenAI 代理端口 |
| `OPENAI_PROXY_TARGET` | `https://api.openai.com` | OpenAI 上游地址 |
| `ANTHROPIC_PROXY_PORT` | `9100` | Anthropic 代理端口 |
| `ANTHROPIC_PROXY_TARGET` | `https://api.anthropic.com` | Anthropic 上游地址 |

Windows PowerShell 示例：

```powershell
$env:OPENAI_PROXY_PORT="19000"
$env:ANTHROPIC_PROXY_PORT="19100"
npm start
```

## 自检

项目提供了一个最基础的语法检查脚本：

```bash
npm run check
```

## 注意事项

- 这个项目只做转发，不会帮你管理 API Key。
- 调用时仍然需要按上游平台要求传认证头。
- 如果用于公网，请自行增加访问控制，避免把代理直接暴露给未授权用户。
