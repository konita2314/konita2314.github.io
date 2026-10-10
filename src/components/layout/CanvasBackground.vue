<script setup lang="ts">
import { computed, onMounted, onUnmounted, useTemplateRef, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas')

interface Square {
  x: number
  y: number
  size: number
  color: string
  baseX: number
  baseY: number
  floatOffset: number
  targetX: number
  targetY: number
  ease: number
}

const COLORS = {
  dark: [
    'rgba(96, 165, 250, 0.15)',
    'rgba(52, 211, 153, 0.15)',
    'rgba(251, 191, 36, 0.15)',
    'rgba(236, 72, 153, 0.15)',
    'rgba(168, 85, 247, 0.15)',
    'rgba(249, 115, 22, 0.15)',
  ],
  light: [
    'rgba(96, 165, 250, 0.1)',
    'rgba(52, 211, 153, 0.1)',
    'rgba(251, 191, 36, 0.1)',
    'rgba(236, 72, 153, 0.1)',
    'rgba(168, 85, 247, 0.1)',
    'rgba(249, 115, 22, 0.1)',
  ],
}

const enabled = computed(() => !settings.lowPerformance)

let rafId = 0
let squares: Square[] = []

function randomColor(): string {
  const colors = settings.darkMode ? COLORS.dark : COLORS.light
  return colors[Math.floor(Math.random() * colors.length)]
}

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  // 按 devicePixelRatio 设 canvas 尺寸 + ctx.scale（修复高分屏模糊）
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  canvas.getContext('2d')?.scale(dpr, dpr)
}

// 滚动只消费增量 delta（修复绝对 scrollY 累加漂移）
let lastScrollY = 0
function onScroll() {
  const delta = window.scrollY - lastScrollY
  lastScrollY = window.scrollY
  for (const s of squares) {
    s.baseY += delta * 0.002
    s.targetY += delta * 0.002
  }
}

let lastMouseX = 0
let lastMouseY = 0
let hasMousePos = false
let lastMouseMoveTime = 0
function onMouseMove(e: MouseEvent) {
  const now = performance.now()
  if (now - lastMouseMoveTime < 20) return // 约 50fps 限频
  lastMouseMoveTime = now
  if (!hasMousePos) {
    // 首个位置只记录不计算（避免从 (0,0) 起算的速度突跳）
    lastMouseX = e.clientX
    lastMouseY = e.clientY
    hasMousePos = true
    return
  }
  const mouseSpeed = Math.hypot(e.clientX - lastMouseX, e.clientY - lastMouseY) * 0.08
  lastMouseX = e.clientX
  lastMouseY = e.clientY
  for (const s of squares) {
    const cx = s.x + s.size / 2
    const cy = s.y + s.size / 2
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy)
    if (dist < 150) {
      const force = ((150 - dist) / 150) * 1.5 * mouseSpeed
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx)
      s.targetX = s.x - Math.cos(angle) * force
      s.targetY = s.y - Math.sin(angle) * force
    }
  }
}

// rAF id 存变量，cleanup 必须 cancelAnimationFrame（原站从未取消，禁动画后旧循环仍在画）
function cleanup() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  hasMousePos = false
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('scroll', onScroll)
  squares = []
}

function init() {
  const canvas = canvasRef.value
  if (!canvas) return
  resizeCanvas()
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = () => window.innerWidth
  const h = () => window.innerHeight

  squares = []
  for (let i = 0; i < 18; i++) {
    const size = Math.random() * 300 + 100
    const x = Math.random() * (w() + size * 2) - size
    const y = Math.random() * (h() + size * 2) - size
    squares.push({
      x,
      y,
      size,
      color: randomColor(),
      baseX: x,
      baseY: y,
      floatOffset: Math.random() * Math.PI * 2,
      targetX: x,
      targetY: y,
      ease: 0.006 + Math.random() * 0.003,
    })
  }
  lastScrollY = window.scrollY

  const animate = () => {
    if (!rafId) return // 已清理
    ctx.clearRect(0, 0, w(), h())
    for (const s of squares) {
      s.x += (s.targetX - s.x) * s.ease
      s.y += (s.targetY - s.y) * s.ease
      s.targetX += (s.baseX + Math.sin(s.floatOffset) * 1.5 - s.targetX) * 0.0015
      s.targetY += (s.baseY + Math.cos(s.floatOffset) * 1.5 - s.targetY) * 0.0015
      s.floatOffset += 0.0006
      s.baseX += Math.sin(s.floatOffset) * 0.03
      s.baseY += Math.cos(s.floatOffset) * 0.03
      ctx.fillStyle = s.color
      ctx.fillRect(s.x, s.y, s.size, s.size)
    }
    // 边界检测（扩大到全屏范围）
    for (const s of squares) {
      if (s.x > w() + s.size) {
        s.x = -s.size
        s.targetX = -s.size
        s.baseX = -s.size
        s.baseY = Math.random() * h()
        s.color = randomColor()
        s.size = Math.random() * 300 + 100
      } else if (s.x < -s.size) {
        s.x = w() + s.size
        s.targetX = w() + s.size
        s.baseX = w() + s.size
        s.baseY = Math.random() * h()
        s.color = randomColor()
        s.size = Math.random() * 300 + 100
      }
      if (s.y > h() + s.size) {
        s.y = -s.size
        s.targetY = -s.size
        s.baseY = -s.size
        s.baseX = Math.random() * w()
        s.color = randomColor()
        s.size = Math.random() * 300 + 100
      } else if (s.y < -s.size) {
        s.y = h() + s.size
        s.targetY = h() + s.size
        s.baseY = h() + s.size
        s.baseX = Math.random() * w()
        s.color = randomColor()
        s.size = Math.random() * 300 + 100
      }
    }
    rafId = requestAnimationFrame(animate)
  }
  rafId = requestAnimationFrame(animate)

  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('scroll', onScroll)
}

// 先清理再启动
function start() {
  cleanup()
  if (!enabled.value || !canvasRef.value) return
  init()
}

// 首轮启动必须放 onMounted（canvas 已挂载，canvasRef 可用）。
// 实测 Vue 3.5 下 { immediate: true, flush: 'post' } 的 immediate 回调仍在
// setup 阶段同步执行，彼时 v-if 的 canvas 未挂载，canvasRef 为 null 直接
// return，且 enabled 不再变化 → 背景永远不启动（canvas 停在 300×150 默认尺寸）。
// 后续低性能开关切换走 watch，flush: 'post' 保证 v-if 重渲染完成后 canvas 已挂载。
watch(enabled, start, { flush: 'post' })
onMounted(start)

// 主题切换只重着色，不重建方块
watch(
  () => settings.darkMode,
  () => {
    for (const s of squares) s.color = randomColor()
  }
)

onUnmounted(cleanup)
</script>

<template>
  <canvas v-if="!settings.lowPerformance" ref="canvas" class="canvas-bg"></canvas>
</template>
