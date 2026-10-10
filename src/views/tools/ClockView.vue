<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useFullscreen } from '@/composables/useFullscreen'

const settings = useSettingsStore()
const { toggleFullscreen } = useFullscreen()

const currentTime = ref(new Date())
const timer = setInterval(() => {
  currentTime.value = new Date()
}, 1000)
onUnmounted(() => clearInterval(timer))

const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

const timeStr = computed(() => currentTime.value.toLocaleTimeString('zh-CN', { hour12: false }))
const month = computed(() => months[currentTime.value.getMonth()])
const weekday = computed(() => weekdays[currentTime.value.getDay()])

const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

// 农历：真实计算（Intl 中文历法，替代原假数据）；环境不支持则返回空串，模板 v-if 隐藏
let lunarFormatter: Intl.DateTimeFormat | null = null
try {
  lunarFormatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
} catch {
  lunarFormatter = null
}

const lunarDate = computed(() => {
  if (!lunarFormatter) return ''
  const formatted = lunarFormatter.format(currentTime.value)
  // 去掉前导公历年（如 "2026年"），只留干支年 + 农历月日
  return formatted.replace(/^\d{4}年/, '')
})
</script>

<template>
  <!-- 全屏时根类切 .clock-fullscreen；hideChrome 由 useFullscreen 的 fullscreenchange 同步 -->
  <section :class="settings.hideChrome ? 'clock-fullscreen' : 'clock-page'">
    <div class="container">
      <h2 class="section-title">桌面时钟</h2>

      <div class="clock-container">
        <div class="clock-display">
          <h3>当前时间</h3>
          <div class="time">{{ timeStr }}</div>
          <div class="date">{{ currentTime.getFullYear() }}年 {{ month }} {{ currentTime.getDate() }}日</div>
          <div class="weekday">{{ weekday }}</div>
          <div v-if="lunarDate" class="lunar">{{ lunarDate }}</div>
          <div class="timezone">时区: {{ timezone }}</div>
        </div>
        <button class="fullscreen-btn" @click="toggleFullscreen">
          {{ settings.hideChrome ? '退出全屏' : '全屏' }}
        </button>
      </div>
    </div>
  </section>
</template>
