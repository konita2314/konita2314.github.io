<script setup lang="ts">
import { watchEffect } from 'vue'
import NavBar from '@/components/layout/NavBar.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import CanvasBackground from '@/components/layout/CanvasBackground.vue'
import RightPanel from '@/components/layout/RightPanel.vue'
import NavDrawer from '@/components/layout/NavDrawer.vue'
import PerformancePopup from '@/components/layout/PerformancePopup.vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

// 与 index.html 内联 FOUC 脚本操作同一元素、同一 key（刷新无闪的保证）
watchEffect(() => {
  document.documentElement.classList.toggle('dark-mode', settings.darkMode)
  document.documentElement.classList.toggle('low-performance', settings.lowPerformance)
})
</script>

<template>
  <div class="app">
    <div class="geometric-bg" aria-hidden="true"></div>
    <CanvasBackground />
    <PerformancePopup />
    <NavBar v-if="!settings.hideChrome" />
    <main class="main-content">
      <RouterView />
    </main>
    <AppFooter v-if="!settings.hideChrome" />
    <RightPanel />
    <NavDrawer />
  </div>
</template>
