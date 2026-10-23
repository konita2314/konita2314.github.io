<!-- 首页：原 HomePage.tsx 迁移（framer 双重动画已删，CSS fadeInUp 保留） -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { preloadAvatar } from '@/utils/avatar'

// 主页挂载后：等首屏 load 完成，空闲时预加载关于页头像，
// 这样点开关于页立刻就有头像，不用等网络（失败会退避重试）
onMounted(preloadAvatar)
</script>

<template>
  <section id="home" class="hero">
    <div class="container">
      <div class="hero-content">
        <h1 class="hero-title">你好！</h1>
        <h1 class="hero-title">我是Konita！</h1>
        <p class="hero-subtitle">欢迎来到我的个人主页！</p>
        <div class="hero-buttons">
          <RouterLink to="/tools" class="btn btn-primary">🛠️ 小工具</RouterLink>
          <RouterLink to="/blog" class="btn btn-secondary">📝 博客</RouterLink>
          <RouterLink to="/about" class="btn btn-secondary">👤 关于我</RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>
