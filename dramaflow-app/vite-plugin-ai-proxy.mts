import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * 开发环境 AI 转发代理。
 *
 * 阿里云百炼等服务的接口不返回跨域（CORS）放行头，浏览器直连会被拦截，
 * 表现为「网络连接失败」。这里把 AI 请求转发到同源路径，由 Vite 开发服务器
 * 在 Node 侧代替浏览器请求上游，从而绕开 CORS 限制。
 */
export const AI_PROXY_PATH = '/__dramaflow-ai-proxy';

async function forward(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const queryUrl = new URL(req.url || '', 'http://localhost').searchParams.get('url');
    if (!queryUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '缺少 url 参数' }));
      return;
    }
    const target = new URL(queryUrl);
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '仅支持 http/https 目标' }));
      return;
    }

    // 收集请求体
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = Buffer.concat(chunks);

    // 转发请求头（去掉连接层相关头，交由 Node fetch 重新处理）
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      const lower = key.toLowerCase();
      if (
        ['host', 'origin', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding'].includes(lower)
      ) {
        continue;
      }
      headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }

    const isBodyless = req.method === 'GET' || req.method === 'HEAD';
    const upstream = await fetch(target, {
      method: req.method,
      headers,
      body: isBodyless ? undefined : body,
    });

    // 回传上游响应（去掉会干扰响应的编码/连接头）
    const respHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (['content-encoding', 'transfer-encoding', 'connection'].includes(lower)) return;
      respHeaders[key] = value;
    });

    res.writeHead(upstream.status, respHeaders);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    console.error('[DramaFlow AI 代理] 转发失败:', err);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
  }
}

export function aiProxyPlugin(): Plugin {
  return {
    name: 'dramaflow-ai-proxy',
    configureServer(server) {
      server.middlewares.use(AI_PROXY_PATH, forward);
    },
  };
}
