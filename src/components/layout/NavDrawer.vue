<script setup lang="ts">
import { watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from '@/composables/useI18n'
import { useScrollLock } from '@/composables/useScrollLock'

const settings = useSettingsStore()
const { t } = useI18n()
const { lock, unlock } = useScrollLock()

const links = [
  { path: '/', key: 'nav.home' },
  { path: '/tools', key: 'nav.tools' },
  { path: '/blog', key: 'nav.blog' },
  { path: '/about', key: 'nav.about' },
]

function close() {
  settings.isDrawerOpen = false
}

watch(
  () => settings.isDrawerOpen,
  (open) => {
    if (open) lock()
    else unlock()
  }
)
</script>

<template>
  <!-- 移动端左侧导航抽屉（复用原 .sidebar CSS）。
       显式 :duration：过渡根 .drawer-root 自身无动画，Vue 无法从根元素测得时长，
       不指定会立即移除 enter/leave 类，子元素（overlay/侧栏）动画全部不播放 -->
  <Transition name="drawer" :duration="300">
    <div v-if="settings.isDrawerOpen" class="drawer-root">
      <div class="sidebar-overlay" @click="close"></div>
      <div class="sidebar">
        <div class="sidebar-header">
          <h2>Konita</h2>
          <button class="close-btn" @click="close">×</button>
        </div>
        <nav class="sidebar-nav">
          <ul>
            <li v-for="link in links" :key="link.path">
              <RouterLink :to="link.path" @click="close">{{ t(link.key) }}</RouterLink>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </Transition>
</template>
