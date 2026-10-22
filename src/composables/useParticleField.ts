import { onMounted, onUnmounted, watch, type ShallowRef } from 'vue'
import {
  PARTICLE_PALETTES,
  createField,
  entryBlurFactor,
  lodWeights,
  particleAlpha,
  recolorField,
  resizeField,
  settleField,
  stepField,
  type Bounds,
  type FieldInput,
  type Particle,
  type ParticleTheme,
  type Rgb,
} from '@/utils/particleField'

/**
 * 把粒子场画到 canvas 上。
 *
 * 分工：布局 / 物理 / 生命周期全在 utils/particleField.ts（纯函数），
 * 这里只做浏览器侧的事 —— 尺寸与 DPR、rAF 循环、指针与滚动输入、
 * 模糊贴图缓存、以及卸载时把所有东西干净地收掉。
 */

/** 低分辨率的模糊贴图：入场时把「模糊 → 清晰」变成两次 drawImage，避免每帧跑高斯模糊 */
interface BlurSprite {
  image: HTMLCanvasElement
  /** 贴图四周的模糊留白，已换算回 CSS px */
  pad: number
}

interface ParticleSprites {
  heavy: BlurSprite | null
  light: BlurSprite | null
  /** 生成贴图时的 colorVersion：颜色变了要重建 */
  version: number
}

export interface UseParticleFieldOptions {
  /**
   * 是否启用交互（低性能模式下关掉）。
   * 关掉不等于不画：canvas 依旧铺满一块完整的静止粒子背景，
   * 只是不跑动画循环、不挂鼠标与滚动监听 —— 它纯粹就是一张背景。
   */
  interactive: () => boolean
  /** 主题只影响基础透明度，以及切换时的一次重新配色 */
  theme: () => ParticleTheme
}

/** 单帧最大步长：切标签页回来 / 掉帧时不让物理一步跳太远 */
const MAX_STEP = 0.05

let canvasFilterSupported: boolean | null = null

function supportsCanvasFilter(): boolean {
  if (canvasFilterSupported === null) {
    const probe = document.createElement('canvas').getContext('2d')
    canvasFilterSupported = !!probe && 'filter' in probe
  }
  return canvasFilterSupported
}

function rgbCss(color: Rgb): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`
}

export function useParticleField(
  canvas: Readonly<ShallowRef<HTMLCanvasElement | null>>,
  options: UseParticleFieldOptions,
) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  let ctx: CanvasRenderingContext2D | null = null
  let particles: Particle[] = []
  const sprites = new Map<Particle, ParticleSprites>()
  let bounds: Bounds = { width: 0, height: 0 }
  let dpr = 1
  let rafId = 0
  let running = false
  let paused = false
  let pendingResize = false
  let lastTime = 0
  let startedAt = 0

  const pointer = { x: 0, y: 0, active: false, energy: 0 }
  let pointerSpeed = 0
  let pointerSeenAt = 0
  /** 滚动的目标视差量（由事件写入，自身也在衰减） */
  let scrollTarget = 0
  /** 实际送进物理层的视差量（对 scrollTarget 再做一次低通，避免一帧几十像素的硬跳） */
  let scrollShift = 0
  let lastScrollY = 0
  /** 镜头：指针相对屏幕中心的位置（-1..1），平滑跟随，驱动各层视差 */
  const camera = { x: 0, y: 0 }

  function viewport(): Bounds {
    const root = document.documentElement
    return {
      width: Math.max(1, root.clientWidth || window.innerWidth),
      height: Math.max(1, root.clientHeight || window.innerHeight),
    }
  }

  function applyCanvasSize(element: HTMLCanvasElement): void {
    // 上限 2 倍：3x 屏上继续拉高 DPR 只是白烧填充率
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(bounds.width * dpr))
    const height = Math.max(1, Math.round(bounds.height * dpr))
    if (element.width !== width) element.width = width
    if (element.height !== height) element.height = height
    // 改 canvas.width/height 会重置上下文状态，平滑质量必须在这里补回来
    if (ctx) ctx.imageSmoothingQuality = 'high'
  }

  function buildInput(dt: number, now: number): FieldInput {
    return {
      time: (now - startedAt) / 1000,
      dt,
      bounds,
      pointer,
      camera,
      scrollShift,
    }
  }

  // -------------------------------------------------------------------------
  // 输入
  // -------------------------------------------------------------------------

  function onPointerMove(event: PointerEvent): void {
    const now = performance.now()
    if (!pointer.active) {
      // 首个位置只记录，不参与速度计算（否则会从 (0,0) 算出一次虚假的高速）
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
      pointerSeenAt = now
      return
    }
    const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y)
    const elapsed = Math.max(8, now - pointerSeenAt) / 1000
    // 单次事件速度噪声大，做一阶平滑；上限 6000px/s 防止毒点
    pointerSpeed += (Math.min(distance / elapsed, 6000) - pointerSpeed) * 0.35
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointerSeenAt = now
  }

  function onPointerOut(): void {
    pointer.active = false
    pointerSpeed = 0
  }

  function onScroll(): void {
    const y = window.scrollY
    const delta = y - lastScrollY
    lastScrollY = y
    // 背景是「远景」：滚动时向上轻轻让开一点，停下后再缓回原位（有界，不会漂走）
    scrollTarget = Math.min(64, Math.max(-64, scrollTarget - delta * 0.12))
  }

  function onResize(): void {
    // 有动画时把重建放进下一帧，避免 backing store 被清空后先闪一帧空白
    if (playable()) pendingResize = true
    else handleResize()
  }

  function onVisibilityChange(): void {
    if (!running || !playable()) return
    if (document.hidden) {
      paused = true
      if (rafId) cancelAnimationFrame(rafId)
      rafId = 0
    } else if (paused) {
      paused = false
      resumeClock()
      if (!rafId) rafId = requestAnimationFrame(tick)
    }
  }

  function onReducedMotionChange(): void {
    applyMode()
  }

  /** 只有「允许交互 + 系统没要求减少动态」时才跑动画循环，否则只画一帧静止背景 */
  function playable(): boolean {
    return options.interactive() && !reducedMotion.matches
  }

  /**
   * 切换「动画 / 静止」两种模式。
   * 静止模式仍然是完整的一块粒子背景，只是没有动画循环、没有鼠标与滚动监听。
   */
  function applyMode(): void {
    removeListeners()
    addListeners()

    if (playable()) {
      // 从静止帧恢复：把冻结的这段时间补进时间原点，粒子不会突然瞬移
      resumeClock()
      if (!rafId) rafId = requestAnimationFrame(tick)
      return
    }

    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    paused = false
    drawStaticFrame()
  }

  function addListeners(): void {
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibilityChange)
    reducedMotion.addEventListener('change', onReducedMotionChange)
    // 静止背景（低性能 / 减少动态）不挂鼠标与滚动监听：它就是一张图
    if (!playable()) return
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('blur', onPointerOut)
    document.documentElement.addEventListener('pointerleave', onPointerOut)
  }

  function removeListeners(): void {
    window.removeEventListener('resize', onResize)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    reducedMotion.removeEventListener('change', onReducedMotionChange)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('blur', onPointerOut)
    document.documentElement.removeEventListener('pointerleave', onPointerOut)
  }

  // -------------------------------------------------------------------------
  // 绘制
  // -------------------------------------------------------------------------

  function createBlurSprite(size: number, color: Rgb, blurCss: number, scale: number): BlurSprite | null {
    const inner = Math.max(4, Math.round(size * scale))
    const blur = Math.max(0.6, blurCss * scale)
    const pad = Math.ceil(blur * 2.6)
    const image = document.createElement('canvas')
    image.width = inner + pad * 2
    image.height = inner + pad * 2
    const context = image.getContext('2d')
    if (!context) return null
    if (supportsCanvasFilter()) context.filter = `blur(${blur.toFixed(2)}px)`
    context.fillStyle = rgbCss(color)
    context.fillRect(pad, pad, inner, inner)
    return { image, pad: pad / scale }
  }

  function spritesFor(particle: Particle): ParticleSprites {
    let entry = sprites.get(particle)
    if (!entry) {
      entry = { heavy: null, light: null, version: -1 }
      sprites.set(particle, entry)
    }
    if (entry.version !== particle.colorVersion) {
      // 重模糊用更低的分辨率：反正都被糊掉了，省一半以上的填充
      const blur = entryBlurFactor(particle)
      entry.heavy = createBlurSprite(particle.size, particle.color, particle.size * blur, 0.2)
      entry.light = createBlurSprite(particle.size, particle.color, particle.size * blur * 0.33, 0.34)
      entry.version = particle.colorVersion
    }
    return entry
  }

  function drawSprite(
    context: CanvasRenderingContext2D,
    sprite: BlurSprite,
    x: number,
    y: number,
    size: number,
    alpha: number,
  ): void {
    context.globalAlpha = alpha
    const span = size + sprite.pad * 2
    context.drawImage(sprite.image, x - sprite.pad, y - sprite.pad, span, span)
  }

  function drawParticle(context: CanvasRenderingContext2D, particle: Particle, baseAlpha: number): void {
    const alpha = particleAlpha(particle, baseAlpha)
    if (alpha <= 0.002) return
    const { renderX: x, renderY: y, size } = particle

    // 静止态：直接画实心方块，和改造前的观感一致
    if (particle.focus > 0.994) {
      context.globalAlpha = alpha
      context.fillStyle = rgbCss(particle.color)
      context.fillRect(x, y, size, size)
      return
    }

    const [heavyWeight, lightWeight, sharpWeight] = lodWeights(particle.focus)
    const entry = spritesFor(particle)
    if (heavyWeight > 0.004 && entry.heavy) drawSprite(context, entry.heavy, x, y, size, alpha * heavyWeight)
    if (lightWeight > 0.004 && entry.light) drawSprite(context, entry.light, x, y, size, alpha * lightWeight)
    if (sharpWeight > 0.004) {
      context.globalAlpha = alpha * sharpWeight
      context.fillStyle = rgbCss(particle.color)
      context.fillRect(x, y, size, size)
    }
  }

  function draw(): void {
    const context = ctx
    if (!context) return
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, bounds.width, bounds.height)
    const baseAlpha = PARTICLE_PALETTES[options.theme()].alpha
    for (const particle of particles) {
      if (particle.alpha <= 0.004) continue
      drawParticle(context, particle, baseAlpha)
    }
    context.globalAlpha = 1
  }

  function drawStaticFrame(): void {
    settleField(particles, buildInput(0, performance.now()))
    draw()
  }

  // -------------------------------------------------------------------------
  // 循环
  // -------------------------------------------------------------------------

  function handleResize(): void {
    const element = canvas.value
    if (!element || !ctx) return
    const previous = bounds
    bounds = viewport()
    applyCanvasSize(element)
    resizeField(particles, previous, bounds)
    sprites.clear()
    if (!playable()) drawStaticFrame()
  }

  function advanceInputs(now: number, dt: number): void {
    // 指针能量：移动时快速升高，停下后缓慢回落 —— 停手时粒子是「慢慢安静」而不是硬停
    const idle = now - pointerSeenAt
    const target = pointer.active && idle < 140 ? Math.min(1, pointerSpeed / 1400) : 0
    const rate = target > pointer.energy ? 9 : 2.2
    pointer.energy += (target - pointer.energy) * (1 - Math.exp(-rate * dt))
    pointerSpeed *= Math.exp(-dt * 5)

    // 滚动视差两级低通：事件只改目标，真正的位置再追目标。
    // 单帧位移因此被压到几个像素，滚轮一格不会让背景「跳」一下。
    scrollTarget *= Math.exp(-dt * 2.2)
    if (Math.abs(scrollTarget) < 0.05) scrollTarget = 0
    scrollShift += (scrollTarget - scrollShift) * (1 - Math.exp(-dt * 5))
    if (Math.abs(scrollShift) < 0.05) scrollShift = 0

    // 镜头视差：只用指针相对屏幕中心的位置（不依赖绝对坐标）
    const targetX = pointer.active ? Math.max(-1, Math.min(1, (pointer.x / bounds.width) * 2 - 1)) : 0
    const targetY = pointer.active ? Math.max(-1, Math.min(1, (pointer.y / bounds.height) * 2 - 1)) : 0
    const follow = 1 - Math.exp(-dt * 3.2)
    camera.x += (targetX - camera.x) * follow
    camera.y += (targetY - camera.y) * follow
  }

  /**
   * 从暂停恢复：把停摆的时长补进时间原点。
   * 否则一帧之后 time 会突然多出几分钟，粒子的漂浮位置会「跳」一下。
   */
  function resumeClock(): void {
    const now = performance.now()
    startedAt += Math.max(0, now - lastTime)
    lastTime = now
  }

  function tick(now: number): void {
    rafId = 0
    if (!running || paused) return
    if (pendingResize) {
      pendingResize = false
      handleResize()
    }
    const dt = Math.min(MAX_STEP, Math.max(0, (now - lastTime) / 1000))
    lastTime = now
    advanceInputs(now, dt)
    stepField(particles, buildInput(dt, now))
    draw()
    rafId = requestAnimationFrame(tick)
  }

  // -------------------------------------------------------------------------
  // 生命周期
  // -------------------------------------------------------------------------

  function start(): void {
    const element = canvas.value
    if (running || !element) return
    const context = element.getContext('2d')
    if (!context) return

    ctx = context
    running = true
    paused = false
    pendingResize = false

    bounds = viewport()
    applyCanvasSize(element)
    particles = createField(bounds)
    sprites.clear()

    pointer.active = false
    pointer.energy = 0
    pointerSpeed = 0
    scrollTarget = 0
    scrollShift = 0
    camera.x = 0
    camera.y = 0
    lastScrollY = window.scrollY

    startedAt = performance.now()
    lastTime = startedAt
    applyMode()
  }

  function stop(): void {
    if (!running) return
    running = false
    paused = false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    removeListeners()
    sprites.clear()
    particles = []
    ctx = null
  }

  function sync(): void {
    if (!canvas.value) {
      stop()
      return
    }
    if (!running) start()
    else applyMode()
  }

  // 首轮启动放 onMounted（此时 canvas 已挂载、canvasRef 有值）
  onMounted(sync)
  // 低性能开关只是切换「动画 / 静止」，不销毁画布
  watch(() => options.interactive(), sync, { flush: 'post' })

  // 主题切换只重新配色（带柔和过渡），不重建粒子
  watch(
    () => options.theme(),
    () => {
      if (!running) return
      recolorField(particles, !playable())
      sprites.clear()
      if (!playable()) drawStaticFrame()
    },
  )

  onUnmounted(stop)
}
