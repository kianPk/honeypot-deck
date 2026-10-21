import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { randomUUID } from 'crypto'

const PORT = process.env.PORT || 8822
const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: '*' } })

const SERVICES = [
  { id: 'ssh-22', name: 'SSH decoy', port: 22 },
  { id: 'http-80', name: 'HTTP lure', port: 80 },
  { id: 'rdp-3389', name: 'RDP trap', port: 3389 },
  { id: 'mysql-3306', name: 'MySQL bait', port: 3306 },
]

const events = []
const COUNTRIES = ['IR', 'DE', 'NL', 'US', 'RU', 'CN', 'BR', 'SG']
const ACTORS = ['scan-bot', 'cred-spray', 'worm-like', 'manual', 'unknown']

function pushEvent() {
  const svc = SERVICES[Math.floor(Math.random() * SERVICES.length)]
  const ev = {
    id: randomUUID().slice(0, 10),
    serviceId: svc.id,
    service: svc.name,
    port: svc.port,
    srcIp: `${20 + Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
    actor: ACTORS[Math.floor(Math.random() * ACTORS.length)],
    detail:
      svc.port === 22
        ? `auth failure user=${['root', 'admin', 'ubuntu', 'oracle'][Math.floor(Math.random() * 4)]}`
        : svc.port === 80
          ? `GET ${['/wp-login.php', '/.env', '/admin', '/vendor/phpunit'][Math.floor(Math.random() * 4)]} 404`
          : svc.port === 3389
            ? 'RDP negotiation then disconnect'
            : 'MySQL handshake probe',
    severity: Math.random() > 0.85 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
    at: Date.now(),
  }
  events.unshift(ev)
  if (events.length > 200) events.pop()
  io.emit('event', ev)
  return ev
}

for (let i = 0; i < 30; i++) {
  const e = pushEvent()
  e.at = Date.now() - (30 - i) * 20_000
}

setInterval(() => {
  if (Math.random() > 0.35) pushEvent()
}, 2200)

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'honeypot-deck' }))
app.get('/api/services', (_req, res) => {
  res.json({
    services: SERVICES.map((s) => ({
      ...s,
      hits: events.filter((e) => e.serviceId === s.id).length,
      lastAt: events.find((e) => e.serviceId === s.id)?.at || null,
    })),
  })
})
app.get('/api/events', (_req, res) => res.json({ events: events.slice(0, 80) }))
app.get('/api/overview', (_req, res) => {
  res.json({
    events: events.length,
    high: events.filter((e) => e.severity === 'high').length,
    services: SERVICES.length,
    countries: [...new Set(events.map((e) => e.country))].length,
  })
})

io.on('connection', (socket) => {
  socket.emit('hello', { services: SERVICES.length })
})

httpServer.listen(PORT, () => console.log(`honeypot-deck on :${PORT}`))
