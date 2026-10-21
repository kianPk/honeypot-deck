<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { io } from 'socket.io-client'

const SERVICES = [
  { id: 'ssh-22', name: 'SSH decoy', port: 22 },
  { id: 'http-80', name: 'HTTP lure', port: 80 },
  { id: 'rdp-3389', name: 'RDP trap', port: 3389 },
  { id: 'mysql-3306', name: 'MySQL bait', port: 3306 },
]
const COUNTRIES = ['IR', 'DE', 'NL', 'US', 'RU', 'CN', 'BR', 'SG']
const ACTORS = ['scan-bot', 'cred-spray', 'worm-like', 'manual', 'unknown']

const events = ref([])
const mode = ref('sim')
const paused = ref(false)
let socket = null
let timer = null

function makeEvent() {
  const svc = SERVICES[Math.floor(Math.random() * SERVICES.length)]
  return {
    id: Math.random().toString(36).slice(2, 10),
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
}

function push(ev) {
  events.value = [ev, ...events.value].slice(0, 80)
}

const overview = computed(() => ({
  events: events.value.length,
  high: events.value.filter((e) => e.severity === 'high').length,
  countries: new Set(events.value.map((e) => e.country)).size,
}))

const serviceStats = computed(() =>
  SERVICES.map((s) => ({
    ...s,
    hits: events.value.filter((e) => e.serviceId === s.id).length,
  })),
)

function startSim() {
  mode.value = 'sim'
  if (!events.value.length) {
    for (let i = 0; i < 24; i++) {
      const e = makeEvent()
      e.at = Date.now() - (24 - i) * 15000
      push(e)
    }
  }
  timer = setInterval(() => {
    if (!paused.value && Math.random() > 0.3) push(makeEvent())
  }, 1800)
}

function tryLive() {
  socket = io(undefined, { transports: ['websocket', 'polling'], timeout: 2500 })
  socket.on('connect', () => {
    mode.value = 'live'
    if (timer) clearInterval(timer)
  })
  socket.on('event', (ev) => {
    if (!paused.value) push(ev)
  })
  socket.on('connect_error', () => {
    socket.disconnect()
    socket = null
    startSim()
  })
}

onMounted(() => {
  startSim()
  tryLive()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (socket) socket.disconnect()
})

function ago(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return s + 's'
  return Math.floor(s / 60) + 'm'
}
</script>

<template>
  <div class="shell">
    <header>
      <div class="brand">
        <div class="pot" aria-hidden="true" />
        <div>
          <h1>Honeypot Deck</h1>
          <p>Decoy services · live attack stream · actor tags</p>
        </div>
      </div>
      <div class="controls">
        <span class="mode" :data-m="mode">{{ mode === 'live' ? 'LIVE FEED' : 'SIM FEED' }}</span>
        <button type="button" @click="paused = !paused">{{ paused ? 'Resume' : 'Pause' }}</button>
      </div>
    </header>

    <section class="kpis">
      <div><b>{{ overview.events }}</b><span>Events</span></div>
      <div class="hot"><b>{{ overview.high }}</b><span>High</span></div>
      <div><b>{{ overview.countries }}</b><span>Countries</span></div>
      <div><b>{{ SERVICES.length }}</b><span>Decoys</span></div>
    </section>

    <div class="layout">
      <section class="panel stream">
        <h2>Attack stream</h2>
        <div class="feed">
          <article v-for="e in events" :key="e.id" :data-s="e.severity">
            <time>{{ ago(e.at) }}</time>
            <em>{{ e.severity }}</em>
            <code>{{ e.srcIp }}</code>
            <span class="cc">{{ e.country }}</span>
            <strong>{{ e.service }}:{{ e.port }}</strong>
            <small>{{ e.actor }} · {{ e.detail }}</small>
          </article>
        </div>
      </section>

      <aside class="panel">
        <h2>Decoy services</h2>
        <div v-for="s in serviceStats" :key="s.id" class="svc">
          <div>
            <strong>{{ s.name }}</strong>
            <small>port {{ s.port }}</small>
          </div>
          <b>{{ s.hits }}</b>
          <i :style="{ width: Math.min(100, s.hits * 4) + '%' }" />
        </div>
        <p class="note">Defensive honeypot console — simulated probes for the Pages demo; Socket.IO live when the Node server runs.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.shell { min-height: 100vh; padding: 18px clamp(14px, 3vw, 28px) 28px; display: grid; gap: 14px; }
header { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; align-items: center; animation: rise .4s ease; }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.brand { display: flex; gap: 12px; align-items: center; }
.pot {
  width: 46px; height: 46px; border-radius: 12px; border: 1px solid rgba(184,255,61,.35);
  background:
    radial-gradient(circle at 50% 30%, rgba(184,255,61,.35), transparent 50%),
    #141a0e;
  position: relative;
}
.pot::after {
  content: ''; position: absolute; left: 50%; bottom: 10px; width: 18px; height: 14px;
  border: 2px solid var(--acid); border-top: none; border-radius: 0 0 10px 10px;
  transform: translateX(-50%);
}
h1 { margin: 0; font-size: 1.55rem; letter-spacing: .04em; text-transform: uppercase; }
.brand p { margin: 2px 0 0; color: var(--muted); font-size: .95rem; }
.controls { display: flex; gap: 8px; align-items: center; }
.mode {
  font-family: var(--mono); font-size: .72rem; letter-spacing: .08em;
  padding: 7px 10px; border-radius: 999px; border: 1px solid var(--line); color: var(--muted);
}
.mode[data-m='live'] { color: var(--acid); border-color: rgba(184,255,61,.4); }
.controls button {
  padding: 8px 12px; border-radius: 999px; border: 1px solid var(--line); font-weight: 600;
}
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.kpis > div { padding: 12px 14px; border-radius: 12px; background: var(--panel); border: 1px solid var(--line); }
.kpis b { display: block; font-family: var(--mono); font-size: 1.3rem; }
.kpis span { color: var(--faint); font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; }
.kpis .hot b { color: var(--hot); }
.layout { display: grid; grid-template-columns: 1.4fr .8fr; gap: 12px; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 14px; }
h2 { margin: 0 0 12px; font-size: 1rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); }
.feed { display: grid; gap: 6px; max-height: 560px; overflow: auto; }
.feed article {
  display: grid; grid-template-columns: 42px 56px 1.1fr 36px 1fr; gap: 8px; align-items: start;
  padding: 10px; border-radius: 10px; border: 1px solid transparent; background: #0c1008;
  animation: flash .45s ease;
}
@keyframes flash { from { background: rgba(184,255,61,.12); } to { background: #0c1008; } }
.feed article[data-s='high'] { border-color: rgba(255,90,74,.35); }
.feed article[data-s='medium'] { border-color: rgba(255,193,74,.2); }
.feed time, .feed code, .feed .cc, .feed em { font-family: var(--mono); font-size: .72rem; }
.feed time { color: var(--faint); }
.feed em { font-style: normal; text-transform: uppercase; color: var(--warn); }
.feed article[data-s='high'] em { color: var(--hot); }
.feed article[data-s='low'] em { color: var(--acid); }
.feed code { color: var(--acid); }
.feed .cc { color: var(--muted); }
.feed strong { font-size: .95rem; }
.feed small {
  grid-column: 2 / -1; color: var(--muted); font-family: var(--mono); font-size: .72rem;
}
.svc { position: relative; display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(42,51,32,.8); }
.svc strong { display: block; font-size: 1.05rem; }
.svc small { color: var(--faint); font-family: var(--mono); font-size: .75rem; }
.svc b { font-family: var(--mono); color: var(--acid); }
.svc i {
  position: absolute; left: 0; bottom: 0; height: 2px;
  background: linear-gradient(90deg, var(--acid), transparent);
}
.note { margin: 16px 0 0; color: var(--faint); font-size: .82rem; line-height: 1.45; }
@media (max-width: 900px) {
  .layout, .kpis { grid-template-columns: 1fr 1fr; }
  .layout { grid-template-columns: 1fr; }
  .feed article { grid-template-columns: 40px 50px 1fr; }
  .feed .cc, .feed strong { display: none; }
}
</style>
