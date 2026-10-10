<!-- 工具页：原 ToolsPage.tsx 迁移（编辑器卡片已移除，仅时钟 + 舞萌） -->
<template>
  <section class="tools-page">
    <div class="container">
      <h2 class="section-title">工具页</h2>

      <div class="tools-grid">
        <div class="tool-card">
          <div class="tool-icon">🕰️</div>
          <h3 class="tool-title">桌面时钟</h3>
          <p class="tool-description">显示当前时间、日期和农历，支持全屏功能。</p>
          <div class="tool-link">
            <RouterLink to="/tools/clock">立即使用 🕰️</RouterLink>
          </div>
        </div>

        <div class="tool-card">
          <div class="tool-icon">📱</div>
          <h3 class="tool-title">舞萌查分器</h3>
          <p class="tool-description">查询舞萌 DX 单曲成绩，计算 Rating 与 B50。</p>
          <div class="tool-link">
            <RouterLink to="/tools/maimai">立即使用 📱</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
