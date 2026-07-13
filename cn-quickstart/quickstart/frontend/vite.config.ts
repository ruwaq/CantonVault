import { ConfigEnv, defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'
import ViteYaml from '@modyfi/vite-plugin-yaml'
import type { ClientRequest } from 'node:http'


function printWelcomeMessage(): Plugin {
  return {
    name: 'print-welcome-message',
    configureServer(server) {
      const print = () => server.config.logger.info(
        `  \x1b[97mVisit \x1b[96mhttp://app-provider.localhost\x1b[1;96m:${server.config.server.port}\x1b[0m\x1b[97m to start\x1b[0m`
      );
      const http = server.httpServer;
      if (http?.listening) {
        print();
      } else if (http) {
        http.once('listening', print);
      }
    },
  };
}

function setProxyCustomHeaders(proxyOptions: ProxyOptions, forwardedPort: number) {
    proxyOptions.configure = (proxy) => {
        proxy.on('proxyReq', (proxyReq: ClientRequest, req) => {
        // Set custom headers similar to nginx's proxy_set_header
        proxyReq.setHeader('Content-Type', req.headers['content-type'] ?? '')
        proxyReq.setHeader('X-Real-IP', req.socket.remoteAddress ?? '')
        proxyReq.setHeader('X-Forwarded-Host', req.headers['host'] ?? '')
        proxyReq.setHeader('X-Forwarded-For', req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? '')
        proxyReq.setHeader('X-Forwarded-Proto', 'http')
        proxyReq.setHeader('X-Forwarded-Port', String(forwardedPort))
        proxyReq.setHeader('host', 'app-provider.localhost')
    });
    };
}

export default defineConfig(({ mode }: ConfigEnv) => {
    const env = loadEnv(mode, '../');
    const backendPort = env.VITE_BACKEND_PORT || 8080;
    const forwardedPort = Number(env.VITE_FRONTEND_PORT || 5173);

    const apiProxy: ProxyOptions = {
        target: `http://localhost:${backendPort}/`,
        changeOrigin: false,
        rewrite: path => path.replace(/^\/api/, ''),
    };
    setProxyCustomHeaders(apiProxy, forwardedPort);

    const authProxy: ProxyOptions = {
        target: `http://localhost:${backendPort}/`,
        changeOrigin: false,
    };
    setProxyCustomHeaders(authProxy, forwardedPort);

    return {
        plugins: [react(), ViteYaml(), printWelcomeMessage()],
        server: {
            host: 'localhost',
            strictPort: true,
            allowedHosts: ['app-provider.localhost'],
            proxy: {
                '/api': apiProxy,
                '/login': authProxy,
                '/login/oauth2': authProxy,
                '/oauth2': authProxy,
            },
        },
    };
});