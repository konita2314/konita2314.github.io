/**
 * 粒子背景的 UX 约束校验。
 *
 *   npm run verify:field
 *
 * 需要 Node ≥ 22.18（原生跑 TypeScript，无需额外依赖）。
 *
 * 为什么不靠肉眼：像「同一处最多叠 3 层」「粒子每秒最多飘几像素」
 * 这种指标，人眼只能大致感觉，而这个脚本能在几秒内把各种视口、各种鼠标/滚动
 * 输入都跑一遍，直接把数字打出来，并在越界时以非 0 退出。
 *
 * 堆叠按「面积」统计：4 层以上的面积占比、5 层以上的面积占比。
 * 因为 350px 的大方框只要边角蹭到一点点叠压，按「最深的格子」算就永远超标，
 * 而真正影响观感的是「有多少面积叠成一片」。
 */
import {
  HARD_STACK,
  LAYER_COUNT,
  TARGET_STACK,
  createField,
  fieldCount,
  fieldSizeScale,
  measureStack,
  settleField,
  stepField,
  worldSpan,
  type Bounds,
  type Particle,
} from '../src/utils/particleField.ts'

const VIEWPORTS: Bounds[] = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 1366, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
]

const DT = 1 / 60
const DURATION = 120
const TRIALS = 10

/** 速度预算（px/s）：超过就说明「飘逸太快」又回来了 */
const MAX_AMBIENT_SPEED = 40
const MAX_POINTER_SPEED = 160
const MAX_SCROLL_SPEED = 500
/** 面积口径的堆叠上限 */
const MAX_DEEP_AREA = 0.05
const MAX_ULTRA_AREA = 0.012

interface Trial {
  count: number
  layers: number[]
  layout: ReturnType<typeof measureStack>
  runtimeMax: number
  deepArea: number
  ultraArea: number
  colors: number
  sameColorPairs: number
  isolated: number
  stacked: number
  alphaOnFirstFrame: number
  ambientSpeed: number
  pointerSpeed: number
  scrollSpeed: number
  births: number
}

function boxes(field: readonly Particle[], useRender: boolean, minAlpha: number) {
  const result: { x: number; y: number; size: number }[] = []
  for (const particle of field) {
    if (useRender && particle.alpha < minAlpha) continue
    result.push({
      x: useRender ? particle.renderX : particle.anchorX,
      y: useRender ? particle.renderY : particle.anchorY,
      size: particle.size,
    })
  }
  return result
}

/** 屏幕上出现了几种颜色、有多少对「同色还叠在一起」 */
function colorStats(field: readonly Particle[]): { colors: number; sameColorPairs: number } {
  const used = new Set(field.map((particle) => particle.colorIndex))
  let sameColorPairs = 0
  for (let i = 0; i < field.length; i++) {
    for (let j = i + 1; j < field.length; j++) {
      if (field[i].colorIndex === field[j].colorIndex && overlaps(field[i], field[j])) sameColorPairs++
    }
  }
  return { colors: used.size, sameColorPairs }
}

function overlaps(a: Particle, b: Particle): boolean {
  return (
    a.anchorX < b.anchorX + b.size &&
    b.anchorX < a.anchorX + a.size &&
    a.anchorY < b.anchorY + b.size &&
    b.anchorY < a.anchorY + a.size
  )
}

/** 静止状态下有多少粒子孤立、多少互相叠着 */
function contactStats(field: readonly Particle[]): { isolated: number; stacked: number } {
  let isolated = 0
  let stacked = 0
  for (let i = 0; i < field.length; i++) {
    let neighbors = 0
    for (let j = 0; j < field.length; j++) {
      if (i !== j && overlaps(field[i], field[j])) neighbors++
    }
    if (neighbors === 0) isolated++
    else stacked++
  }
  return { isolated: isolated / field.length, stacked: stacked / field.length }
}

function runTrial(bounds: Bounds): Trial {
  const span = worldSpan(bounds)
  const field = createField(bounds, span, 'light')
  const layout = measureStack(bounds, boxes(field, false, 0), 24)
  const contact = contactStats(field)
  const palette = colorStats(field)
  const layers = new Array<number>(LAYER_COUNT).fill(0)
  for (const particle of field) layers[particle.layer] += 1

  // 模拟用户输入：静止 → 以 ~900px/s 绕圈 → 静止 → …，每 10 秒滚一次
  const pointer = { x: bounds.width / 2, y: bounds.height / 2, active: false, energy: 0 }
  const camera = { x: 0, y: 0 }
  let pointerSpeed = 0
  let pointerSeenAt = -1e9
  let scrollY = 0

  let runtimeMax = 0
  let deepArea = 0
  let ultraArea = 0
  let samples = 0
  let ambientSpeed = 0
  let pointerMax = 0
  let scrollMax = 0
  let births = 0
  let alphaOnFirstFrame = 0

  const wasOut = new Map<Particle, boolean>()
  const seen = new Map<Particle, boolean>()
  const frames = Math.round(DURATION / DT)

  for (let frame = 0; frame < frames; frame++) {
    const time = frame * DT
    const now = time * 1000

    const cycle = time % 30
    if (cycle > 18 && cycle < 26) {
      const angle = (cycle - 18) * (900 / 260)
      const radius = Math.min(bounds.width, bounds.height) * 0.25
      const nextX = bounds.width / 2 + Math.cos(angle) * radius
      const nextY = bounds.height / 2 + Math.sin(angle) * radius
      const speed = Math.hypot(nextX - pointer.x, nextY - pointer.y) / DT
      pointerSpeed += (Math.min(speed, 6000) - pointerSpeed) * 0.35
      pointer.x = nextX
      pointer.y = nextY
      pointer.active = true
      pointerSeenAt = now
    }

    const idle = now - pointerSeenAt
    const energyTarget = pointer.active && idle < 140 ? Math.min(1, pointerSpeed / 1400) : 0
    const rate = energyTarget > pointer.energy ? 9 : 2.2
    pointer.energy += (energyTarget - pointer.energy) * (1 - Math.exp(-rate * DT))
    pointerSpeed *= Math.exp(-DT * 5)

    // 镜头：指针相对屏幕中心（-1..1），跟 composable 里的跟随速度一致
    const targetX = pointer.active ? Math.max(-1, Math.min(1, (pointer.x / bounds.width) * 2 - 1)) : 0
    const targetY = pointer.active ? Math.max(-1, Math.min(1, (pointer.y / bounds.height) * 2 - 1)) : 0
    const follow = 1 - Math.exp(-DT * 3.2)
    camera.x += (targetX - camera.x) * follow
    camera.y += (targetY - camera.y) * follow

    // 模拟真实滚动：每 10 秒来回滚 800px（速度约 160px/s）
    scrollY += Math.sin(time * 0.16) * 160 * DT

    const before = new Map<Particle, { x: number; y: number }>()
    for (const particle of field) before.set(particle, { x: particle.renderX, y: particle.renderY })

    stepField(field, { time, dt: DT, bounds, pointer, camera, scrollY, wrapSpan: span, theme: 'light' })

    // 滚动速度 = |sin(...)| * 160；只有「几乎静止」的帧才计入静止/鼠标两档，免得把滚动位移算进去
    const scrollSpeed = Math.abs(Math.sin(time * 0.16)) * 160
    const scrolling = scrollSpeed > 80
    const still = scrollSpeed < 16
    for (const particle of field) {
      const previous = before.get(particle)!
      const justBorn = particle.state === 'in' && particle.age <= DT * 1.5

      if (particle.alpha > 0.02 && !seen.get(particle)) {
        seen.set(particle, true)
        alphaOnFirstFrame = Math.max(alphaOnFirstFrame, particle.alpha)
      }

      const onScreen =
        particle.renderY + particle.size > 0 &&
        particle.renderY < bounds.height &&
        particle.renderX + particle.size > 0 &&
        particle.renderX < bounds.width
      if (particle.alpha > 0.05 && !justBorn && onScreen) {
        const speed = Math.hypot(particle.renderX - previous.x, particle.renderY - previous.y) / DT
        if (scrolling) scrollMax = Math.max(scrollMax, speed)
        else if (!still) {
          // 中速滚动：只统计滚动档，不计入静止/鼠标
        } else if (pointer.energy > 0.4) pointerMax = Math.max(pointerMax, speed)
        else if (pointer.energy < 0.02) ambientSpeed = Math.max(ambientSpeed, speed)
      }

      if ((wasOut.get(particle) ?? false) && particle.state === 'in') births++
      wasOut.set(particle, particle.state === 'out')
    }

    if (frame % 30 === 0) {
      const runtime = measureStack(bounds, boxes(field, true, 0.05), 24)
      runtimeMax = Math.max(runtimeMax, runtime.max)
      deepArea = Math.max(deepArea, runtime.deepArea)
      ultraArea = Math.max(ultraArea, runtime.ultraArea)
      samples++
    }
  }
  void samples

  return {
    count: field.length,
    layers,
    layout,
    runtimeMax,
    deepArea,
    ultraArea,
    colors: palette.colors,
    sameColorPairs: palette.sameColorPairs,
    isolated: contact.isolated,
    stacked: contact.stacked,
    alphaOnFirstFrame,
    ambientSpeed,
    pointerSpeed: pointerMax,
    scrollSpeed: scrollMax,
    births,
  }
}

/** 每层的层级下标与尺寸，方便对照「越大越远」 */
function layerSummary(): string {
  return `层级 0..${LAYER_COUNT - 1}：大 → 小 / 远 → 近；目标堆叠 ${TARGET_STACK} 层`
}

interface LayerParallax {
  layer: number
  shift: number
}

/**
 * 量一下「镜头推到最右时，各层在屏幕上让开多少像素」。
 * 真实透视里位移 ∝ 1/距离，所以相邻层的速度比应当恒定（等比），
 * 而不是线性递减；这条检查就是防止哪天又改回等差。
 */
function measureLayerParallax(): LayerParallax[] {
  const bounds: Bounds = { width: 1440, height: 900 }
  const field = createField(bounds)
  const input = {
    time: 0,
    dt: 0,
    bounds,
    pointer: { x: 0, y: 0, active: false, energy: 0 },
    camera: { x: 0, y: 0 },
    scrollY: 0,
    wrapSpan: 1e9,
    theme: 'light' as const,
  }
  settleField(field, input)
  const before = field.map((particle) => ({ layer: particle.layer, x: particle.renderX }))
  stepField(field, { ...input, camera: { x: 1, y: 0 } })

  const sums = new Array<number>(LAYER_COUNT).fill(0)
  const counts = new Array<number>(LAYER_COUNT).fill(0)
  field.forEach((particle, index) => {
    sums[particle.layer] += Math.abs(particle.renderX - before[index].x)
    counts[particle.layer] += 1
  })
  return sums.map((sum, layer) => ({ layer, shift: counts[layer] > 0 ? sum / counts[layer] : 0 }))
}

interface ScrollJourney {
  minVisible: number
  maxVisible: number
  maxJump: number
  distance: number
  /** 滚动过程中最空的一条横向带的覆盖率：用来抓「上下大面积空白」 */
  minBandCoverage: number
}

/** 把视口横向切 5 条，量每条被粒子覆盖的比例（返回 5 个值，0..1） */
function bandCoverage(bounds: Bounds, field: readonly Particle[]): number[] {
  const bands = 5
  const result = new Array<number>(bands).fill(0)
  for (let band = 0; band < bands; band++) {
    let hit = 0
    let total = 0
    for (let row = 0; row < 8; row++) {
      const y = ((band + (row + 0.5) / 8) / bands) * bounds.height
      for (let col = 0; col < 24; col++) {
        const x = ((col + 0.5) / 24) * bounds.width
        total++
        for (const particle of field) {
          if (particle.renderY > y) continue
          if (particle.renderY + particle.size < y) continue
          if (particle.renderX > x) continue
          if (particle.renderX + particle.size < x) continue
          hit++
          break
        }
      }
    }
    result[band] = hit / total
  }
  return result
}

/**
 * 连续滚动测试：视差是「无限」的，粒子必须在环带里循环。
 * 检查两件事 —— 可见粒子数不会随着滚动被抽干，回绕也绝不能发生在屏幕内（看不到跳变）。
 */
function measureScrollJourney(): ScrollJourney {
  const bounds: Bounds = { width: 1440, height: 900 }
  const span = worldSpan(bounds)
  const field = createField(bounds, span, 'light')
  const input = {
    time: 0,
    dt: DT,
    bounds,
    pointer: { x: 0, y: 0, active: false, energy: 0 },
    camera: { x: 0, y: 0 },
    scrollY: 0,
    wrapSpan: span,
    theme: 'light' as const,
  }
  settleField(field, { ...input, dt: 0 })

  const previous = new Map<Particle, number>()
  let minVisible = Number.POSITIVE_INFINITY
  let maxVisible = 0
  let maxJump = 0
  let distance = 0
  // 每条横带的覆盖率在多帧上取平均：抓「系统性空白」，不抓单帧的随机缝隙
  const bandSum = new Array<number>(5).fill(0)
  let bandSamples = 0
  const frames = Math.round(30 / DT)

  for (let frame = 0; frame < frames; frame++) {
    distance += 260 * DT // 约 260px/s，连续滚 30 秒 ≈ 7800px
    input.time += DT
    input.scrollY = distance
    for (const particle of field) previous.set(particle, particle.renderY)
    stepField(field, input)

    let visible = 0
    for (const particle of field) {
      const before = previous.get(particle)!
      const wasVisible = before + particle.size > 0 && before < bounds.height
      const isVisible = particle.renderY + particle.size > 0 && particle.renderY < bounds.height
      if (isVisible) visible++
      if (wasVisible && isVisible) maxJump = Math.max(maxJump, Math.abs(particle.renderY - before))
    }
    minVisible = Math.min(minVisible, visible)
    maxVisible = Math.max(maxVisible, visible)
    if (frame % 30 === 0) {
      const coverage = bandCoverage(bounds, field)
      for (let band = 0; band < coverage.length; band++) bandSum[band] += coverage[band]
      bandSamples++
    }
  }

  const bandMean = bandSum.map((sum) => sum / Math.max(1, bandSamples))
  return {
    minVisible,
    maxVisible,
    maxJump,
    distance,
    minBandCoverage: Math.min(...bandMean),
  }
}

/** 滚动视差：一次满幅滚动时各层在屏幕上移动多少 */
function measureScrollParallax(scrollY: number): LayerParallax[] {
  const bounds: Bounds = { width: 1440, height: 900 }
  const field = createField(bounds)
  const input = {
    time: 0,
    dt: 0,
    bounds,
    pointer: { x: 0, y: 0, active: false, energy: 0 },
    camera: { x: 0, y: 0 },
    scrollY: 0,
    wrapSpan: 1e9,
    theme: 'light' as const,
  }
  settleField(field, input)
  const before = field.map((particle) => particle.renderY)
  stepField(field, { ...input, scrollY })

  const sums = new Array<number>(LAYER_COUNT).fill(0)
  const counts = new Array<number>(LAYER_COUNT).fill(0)
  field.forEach((particle, index) => {
    const moved = Math.abs(particle.renderY - before[index])
    // 跨过接缝的那几颗会「跳」一整圈，和滚动位移无关，剔除
    if (moved > 2000) return
    sums[particle.layer] += moved
    counts[particle.layer] += 1
  })
  return sums.map((sum, layer) => ({ layer, shift: counts[layer] > 0 ? sum / counts[layer] : 0 }))
}

console.log(
  'viewport     n   每层颗数      layoutMax 4层% 5层% 覆盖  | runtimeMax 4层% 5层%  色数 同色相交 孤立  叠压  首帧α 静止px/s 鼠标px/s 滚动px/s 重生',
)

const failures: string[] = []

for (const bounds of VIEWPORTS) {
  const trials: Trial[] = []
  for (let i = 0; i < TRIALS; i++) trials.push(runTrial(bounds))

  const worst = (pick: (trial: Trial) => number) => Math.max(...trials.map(pick))
  const average = (pick: (trial: Trial) => number) =>
    trials.reduce((sum, trial) => sum + pick(trial), 0) / trials.length

  const row = {
    layoutMax: worst((t) => t.layout.max),
    layoutDeep: worst((t) => t.layout.deepArea),
    layoutUltra: worst((t) => t.layout.ultraArea),
    coverage: average((t) => t.layout.coverage),
    runtimeMax: worst((t) => t.runtimeMax),
    deepArea: worst((t) => t.deepArea),
    ultraArea: worst((t) => t.ultraArea),
    colors: average((t) => t.colors),
    sameColorPairs: average((t) => t.sameColorPairs),
    isolated: average((t) => t.isolated),
    stacked: average((t) => t.stacked),
    alpha: worst((t) => t.alphaOnFirstFrame),
    ambient: worst((t) => t.ambientSpeed),
    pointer: worst((t) => t.pointerSpeed),
    scroll: worst((t) => t.scrollSpeed),
    births: trials.reduce((sum, t) => sum + t.births, 0),
    layers: trials[0].layers,
    count: trials[0].count,
  }

  const label = `${bounds.width}x${bounds.height}`
  console.log(
    [
      label.padEnd(12),
      String(row.count).padEnd(3),
      row.layers.join('/').padEnd(13),
      String(row.layoutMax).padEnd(10),
      `${(row.layoutDeep * 100).toFixed(1)}%`.padEnd(8),
      `${(row.layoutUltra * 100).toFixed(2)}%`.padEnd(6),
      `${(row.coverage * 100).toFixed(0)}%`.padEnd(4),
      '|',
      String(row.runtimeMax).padEnd(10),
      `${(row.deepArea * 100).toFixed(1)}%`.padEnd(5),
      `${(row.ultraArea * 100).toFixed(2)}%`.padEnd(5),
      row.colors.toFixed(1).padEnd(5),
      row.sameColorPairs.toFixed(2).padEnd(9),
      `${(row.isolated * 100).toFixed(0)}%`.padEnd(5),
      `${(row.stacked * 100).toFixed(0)}%`.padEnd(5),
      row.alpha.toFixed(3).padEnd(6),
      row.ambient.toFixed(0).padEnd(8),
      row.pointer.toFixed(0).padEnd(8),
      row.scroll.toFixed(0).padEnd(8),
      String(row.births),
    ].join(' '),
  )

  if (row.layoutDeep > MAX_DEEP_AREA) {
    failures.push(`${label} 静止时 4 层以上面积 ${(row.layoutDeep * 100).toFixed(1)}% > ${MAX_DEEP_AREA * 100}%`)
  }
  if (row.deepArea > MAX_DEEP_AREA) {
    failures.push(`${label} 运行时 4 层以上面积 ${(row.deepArea * 100).toFixed(1)}% > ${MAX_DEEP_AREA * 100}%`)
  }
  // 运行中的推挤/回绕会让个别边角临时多压一层，所以判据看「面积」而不是「最深的那个格子」；
  // 但真正的堆叠上限仍不允许被突破两档以上。
  if (row.runtimeMax > HARD_STACK + 1) {
    failures.push(`${label} 运行时堆叠达到 ${row.runtimeMax} 层 > ${HARD_STACK + 1}`)
  }
  if (row.ultraArea > MAX_ULTRA_AREA) {
    failures.push(`${label} 运行时 5 层以上面积 ${(row.ultraArea * 100).toFixed(2)}% > ${MAX_ULTRA_AREA * 100}%`)
  }
  if (row.alpha > 0.06) {
    failures.push(`${label} 出场首帧透明度 ${row.alpha.toFixed(3)}，看起来会像突然出现`)
  }
  if (row.ambient > MAX_AMBIENT_SPEED) {
    failures.push(`${label} 静止漂浮 ${row.ambient.toFixed(0)}px/s > ${MAX_AMBIENT_SPEED}`)
  }
  if (row.pointer > MAX_POINTER_SPEED) {
    failures.push(`${label} 鼠标推挤 ${row.pointer.toFixed(0)}px/s > ${MAX_POINTER_SPEED}`)
  }
  if (row.scroll > MAX_SCROLL_SPEED) {
    failures.push(`${label} 滚动视差 ${row.scroll.toFixed(0)}px/s > ${MAX_SCROLL_SPEED}`)
  }
  if (row.isolated > 0.75) {
    failures.push(`${label} 孤立粒子占 ${(row.isolated * 100).toFixed(0)}%：粒子太散，留白过大`)
  }
  if (row.coverage > 0.6) {
    failures.push(`${label} 覆盖率 ${(row.coverage * 100).toFixed(0)}%：太满，缺少留白`)
  }
}

const parallax = measureLayerParallax()
const shifts = parallax.map((item) => item.shift)
const ratios = shifts.slice(1).map((shift, index) => shift / Math.max(0.001, shifts[index]))
const nearFar = shifts[shifts.length - 1] / Math.max(0.001, shifts[0])
const ratioSpread = Math.max(...ratios) / Math.min(...ratios)

console.log(
  `\n镜头视差（镜头推到 ±1 时各层位移）：${shifts.map((shift, layer) => `${layer}层 ${shift.toFixed(1)}px`).join('  ')}`,
)

const scrollShifts = measureScrollParallax(1000).map((item) => item.shift)
console.log(
  `滚动视差（页面滚动 1000px 时各层位移）：${scrollShifts.map((shift, layer) => `${layer}层 ${shift.toFixed(1)}px`).join('  ')}`,
)
// 滚动视差必须逐层递增：五层各走各的速度才是三维空间里的透视
for (let layer = 1; layer < scrollShifts.length; layer++) {
  if (scrollShifts[layer] <= scrollShifts[layer - 1]) {
    failures.push(`滚动视差不是逐层递增：${layer - 1} 层 → ${layer} 层`)
  }
}
console.log(
  `相邻层速度比：${ratios.map((ratio) => `${ratio.toFixed(2)}×`).join('  ')}；近/远 = ${nearFar.toFixed(2)}×`,
)

for (let layer = 1; layer < shifts.length; layer++) {
  if (shifts[layer] <= shifts[layer - 1]) {
    failures.push(`镜头视差不是逐层递增：${layer - 1} 层 ${shifts[layer - 1].toFixed(1)}px → ${layer} 层 ${shifts[layer].toFixed(1)}px`)
  }
}
if (nearFar < 4 || nearFar > 10) {
  failures.push(`近/远层速度比 ${nearFar.toFixed(2)}× 不在 4~10× 之间，视差层次不明显`)
}
if (ratioSpread > 1.25) {
  failures.push(`相邻层速度比不均匀（${ratioSpread.toFixed(2)}× 波动），应该成等比而不是等差`)
}

/**
 * 边缘加权是否生效：统计粒子中心「离最近那条边有多近」（0 正中、1 贴边）的平均值。
 * 纯均匀分布的理论值是 2/3 ≈ 0.667 扣掉中心区域后的实测基准约 0.59，
 * 有边缘加成时会略高于这个基准。
 */
function edgeScoreMean(): number {
  const bounds: Bounds = { width: 1440, height: 900 }
  let sum = 0
  let count = 0
  for (let trial = 0; trial < 2000; trial++) {
    for (const particle of createField(bounds)) {
      const centerX = Math.min(1, Math.abs(((particle.anchorX + particle.size / 2) / bounds.width) * 2 - 1))
      const centerY = Math.min(1, Math.abs(((particle.anchorY + particle.size / 2) / bounds.height) * 2 - 1))
      sum += Math.max(centerX, centerY)
      count++
    }
  }
  return sum / count
}

console.log(
  `\n边缘加权：平均边缘度 ${edgeScoreMean().toFixed(4)}（越靠边 / 四角权重越高，中心不禁止；关掉加成时约 0.5937）`,
)
const journey = measureScrollJourney()
console.log(
  `\n连续滚动 ${journey.distance.toFixed(0)}px：可见粒子 ${journey.minVisible}~${journey.maxVisible} 颗，` +
    `帧间最大位移 ${journey.maxJump.toFixed(2)}px（回绕应只发生在屏幕外），` +
    `最空一条横带覆盖率 ${(journey.minBandCoverage * 100).toFixed(0)}%`,
)
if (journey.minBandCoverage < 0.08) {
  failures.push(`滚动时出现大面积空白：最空的一条横带覆盖率只有 ${(journey.minBandCoverage * 100).toFixed(0)}%`)
}
if (journey.maxJump > 50) {
  failures.push(`连续滚动中屏幕内出现 ${journey.maxJump.toFixed(1)}px 的跳变：回绕跑到视口里了`)
}
if (journey.minVisible < journey.maxVisible * 0.5) {
  failures.push(`连续滚动后可见粒子从 ${journey.maxVisible} 掉到 ${journey.minVisible}：环带没有补上粒子`)
}

console.log(`\n${layerSummary()}`)
console.log(
  `粒子数 / 尺寸系数：${VIEWPORTS.map((v) => `${v.width}x${v.height}=${fieldCount(v)}/${fieldSizeScale(v).toFixed(2)}`).join('  ')}`,
)

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} 项不达标：`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('\n✓ 全部指标达标')
