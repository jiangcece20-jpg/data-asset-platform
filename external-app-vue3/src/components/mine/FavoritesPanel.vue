<script setup lang="ts">
import { computed } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import { typeMeta } from '@/utils/productMeta'
import { productPriceSummary } from '@/domain/productPriceSummary'

const catalog = useCatalogStore()
const favorites = computed(() => catalog.products.filter(product => product.favorite))
</script>

<template>
  <div class="favorites-panel">
    <p class="favorite-count">共 {{ favorites.length }} 件收藏商品</p>
    <div v-if="!favorites.length" class="favorite-empty">
      <span aria-hidden="true">☆</span><h2>还没有收藏商品</h2>
      <p>收藏感兴趣的数据商品，方便下次查找。</p>
      <router-link to="/portal/search">去找数买数</router-link>
    </div>
    <article v-for="product in favorites" :key="product.id" class="favorite-item">
      <div class="favorite-info">
        <span class="favorite-type">{{ typeMeta[product.type].label }}</span>
        <router-link :to="`/portal/product/${product.id}`" class="favorite-title">{{ product.name }}</router-link>
        <p>{{ product.subtitle }}</p>
        <small>{{ product.provider }}</small>
        <p v-if="product.availability !== 'published'">该商品当前不可购买，可查看详情了解状态。</p>
      </div>
      <div class="favorite-actions">
        <strong>{{ productPriceSummary(product).text }}<small>{{ productPriceSummary(product).suffix }}</small></strong>
        <router-link :to="`/portal/product/${product.id}`">查看详情 ↗</router-link>
        <button type="button" :aria-label="`取消收藏${product.name}`" @click="catalog.toggleFavorite(product.id)">★ 取消收藏</button>
      </div>
    </article>
  </div>
</template>

<style scoped>
.favorite-count{margin:0 0 16px;color:#66788f;font-size:13px}.favorite-empty{background:#fff;border:1px solid #e3eaf2;border-radius:12px;padding:64px 24px;text-align:center}.favorite-empty>span{font-size:44px;color:#1677ff}.favorite-empty h2{font-size:18px;color:#16263d;margin:12px 0}.favorite-empty p{color:#66788f;font-size:14px}.favorite-empty a{display:inline-block;margin-top:24px;padding:10px 22px;background:#1677ff;color:white;border-radius:7px}.favorite-item{display:flex;gap:24px;justify-content:space-between;padding:24px;background:#fff;border:1px solid #e3eaf2;border-radius:10px;margin-bottom:14px}.favorite-info{min-width:0}.favorite-type{display:inline-block;font-size:11px;padding:3px 8px;background:#edf5ff;color:#1677ff;border-radius:4px;margin-bottom:10px}.favorite-title{display:block;font-size:16px;font-weight:600;color:#16263d;overflow-wrap:anywhere}.favorite-info p{font-size:13px;line-height:1.7;color:#66788f;margin:8px 0}.favorite-info small{font-size:12px;color:#8494a7}.favorite-actions{display:flex;flex-direction:column;align-items:flex-end;gap:12px;flex-shrink:0}.favorite-actions strong{color:#1677ff;font-size:18px}.favorite-actions strong small{font-size:12px;font-weight:400}.favorite-actions a,.favorite-actions button{font-size:13px;color:#1677ff}.favorite-actions a{padding:7px 12px;border:1px solid #e3eaf2;border-radius:7px}.favorite-actions button{padding:6px}.favorite-actions button:hover{background:#edf5ff;border-radius:5px}
</style>
