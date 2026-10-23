<script setup lang="ts">
import { computed, onUnmounted, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useParticleField } from '@/composables/useParticleField'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const route = useRoute()
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

// 低性能模式不是「没有背景」，而是「背景不参与交互」：
// 同样铺一块完整的粒子背景，但不跑动画、不响应鼠标与滚动。
const interactive = computed(() => !settings.lowPerformance)

// 布局、物理、生命周期都在 composable + utils 里，组件只负责挂一块画布
const { rebaseScroll } = useParticleField(canvasRef, {
  interactive: () => interactive.value,
  theme: () => (settings.darkMode ? 'dark' : 'light'),
  gyroscope: () => settings.gyroscope,
})

// 路由切换会把页面滚回顶部（或恢复上次位置），这段位移不该让背景跟着瞬移
const stopRouteWatch = watch(() => route.fullPath, () => rebaseScroll())
onUnmounted(stopRouteWatch)
</script>

<template>
  <canvas ref="canvas" class="canvas-bg" aria-hidden="true"></canvas>
</template>