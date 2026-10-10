<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from '@/composables/useI18n'

const settings = useSettingsStore()
const { t } = useI18n()

const scrolled = ref(false)
let ticking = false

function updateScrolled() {
  const over = window.scrollY > 50
  if (over !== scrolled.value) scrolled.value = over
  ticking = false
}

function onScroll() {
  // rAF 节流：事件到达时只排一帧，跨过 50px 阈值才更新（消灭原无限 rAF 循环）
  if (!ticking) {
    ticking = true
    requestAnimationFrame(updateScrolled)
  }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  updateScrolled()
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <nav :class="['navbar', { scrolled }]">
    <div class="container navbar-container">
      <RouterLink to="/" class="logo">Konita</RouterLink>
      <div class="nav-actions">
        <ul class="nav-links">
          <li>
            <RouterLink to="/" class="nav-link" active-class="" exact-active-class="active">
              {{ t('nav.home') }}
            </RouterLink>
          </li>
          <li>
            <RouterLink to="/tools" class="nav-link" active-class="active">{{ t('nav.tools') }}</RouterLink>
          </li>
          <li>
            <RouterLink to="/blog" class="nav-link" active-class="active">{{ t('nav.blog') }}</RouterLink>
          </li>
          <li>
            <RouterLink to="/about" class="nav-link" active-class="active">{{ t('nav.about') }}</RouterLink>
          </li>
        </ul>
        <button
          class="theme-toggle"
          :aria-label="settings.darkMode ? t('theme.toLight') : t('theme.toDark')"
          @click="settings.toggleDarkMode()"
        >
          {{ settings.darkMode ? '☀️' : '🌙' }}
        </button>
        <button class="sidebar-toggle" :aria-label="t('nav.drawer')" @click="settings.isDrawerOpen = true">
          ☰
        </button>
        <button class="right-sidebar-toggle" aria-label="打开功能面板" @click="settings.isPanelOpen = true">
          ⚙️
        </button>
      </div>
    </div>
  </nav>
</template>
