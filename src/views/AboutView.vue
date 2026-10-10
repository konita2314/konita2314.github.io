<!-- 关于页：原 AboutPage.tsx 迁移（头像静态化，inline style 转 CSS 类，暗色走 html.dark-mode） -->
<template>
  <section class="about-page">
    <div class="container">
      <div class="about-container">
        <!-- 头像：静态 URL，删除原 fetch/loading 流程 -->
        <div class="avatar-section">
          <img
            class="avatar-img"
            src="https://github.com/konita2314.png"
            alt="Konita's GitHub Avatar"
            width="180"
            height="180"
          />
          <div class="about-heading">
            <h1 class="about-name">Konita</h1>
            <p class="about-tagline">-让世界再次可爱-</p>
            <p class="about-desc">热爱编程、设计和创造的开发者</p>
          </div>
        </div>

        <!-- 个人简介 -->
        <div class="about-card">
          <p>你好，我是Konita！</p>
          <p>
            我是一名热爱编程、设计和创造的开发者。我喜欢构建实用的工具和有趣的项目，希望通过技术让世界变得更加美好。
          </p>
          <p>
            这个网站是我的个人空间，用于分享我的作品、想法和知识。我相信技术的力量可以解决很多问题，也希望我的分享能给你带来启发。
          </p>
        </div>

        <!-- 联系方式 -->
        <div class="contact-section">
          <h3 class="contact-title">联系我</h3>
          <div class="contact-buttons">
            <a href="mailto:konita@163.com" class="btn btn-primary">📧 发送邮件</a>
            <a
              href="https://github.com/konita2314"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondary"
            >
              🐙 GitHub
            </a>
            <RouterLink to="/" class="btn btn-secondary">🏠 返回首页</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
