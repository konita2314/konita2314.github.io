import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './index.css'
// 代码高亮主题（原站同样从 highlight.js 导入）
import 'highlight.js/styles/github.css'

// 挂载顺序必须是 pinia → router → mount：
// router.afterEach 里调 settings.recordVisit 读 store，pinia 未先安装时
// initial navigation 首触发会报 "no active pinia"
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
