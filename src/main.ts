import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
// 自托管字体：woff2 由 Vite 打包、带内容指纹，从本站域名加载，不产生第三方请求。
// 三族都靠 unicode-range 切成大量分片，浏览器只为页面实际出现的字形下载对应分片，
// 首屏通常只拉几个几十 KB 的文件，而不是整个字体。
import '@fontsource-variable/inter' // family: 'Inter Variable'（100 900 可变字重）
import '@fontsource-variable/noto-sans-sc' // family: 'Noto Sans SC Variable'（101 分片）
import '@automann/maple-mono-cn/400.css' // family: 'Maple Mono CN'（239 分片）
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
