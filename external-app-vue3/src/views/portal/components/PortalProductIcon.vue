<script setup lang="ts">
import { computed, getCurrentInstance } from 'vue'
import type { ProductType } from '@/types/domain'
const props = withDefaults(defineProps<{ type: ProductType | 'view'; size?: number }>(), { size: 38 })
const id = `portal-product-icon-${getCurrentInstance()!.uid}`
const tones = {
  dataset: ['#1677ff', '#75baff', '#edf5ff'],
  api: ['#009cc8', '#6bddf4', '#edfbff'],
  report: ['#8b4de8', '#c6a2ff', '#f7f0ff'],
  dashboard: ['#5058e8', '#a2adff', '#f0f2ff'],
  view: ['#397cce', '#91c9fa', '#eef7ff']
}
const tone = computed(() => tones[props.type])
</script>

<template>
  <span class="portal-product-icon" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient :id="`${id}-base`" x1="5" y1="3" x2="43" y2="47" gradientUnits="userSpaceOnUse"><stop stop-color="white"/><stop offset="1" :stop-color="tone[2]"/></linearGradient>
        <linearGradient :id="`${id}-glass`" x1="14" y1="10" x2="35" y2="37" gradientUnits="userSpaceOnUse"><stop stop-color="white"/><stop offset=".3" :stop-color="tone[1]" stop-opacity=".65"/><stop offset="1" :stop-color="tone[0]" stop-opacity=".8"/></linearGradient>
        <linearGradient :id="`${id}-edge`" x1="10" y1="10" x2="38" y2="40" gradientUnits="userSpaceOnUse"><stop :stop-color="tone[1]"/><stop offset="1" :stop-color="tone[0]"/></linearGradient>
      </defs>
      <rect x=".5" y=".5" width="47" height="47" rx="12" :fill="`url(#${id}-base)`" :stroke="tone[1]" stroke-opacity=".35"/>
      <path d="M9 2h25" stroke="white" stroke-linecap="round"/>
      <ellipse cx="25" cy="38" rx="12" ry="3" :fill="tone[0]" opacity=".08"/>
      <g class="icon-object" stroke-linejoin="round" stroke-linecap="round">
        <template v-if="type === 'dataset'">
          <path d="m11 28 13-6 13 6v6l-13 6-13-6z" :fill="`url(#${id}-glass)`" :stroke="tone[0]" stroke-opacity=".6" stroke-width=".8"/>
          <path d="m11 28 13 6 13-6M24 34v6" :stroke="tone[0]" stroke-opacity=".45" stroke-width=".8"/>
          <path d="m11 20 13-6 13 6v6l-13 6-13-6z" :fill="`url(#${id}-glass)`" :stroke="tone[0]" stroke-opacity=".6" stroke-width=".8"/>
          <path d="m11 20 13 6 13-6M24 26v6" :stroke="tone[0]" stroke-opacity=".45" stroke-width=".8"/>
          <path d="m11 14 13-6 13 6-13 6z" :fill="tone[2]" :stroke="`url(#${id}-edge)`" stroke-width=".9"/>
          <path d="m18 14 6-2.7 6 2.7-6 2.7z" :fill="tone[1]"/>
          <path d="m15 24 4 1.8m-4 7 4 1.8" stroke="white" stroke-width="1.4"/>
        </template>
        <template v-else-if="type === 'api'">
          <path d="m15 16 18 2-9 15z" :fill="tone[1]" fill-opacity=".22" :stroke="tone[0]" stroke-width="1.1" stroke-dasharray="2 2"/>
          <path d="m18 23 5 3 6-3" :stroke="tone[0]" stroke-width="1.3"/>
          <g v-for="(point,n) in [[14,15],[34,17],[24,34]]" :key="n">
            <path :d="`M${point[0]-5} ${point[1]-3}l5-3 5 3v6l-5 3-5-3z`" :fill="`url(#${id}-glass)`" :stroke="tone[0]" stroke-width=".8"/>
            <path :d="`M${point[0]-5} ${point[1]-3}l5 3 5-3m-5 3v6`" stroke="white" stroke-opacity=".9" stroke-width=".8"/>
          </g>
          <circle cx="24" cy="22" r="2" fill="white" :stroke="tone[0]" stroke-width=".8"/>
        </template>
        <template v-else-if="type === 'report'">
          <path d="m16 12 17-2 3 26-17 3z" :fill="tone[1]" fill-opacity=".5"/>
          <path d="M13 9h15l6 6v23H13z" :fill="`url(#${id}-glass)`" :stroke="tone[0]" stroke-width=".9"/>
          <path d="M28 9v6h6" fill="white" fill-opacity=".8" :stroke="tone[0]" stroke-width=".8"/>
          <path d="M18 19h7m-7 4h11m-11 4h11m-11 4h6" :stroke="tone[0]" stroke-width="1.1"/>
          <rect x="27" y="29" width="9" height="9" rx="3" :fill="tone[2]" stroke="white"/>
          <path d="m29.5 33.5 1.5 1.5 2.5-3" :stroke="tone[0]" stroke-width="1.2"/>
        </template>
        <template v-else>
          <path d="m12 13 25 3-2 22-25-3z" :fill="tone[1]" fill-opacity=".3"/>
          <rect x="10" y="10" width="28" height="25" rx="4" :fill="`url(#${id}-glass)`" :stroke="tone[0]" stroke-width=".9"/>
          <path d="M10 16h28" stroke="white" stroke-width="1"/>
          <circle cx="14" cy="13" r=".8" :fill="tone[0]"/><circle cx="17" cy="13" r=".8" :fill="tone[0]" opacity=".4"/>
          <path d="M24 35v4m-6 0h12" :stroke="tone[0]" stroke-width="1.2"/>
          <rect x="15" y="25" width="3" height="6" rx=".8" :fill="tone[0]" opacity=".45"/><rect x="21" y="21" width="3" height="10" rx=".8" :fill="tone[0]" opacity=".7"/><rect x="27" y="23" width="3" height="8" rx=".8" :fill="tone[0]"/>
          <path d="m15 23 7-5 7 2 5-3" stroke="white" stroke-width="1.2"/>
        </template>
      </g>
      <path d="M38 8v4m-2-2h4" :stroke="tone[0]" stroke-opacity=".3" stroke-width=".7"/>
    </svg>
  </span>
</template>

<style scoped>
.portal-product-icon { display: inline-flex; flex-shrink: 0; border-radius: 12px; filter: drop-shadow(0 2px 2px #41699409); }
svg { width: 100%; height: 100%; overflow: visible; }
.icon-object { transform-origin: 24px 25px; transition: transform .35s ease; }
:global(.market-card:hover) .icon-object { transform: translateY(-1px) rotate(-3deg); }
@media (prefers-reduced-motion: reduce) { .icon-object { transition: none; transform: none !important; } }
</style>
