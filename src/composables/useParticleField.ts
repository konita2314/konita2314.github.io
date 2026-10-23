import { onMounted, onUnmounted, watch, type ShallowRef } from 'vue'
import { gyroSupported, needsGyroPermission, requestGyroPermission, screenAngle } from '@/utils/device'
import {
  PARTICLE_PALETTES,
  createField,
  entryBlurRadius,
  lodWeights,
  particleAlpha,
  recolorField,
  resizeField,
  settleField,
  stepField,
  worldSpan,
  type Bounds,
  type FieldInput,
  type Particle,
  type ParticleTheme,
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
  /** 移动端：视角是否跟随陀螺仪 */
  gyroscope: () => boolean
}

/** 陀螺仪读数换算镜头的比例：倾斜多少度算「推满」 */
const GYRO_RANGE_DEG = 22

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
  /**
   * 粒子场自己的时钟（秒）：只由每帧的 dt 累加。
   * 不用 performance.now() 直接换算 —— 切后台、系统冻结、多任务恢复时
   * 墙上时间会一次跳掉几分钟，粒子会瞬移到另一个漂浮位置。
   */
  let elapsed = 0

  const pointer = { x: 0, y: 0, active: false, energy: 0 }
  let pointerSpeed = 0
  let pointerSeenAt = 0
  /** 送进粒子场的滚动位移（累加真实滚动增量，跳转不计入） */
  let scrollOffset = 0
  /** 上一次读到的原始滚动位置 */
  let lastScrollY = 0
  /** 刚切完页面的一小段时间内，滚动变化不算用户滚动（路由会把页面滚回顶部） */
  let ignoreScrollUntil = 0
  /** 镜头：指针相对屏幕中心的位置（-1..1），平滑跟随，驱动各层视差 */
  const camera = { x: 0, y: 0 }
  /**
   * 陀螺仪：以「启用那一刻的握持角度」为原点，之后左右/前后倾斜换算成镜头位置。
   * 只依赖相对角度，所以横竖屏、怎么拿着手机都不影响。
   */
  const gyro = { x: 0, y: 0, active: false, baseline: null as { beta: number; gamma: number } | null }
  let gyroListening = false
  let lastScreenAngle = -1

  function viewport(): Bounds {
    const root = document.documentElement
    const width = Math.max(0, root.clientWidth || window.innerWidth || 0)
    const height = Math.max(0, root.clientHeight || window.innerHeight || 0)
    // 移动端切后台 / 从多任务恢复的瞬间，部分浏览器会报 0 附近的尺寸。
    // 那时若照单全收，锚点会被整体缩放成一点（粒子挤成一团），回来再弹回去 —— 沿用旧值即可。
    if (width < 40 || height < 40) {
      return bounds.width >= 40 && bounds.height >= 40 ? bounds : { width: Math.max(1, width), height: Math.max(1, height) }
    }
    return { width, height }
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

  function buildInput(dt: number, scroll = scrollOffset): FieldInput {
    return {
      time: elapsed,
      dt,
      bounds,
      pointer,
      camera,
      scrollY: scroll,
      wrapSpan: worldSpan(bounds),
      theme: options.theme(),
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

    // 刚切完路由：这一次滚动是路由把页面归零/恢复位置，不是用户滚的
    if (performance.now() < ignoreScrollUntil) return

    // 一次跳超过 1.2 个视口高（路由切换、前进后退恢复位置、拖滚动条），
    // 这不是「滚动」。直接丢掉这段跳变 —— 否则五层会以各自速度瞬移，
    // 层与层的相对位置也会被永久错开。
    if (Math.abs(delta) > bounds.height * 1.2) return

    scrollOffset += delta
  }

  /** 路由切换时调用：把接下来的这段滚动变化当作跳转丢掉，背景留在原地 */
  function rebaseScroll(): void {
    ignoreScrollUntil = performance.now() + 320
    lastScrollY = window.scrollY
  }

  function onDeviceOrientation(event: DeviceOrientationEvent): void {
    if (event.beta === null || event.gamma === null) return

    // 横竖屏切换后 beta / gamma 的含义会变，重新取基准
    const angle = screenAngle()
    if (angle !== lastScreenAngle) {
      lastScreenAngle = angle
      gyro.baseline = null
    }

    // 按屏幕方向把设备坐标换成「左右倾斜 / 前后倾斜」
    let tiltX = event.gamma
    let tiltY = event.beta
    if (angle === 90) {
      tiltX = event.beta
      tiltY = -event.gamma
    } else if (angle === 270) {
      tiltX = -event.beta
      tiltY = event.gamma
    } else if (angle === 180) {
      tiltX = -event.gamma
      tiltY = -event.beta
    }

    if (!gyro.baseline) {
      // 第一次读数就是「视角原点」：用户当前怎么拿着，画面就在正中
      gyro.baseline = { beta: tiltY, gamma: tiltX }
      return
    }

    gyro.x = Math.max(-1, Math.min(1, (tiltX - gyro.baseline.gamma) / GYRO_RANGE_DEG))
    gyro.y = Math.max(-1, Math.min(1, (tiltY - gyro.baseline.beta) / GYRO_RANGE_DEG))
    gyro.active = true
  }

  function attachGyro(): void {
    if (gyroListening) return
    window.addEventListener('deviceorientation', onDeviceOrientation, { passive: true })
    gyroListening = true
  }

  function onFirstGesture(): void {
    window.removeEventListener('pointerdown', onFirstGesture)
    void requestGyroPermission().then((granted) => {
      if (granted && running && playable() && options.gyroscope()) attachGyro()
    })
  }

  /** 按当前设置决定是否挂陀螺仪监听（iOS 需要先过一次用户手势拿权限） */
  function syncGyroscope(): void {
    const wanted = running && playable() && options.gyroscope() && gyroSupported()
    if (!wanted) {
      if (gyroListening) window.removeEventListener('deviceorientation', onDeviceOrientation)
      window.removeEventListener('pointerdown', onFirstGesture)
      gyroListening = false
      gyro.active = false
      gyro.baseline = null
      return
    }
    if (gyroListening) return
    if (needsGyroPermission()) {
      window.addEventListener('pointerdown', onFirstGesture, { passive: true })
      return
    }
    attachGyro()
  }

  function onPageHide(): void {
    if (!running) return
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
  }

  function onPageShow(event: PageTransitionEvent): void {
    if (!running || !event.persisted) return
    // bfcache 恢复：场时钟靠 dt 累加，天然不会跳；静态帧则补画一帧
    // （画布内容可能已经被浏览器丢掉）
    if (!playable()) {
      drawStaticFrame()
      return
    }
    lastTime = performance.now()
    if (!paused && !rafId) rafId = requestAnimationFrame(tick)
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
      lastTime = performance.now()
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
    syncGyroscope()

    if (playable()) {
      // 从静止帧恢复：把冻结的这段时间补进时间原点，粒子不会突然瞬移
      lastTime = performance.now()
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
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibilityChange)
    reducedMotion.addEventListener('change', onReducedMotionChange)
    // 静止背景（低性能 / 减少动态）不挂鼠标与滚动监听：它就是一张图
    if (!playable()) return
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    // 从静止模式切回来时补一次当前位置，避免用到过期的滚动值
    lastScrollY = window.scrollY
    window.addEventListener('blur', onPointerOut)
    document.documentElement.addEventListener('pointerleave', onPointerOut)
  }

  function removeListeners(): void {
    window.removeEventListener('resize', onResize)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('pageshow', onPageShow)
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

  function createBlurSprite(size: number, colorCss: string, blurCss: number, scale: number): BlurSprite | null {
    const inner = Math.max(4, Math.round(size * scale))
    const blur = Math.max(0.6, blurCss * scale)
    const pad = Math.ceil(blur * 2.6)
    const image = document.createElement('canvas')
    image.width = inner + pad * 2
    image.height = inner + pad * 2
    const context = image.getContext('2d')
    if (!context) return null
    if (supportsCanvasFilter()) context.filter = `blur(${blur.toFixed(2)}px)`
    context.fillStyle = colorCss
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
      const blur = entryBlurRadius(particle)
      entry.heavy = createBlurSprite(particle.size, particle.colorCss, blur.heavy, 0.2)
      entry.light = createBlurSprite(particle.size, particle.colorCss, blur.light, 0.34)
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
      context.fillStyle = particle.colorCss
      context.fillRect(x, y, size, size)
      return
    }

    const [heavyWeight, lightWeight, sharpWeight] = lodWeights(particle.focus)
    const entry = spritesFor(particle)
    if (heavyWeight > 0.004 && entry.heavy) drawSprite(context, entry.heavy, x, y, size, alpha * heavyWeight)
    if (lightWeight > 0.004 && entry.light) drawSprite(context, entry.light, x, y, size, alpha * lightWeight)
    if (sharpWeight > 0.004) {
      context.globalAlpha = alpha * sharpWeight
      context.fillStyle = particle.colorCss
      context.fillRect(x, y, size, size)
    }
  }

  function draw(): void {
    const context = ctx
    if (!context) return
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, bounds.width, bounds.height)

    const palette = PARTICLE_PALETTES[options.theme()]
    // 深色底用 screen 叠加：重叠处更亮，粒子的「透明玻璃」感才出来
    context.globalCompositeOperation = palette.blend
    for (const particle of particles) {
      if (particle.alpha <= 0.004) continue
      // 环带里有一部分粒子在视口外（等着滚进来），不必画
      if (particle.renderY > bounds.height || particle.renderY + particle.size < 0) continue
      drawParticle(context, particle, palette.alpha)
    }
    context.globalAlpha = 1
    context.globalCompositeOperation = 'source-over'
  }

  function drawStaticFrame(): void {
    settleField(particles, buildInput(0, 0))
    draw()
  }

  // -------------------------------------------------------------------------
  // 循环
  // -------------------------------------------------------------------------

  function handleResize(): void {
    const element = canvas.value
    if (!element || !ctx) return
    const previous = bounds
    const next = viewport()
    const relWidth = previous.width > 0 ? Math.abs(next.width - previous.width) / previous.width : 1
    const relHeight = previous.height > 0 ? Math.abs(next.height - previous.height) / previous.height : 1
    bounds = next
    applyCanvasSize(element)

    if (previous.width < 40 || previous.height < 40) {
      // 启动时布局还没就绪（拿到的是退化尺寸）：拿到真实尺寸后整块重建，避免粒子挤成一团
      particles = createField(next, worldSpan(next), options.theme())
      sprites.clear()
    } else if (relWidth > 0.12 || relHeight > 0.12) {
      // 只有尺寸真的变了（旋转 / 拖窗口）才重排粒子。
      // 移动端地址栏收起展开只有几十像素，按比例重排会让背景跟着滚动「刷新」一下。
      resizeField(particles, previous, next)
      sprites.clear()
      gyro.baseline = null
    }
    if (!playable()) drawStaticFrame()
  }

  function advanceInputs(now: number, dt: number): void {
    // 指针能量：移动时快速升高，停下后缓慢回落 —— 停手时粒子是「慢慢安静」而不是硬停
    const idle = now - pointerSeenAt
    const target = pointer.active && idle < 140 ? Math.min(1, pointerSpeed / 1400) : 0
    const rate = target > pointer.energy ? 9 : 2.2
    pointer.energy += (target - pointer.energy) * (1 - Math.exp(-rate * dt))
    pointerSpeed *= Math.exp(-dt * 5)


    // 镜头位置：有陀螺仪就跟着握持姿势，否则用指针相对屏幕中心的位置（都不依赖绝对坐标）
    const targetX = gyro.active
      ? gyro.x
      : pointer.active
        ? Math.max(-1, Math.min(1, (pointer.x / bounds.width) * 2 - 1))
        : 0
    const targetY = gyro.active
      ? gyro.y
      : pointer.active
        ? Math.max(-1, Math.min(1, (pointer.y / bounds.height) * 2 - 1))
        : 0
    const follow = 1 - Math.exp(-dt * 3.2)
    camera.x += (targetX - camera.x) * follow
    camera.y += (targetY - camera.y) * follow
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
    elapsed += dt
    advanceInputs(now, dt)
    stepField(particles, buildInput(dt))
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
    particles = createField(bounds, worldSpan(bounds), options.theme())
    sprites.clear()

    pointer.active = false
    pointer.energy = 0
    pointerSpeed = 0
    camera.x = 0
    camera.y = 0
    scrollOffset = 0
    lastScrollY = window.scrollY

    elapsed = 0
    lastTime = performance.now()
    applyMode()
  }

  function stop(): void {
    if (!running) return
    running = false
    paused = false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    removeListeners()
    window.removeEventListener('deviceorientation', onDeviceOrientation)
    window.removeEventListener('pointerdown', onFirstGesture)
    gyroListening = false
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
  // 陀螺仪开关：立即生效（关掉时镜头会平滑回正）
  watch(() => options.gyroscope(), () => { if (running) syncGyroscope() })

  // 主题切换只重新配色（带柔和过渡），不重建粒子
  watch(
    () => options.theme(),
    () => {
      if (!running) return
      recolorField(particles, options.theme(), !playable())
      sprites.clear()
      if (!playable()) drawStaticFrame()
    },
  )

  onUnmounted(stop)

  return { rebaseScroll }
}
