import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createAllowedClientList, isAllowedClientIp } from './server/networkAccess.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const apiPort = Number(env.API_PORT || 8787)
  const allowedClientIps = createAllowedClientList(env.FARM_ALLOWED_CLIENT_CIDRS)

  return {
    plugins: [
      react(),
      {
        name: 'farmops-client-network-restriction',
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            if (isAllowedClientIp(request.socket.remoteAddress, allowedClientIps)) {
              next()
              return
            }
            response.statusCode = 403
            response.setHeader('Content-Type', 'text/plain; charset=utf-8')
            response.end('NSA Farmops is available only on the NSA-Farms-Central Wi-Fi network.')
          })
        },
      },
    ],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': `http://localhost:${apiPort}`,
      },
    },
  }
})
