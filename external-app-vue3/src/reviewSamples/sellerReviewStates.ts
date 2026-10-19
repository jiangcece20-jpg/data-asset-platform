import { createApp } from 'vue'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import App from '@/App.vue'
import router from '@/router'
import { createSellerReviewSamplePinia } from '@/data/sellerReviewSamples'
import '@/style.css'

const app = createApp(App)
app.use(createSellerReviewSamplePinia())
app.use(router)
app.use(ArcoVue)
router.isReady().then(() => app.mount('#app'))
