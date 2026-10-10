import { createRouter, createWebHistory } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // 页面切换重置回顶部，前进/后退恢复保存位置
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '首页' },
    },
    {
      path: '/tools',
      name: 'tools',
      component: () => import('@/views/ToolsView.vue'),
      meta: { title: '工具' },
    },
    {
      path: '/tools/clock',
      name: 'clock',
      component: () => import('@/views/tools/ClockView.vue'),
      meta: { title: '时钟' },
    },
    {
      path: '/tools/maimai',
      name: 'maimai',
      component: () => import('@/views/tools/MaimaiView.vue'),
      meta: { title: '舞萌 DX 查分' },
    },
    {
      path: '/blog',
      name: 'blog',
      component: () => import('@/views/BlogView.vue'),
      meta: { title: '博客' },
    },
    {
      // 数字限定：/blog/abc 不会误入文章页
      path: '/blog/:id(\\d+)',
      name: 'blog-post',
      component: () => import('@/views/blog/BlogPostView.vue'),
      meta: { title: '博客' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
      meta: { title: '关于' },
    },
    {
      // 兜底 404（修复原 `*` 渲染首页）
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: '404' },
    },
  ],
})

router.afterEach((to) => {
  const settings = useSettingsStore()
  settings.recordVisit(to.path)
  document.title = `${to.meta.title ?? ''} | Konita`
})

export default router
