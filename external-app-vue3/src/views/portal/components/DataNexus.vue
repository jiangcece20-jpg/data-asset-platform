<script setup lang="ts">
import { ref } from 'vue'
const tiltX = ref(0)
const tiltY = ref(0)
function tilt(event: PointerEvent) {
  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  tiltX.value = -((event.clientY - bounds.top) / bounds.height - .5) * 16
  tiltY.value = ((event.clientX - bounds.left) / bounds.width - .5) * 20
}
</script>

<template>
  <div class="data-nexus" aria-hidden="true" @pointermove="tilt" @pointerleave="tiltX = 0; tiltY = 0" :style="{ '--tilt-x': `${tiltX}deg`, '--tilt-y': `${tiltY}deg` }">
    <svg viewBox="0 0 420 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="nexus-halo"><stop stop-color="#90dfff" stop-opacity=".42"/><stop offset="1" stop-color="#b5e5ff" stop-opacity="0"/></radialGradient>
        <radialGradient id="nexus-glass" cx=".32" cy=".25" r=".85"><stop stop-color="white" stop-opacity=".9"/><stop offset=".5" stop-color="#c8eaff" stop-opacity=".36"/><stop offset=".82" stop-color="#75afea" stop-opacity=".22"/><stop offset="1" stop-color="#c2f4ff" stop-opacity=".7"/></radialGradient>
        <linearGradient id="nexus-rim" x1="162" y1="28" x2="283" y2="150" gradientUnits="userSpaceOnUse"><stop stop-color="#80d4ef"/><stop offset=".4" stop-color="#4489e1" stop-opacity=".3"/><stop offset=".8" stop-color="#5d9ce7"/><stop offset="1" stop-color="#88e6e0"/></linearGradient>
        <linearGradient id="nexus-scan" x2="0" y2="1"><stop stop-color="#71d9f3" stop-opacity="0"/><stop offset="1" stop-color="#6caef0" stop-opacity=".26"/></linearGradient>
        <linearGradient id="nexus-letter" x1="202" y1="63" x2="240" y2="113" gradientUnits="userSpaceOnUse"><stop stop-color="#3487df"/><stop offset="1" stop-color="#69c4d8"/></linearGradient>
        <clipPath id="nexus-clip"><circle cx="220" cy="90" r="60"/></clipPath>
        <filter id="nexus-glow" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="2"/></filter>
      </defs>
      <ellipse cx="220" cy="95" rx="167" ry="84" fill="url(#nexus-halo)"/>
      <g stroke="#789ec9" stroke-opacity=".23" stroke-width=".6">
        <path d="M76 90h28m232 0h28M220 9v10m0 142v10"/>
        <circle cx="220" cy="90" r="75" stroke-dasharray="1 7"/>
      </g>
      <g class="calibration" stroke="#8abbe7" stroke-width="1.1"><circle cx="220" cy="90" r="73" stroke-dasharray="24 90.7"/></g>
      <ellipse cx="220" cy="90" rx="133" ry="30" transform="rotate(-22 220 90)" stroke="#8fc6ed" stroke-opacity=".5" stroke-width=".7"/>
      <ellipse cx="220" cy="90" rx="114" ry="36" transform="rotate(28 220 90)" stroke="#8d9ee5" stroke-opacity=".35" stroke-width=".7"/>
      <g transform="translate(220 90) rotate(-22) scale(1 .226)">
        <g class="satellite satellite-a"><circle cx="133" r="8" fill="#42abf2" opacity=".2" filter="url(#nexus-glow)"/><circle cx="133" r="3.5" fill="#458fe3"/><circle cx="133" r="1.5" fill="white"/></g>
      </g>
      <g transform="translate(220 90) rotate(28) scale(1 .316)">
        <g class="satellite satellite-b"><circle cx="114" r="7" fill="#7e9ff4" opacity=".3" filter="url(#nexus-glow)"/><circle cx="114" r="3" fill="#7495e4"/><circle cx="114" r="1.2" fill="white"/></g>
      </g>
      <g v-for="n in 12" :key="n" class="nexus-spark" :style="{ animationDelay: `${n * -.47}s` }"><circle :cx="95 + ((n * 67) % 257)" :cy="22 + ((n * 37) % 136)" :r="n % 3 === 0 ? 1.4 : .7" fill="#6caae7"/></g>
      <g stroke="#a0bddd" stroke-width=".5"><path d="m169 54-31-15h-38m171 84 25 18h34"/><circle cx="169" cy="54" r="1.7" fill="#83b8e9"/><circle cx="271" cy="123" r="1.7" fill="#83b8e9"/></g>
      <g font-family="ui-monospace,monospace" font-size="5.5" letter-spacing="1" fill="#718eac"><text x="101" y="33">INTELLIGENCE CORE</text><text x="294" y="152">SECURE LINK</text></g>
      <g transform="translate(327 24)"><circle r="2" fill="#65b8c2" class="status-pulse"/><text x="7" y="2" fill="#7397ae" font-family="ui-monospace,monospace" font-size="5" letter-spacing="1">CONNECTED</text></g>
    </svg>
    <div class="nexus-floor"></div>
    <div class="nexus-scene">
      <div class="nexus-tilt">
        <div class="glass-volume"></div>
        <div class="globe-rotation">
          <i v-for="n in 10" :key="`meridian-${n}`" class="meridian-3d" :style="{ transform: `rotateY(${n * 18}deg)` }"></i>
          <i v-for="y in [-.75, -.5, -.25, 0, .25, .5, .75]" :key="y" class="latitude-3d" :style="{ width: `${Math.sqrt(1 - y*y) * 100}%`, height: `${Math.sqrt(1 - y*y) * 100}%`, transform: `translate(-50%, -50%) translateY(${y * 50}cqw) rotateX(90deg)` }"></i>
          <span v-for="(point, n) in [[15, 30], [65, 110], [-35, 200], [20, 280]]" :key="n" class="surface-beacon" :style="{ transform: `rotateY(${point[1]}deg) rotateX(${point[0]}deg) translateZ(50cqw)` }"></span>
        </div>
        <div class="nexus-core-3d">D<small>DATA NEXUS</small></div>
        <div class="glass-reflection"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.data-nexus { position: absolute; width: 350px; height: 150px; right: -12px; top: -5px; pointer-events: auto; }
svg { pointer-events: none; width: 100%; height: 100%; overflow: visible; }
.calibration { transform-origin: 220px 90px; animation: calibrate 45s linear infinite; }
.globe-float { animation: globe-hover 7s ease-in-out infinite; }
.mesh-turn { transform-origin: 220px 90px; animation: mesh-roll 22s linear infinite; }
.globe-scan { animation: scan-pass 5.5s ease-in-out infinite; }
.satellite { animation: orbit-loop 11s linear infinite; }.satellite-b { animation-duration: 17s; animation-direction: reverse; }
.nexus-spark { animation: spark 4s ease-in-out infinite; }.status-pulse { animation: spark 3s ease-in-out infinite; }
@keyframes orbit-loop { to { transform: rotate(360deg); } }
@keyframes calibrate { to { transform: rotate(-360deg); } }
@keyframes globe-hover { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes mesh-roll { to { transform: rotate(360deg); } }
@keyframes scan-pass { 0% { transform: translateY(-28px); opacity: 0; } 15%,75% { opacity: 1; } 100% { transform: translateY(130px); opacity: 0; } }
@keyframes spark { 0%,100% { opacity: .25; } 50% { opacity: .9; } }
/* A rotating wire sphere in actual CSS 3D space; lighting stays fixed. */
.nexus-scene { position: absolute; left: 52.38%; top: 50%; width: 28.57%; aspect-ratio: 1; transform: translate(-50%,-50%); perspective: 650px; container-type: inline-size; }
.nexus-tilt { position: absolute; inset: 0; transform-style: preserve-3d; transform: rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg)); transition: transform .35s ease-out; }
.glass-volume { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(ellipse at 29% 22%,#ffffffeb 0%,#dffaff66 20%,#a3d9f329 46%,#4f8ee32b 76%,#d5faff99 100%); border: 1px solid #87b8e48c; box-shadow: inset 7px 5px 12px #ffffffd9,inset -9px -7px 18px #487dc340,inset -2px -2px 4px #3f83d45c,0 0 20px #86c6f226; }
.globe-rotation { position: absolute; inset: 0; transform-style: preserve-3d; animation: globe-spin-3d 24s linear infinite; }
.meridian-3d { position: absolute; inset: 0; border-radius: 50%; border: .65px solid #467fb665; backface-visibility: visible; }
.latitude-3d { position: absolute; left: 50%; top: 50%; border: .65px solid #4c99bc70; border-radius: 50%; transform-style: preserve-3d; }
.surface-beacon { position: absolute; width: 3px; height: 3px; left: calc(50% - 1.5px); top: calc(50% - 1.5px); border-radius: 50%; background: #ebfbff; box-shadow: 0 0 0 1px #4b99dd,0 0 6px #419bed; backface-visibility: hidden; }
.nexus-core-3d { position: absolute; inset: 0; transform: translateZ(16px); display: flex; align-items: center; justify-content: center; flex-direction: column; font: italic 39px Georgia,serif; color: #3a8bd0; text-shadow: 1px 2px 0 #e3f9ff,0 4px 8px #3b76af35; }
.nexus-core-3d small { font: 4px ui-monospace,monospace; letter-spacing: 1.5px; margin-top: 2px; color: #4d82a8; }
.glass-reflection { position: absolute; inset: 0; border-radius: 50%; transform: translateZ(28px); background: radial-gradient(ellipse 30% 14% at 31% 21%,#ffffffd9,transparent 100%),radial-gradient(ellipse 12% 40% at 90% 62%,#c5f7ff66,transparent 100%); box-shadow: inset 1px 1px 1px #ffffffd9; pointer-events: none; }
.nexus-floor { position: absolute; width: 27%; height: 8%; left: 39%; top: 88%; border-radius: 50%; background: radial-gradient(ellipse,#6194d537,transparent 70%); filter: blur(3px); animation: floor-breathe 7s ease-in-out infinite; }
.data-nexus:hover .glass-volume { box-shadow: inset 7px 5px 12px #fffffff0,inset -9px -7px 18px #487dc350,0 0 24px #77c3f542; }
@keyframes globe-spin-3d { from { transform: rotateZ(-14deg) rotateX(-16deg) rotateY(0deg); } to { transform: rotateZ(-14deg) rotateX(-16deg) rotateY(360deg); } }
@keyframes floor-breathe { 0%,100% { opacity: .6; transform: scaleX(.9); } 50% { opacity: 1; transform: scaleX(1.08); } }
@media (max-width: 760px) { .data-nexus { width: 260px; right: -36px; opacity: .5; } }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; }.nexus-tilt { transform: none; } }
</style>
