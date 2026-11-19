import {
  onBeforeUnmount,
  onMounted,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'

/**
 * 指针牵引：光标靠近元素时，让元素朝光标方向微微倾侧、平移。
 *
 * 只负责算，不碰布局：把结果写成三个 CSS 变量（--tx / --ty / --tilt），
 * 元素的样式里用 calc() 拼进 transform —— 这样整段动画只走合成器，不改几何。
 *
 * 三个防抖设计（都是实测踩出来的）：
 * 1. 事件只记坐标，计算挪到每帧一次 —— 高刷鼠标一秒上千个事件，逐个算等于放大噪声；
 * 2. 每帧只向目标靠 ease（默认 16%），手抖被磨平，急停也能柔和收住；
 * 3. 目标值量化到 0.1px / 0.1°，亚像素抖动不会一帧一帧地传到纸上。
 */
export interface PointerLeanOptions {
  /** 响应半径（px）：超出这个圈完全不动 */
  radius?: number
  /** 最大倾角（度） */
  maxAngle?: number
  /** 最大水平位移（px），纵向按 0.75 倍收 */
  maxShift?: number
  /** 每帧向目标靠近的比例，越小越「重」 */
  ease?: number
  /** 只处理 clientY 小于它的指针（导航在顶部，页面下半部分不用算） */
  maxY?: number
  /** true 时彻底不动（低性能模式） */
  disabled?: MaybeRefOrGetter<boolean>
}

export interface PointerLean {
  /** 是否正在跟手：给元素挂 transition: none 用 */
  tracking: ShallowRef<boolean>
}

export function usePointerLean(
  target: MaybeRefOrGetter<HTMLElement | null>,
  options: PointerLeanOptions = {},
): PointerLean {
  const {
    radius = 300,
    maxAngle = 2,
    maxShift = 4,
    ease = 0.16,
    maxY = 220,
    disabled,
  } = options

  const tracking = shallowRef(false)
  const reduced =
    typeof window === 'undefined' ? null : window.matchMedia('(prefers-reduced-motion: reduce)')

  let pointer: { x: number; y: number } | null = null
  let curX = 0
  let curY = 0
  let curA = 0
  let tgtX = 0
  let tgtY = 0
  let tgtA = 0
  let raf = 0

  const q10 = (v: number) => Math.round(v * 10) / 10

  function paint() {
    const el = toValue(target)
    if (!el) return
    el.style.setProperty('--tx', curX.toFixed(2) + 'px')
    el.style.setProperty('--ty', curY.toFixed(2) + 'px')
    el.style.setProperty('--tilt', curA.toFixed(2) + 'deg')
  }

  function compute(x: number, y: number) {
    const el = toValue(target)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const dx = x - (rect.left + rect.width / 2)
    const dy = y - (rect.top + rect.height / 2)
    // 距离衰减：越近越有感觉，圈外彻底为零，避免边缘处突然一抽
    const falloff = Math.max(0, 1 - Math.hypot(dx, dy) / radius) ** 2
    if (falloff <= 0.001) {
      tgtX = 0
      tgtY = 0
      tgtA = 0
      return
    }
    const nx = Math.max(-1, Math.min(1, dx / (radius * 1.07)))
    const ny = Math.max(-1, Math.min(1, dy / (radius * 0.75)))
    tgtX = q10(nx * maxShift * falloff)
    tgtY = q10(ny * maxShift * 0.75 * falloff)
    tgtA = q10(nx * maxAngle * falloff)
  }

  function loop() {
    if (pointer) {
      compute(pointer.x, pointer.y)
      pointer = null
    }
    curX += (tgtX - curX) * ease
    curY += (tgtY - curY) * ease
    curA += (tgtA - curA) * ease
    paint()

    if (
      Math.abs(tgtX - curX) < 0.02 &&
      Math.abs(tgtY - curY) < 0.02 &&
      Math.abs(tgtA - curA) < 0.02
    ) {
      curX = tgtX
      curY = tgtY
      curA = tgtA
      paint()
      tracking.value = false
      raf = 0
      return
    }
    raf = requestAnimationFrame(loop)
  }

  function kick() {
    if (raf) return
    tracking.value = true
    raf = requestAnimationFrame(loop)
  }

  function onMove(e: PointerEvent) {
    if (e.pointerType !== 'mouse') return
    if (e.clientY > maxY) return
    if (reduced?.matches) return
    if (disabled && toValue(disabled)) return
    pointer = { x: e.clientX, y: e.clientY }
    kick()
  }

  function reset() {
    pointer = null
    curX = curY = curA = tgtX = tgtY = tgtA = 0
    paint()
    tracking.value = false
  }

  // 低性能模式中途打开时立刻归位，不要停在一个倾斜的姿态上
  if (disabled) {
    watch(
      () => (disabled ? toValue(disabled) : false),
      (off) => {
        if (off) reset()
      },
    )
  }

  onMounted(() => window.addEventListener('pointermove', onMove, { passive: true }))
  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onMove)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
  })

  return { tracking }
}
