<!-- 首页：原 HomePage.tsx 迁移（framer 双重动画已删，CSS fadeInUp 保留） -->
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
