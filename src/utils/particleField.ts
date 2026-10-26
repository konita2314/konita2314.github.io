/**
 * 粒子背景的纯逻辑层：分层 → 布局 → 物理 → 生命周期 → 配色。
 *
 * 不依赖 Vue / DOM，组件只负责把算好的状态画出来，
 * 所以「同一处最多叠几颗」「每秒漂移多少像素」这类 UX 约束可以脱离浏览器校验。
 *
 * 场景模型（想象五层玻璃，一层比一层近）：
 * - 5 个层级：越大越远，越小越近；越近的粒子越先出现、对镜头移动的反应也越大；
 * - 布局是「加权随机 + 轻微排斥」：先按权重自然成团，再把叠得过实的粒子轻轻推开；
 * - anchor 是粒子的家，一轮寿命里只在附近漂浮，不会自己走出屏幕；
 * - 鼠标给一个「推挤弹簧」的平衡点，靠弹簧-阻尼过渡出去、再自然回位；
 * - 镜头随指针相对屏幕中心的位置轻微平移，各层位移不同 → 视差，画面才有厚度；
 * - 粒子有寿命：模糊淡出 → 换个位置 → 模糊淡入，全程没有瞬移和硬切换。
 */

export type ParticleTheme = 'light' | 'dark'

export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Bounds {
  width: number
  height: number
}

export interface ParticlePalette {
  /** 静止状态的基础透明度 */
  alpha: number
  colors: readonly Rgb[]
  /** 合成方式：深色底用 screen 让重叠处发亮，浅色底正常叠加 */
  blend: 'source-over' | 'screen'
}

export interface Particle {
  /** 层级：0 最大最远，LAYER_COUNT-1 最小最近 */
  layer: number
  /** 0 = 远景，1 = 近景；由层级推导，控制透明度、漂移、视差与推挤 */
  depth: number
  /** 静止锚点（左上角），漂移与推挤都在它附近的小范围内 */
  anchorX: number
  anchorY: number
  size: number
  colorIndex: number
  color: Rgb
  colorFrom: Rgb
  colorTo: Rgb
  /** 颜色过渡进度 0..1 */
  colorT: number
  /** 换色前的等待（秒）与过渡时长（秒）：每颗粒子都不一样，换色才会「一波接一波」 */
  colorDelay: number
  colorFade: number
  /** 颜色每变一次就 +1，渲染层据此让缓存的模糊贴图失效 */
  colorVersion: number
  colorKey: number
  /** 缓存好的 rgb(...) 字符串，避免每帧拼接 */
  colorCss: string
  /** 相对锚点的弹簧位移 */
  offsetX: number
  offsetY: number
  velX: number
  velY: number
  /** 环境漂浮的相位（四个错开的频率各用一个） */
  phase: [number, number, number, number]
  driftAmp: number
  /** 本层的镜头视差幅度（px，PARALLAX_REF 视口下的值，运行时按视口等比换算） */
  parallax: number
  /** 本层跟随页面滚动的比例：近层让得多、远层几乎不动 */
  scrollFactor: number
  state: 'in' | 'alive' | 'out'
  /** 当前状态内的时间（秒；出生前为负数，用来错峰出场） */
  age: number
  life: number
  /** 本层从模糊到清晰需要的时间（远层更慢） */
  focusIn: number
  /** 由 age 推导的可视状态：0 = 重模糊，1 = 清晰 */
  focus: number
  alpha: number
  /** 本帧最终位置（左上角），渲染层直接用 */
  renderX: number
  renderY: number
}

export interface PointerState {
  x: number
  y: number
  active: boolean
  /** 0..1，指针移动强度（停下后衰减），决定推挤力度 */
  energy: number
}

export interface FieldInput {
  /** 单调递增的秒数 */
  time: number
  /** 帧间隔（秒，调用方已钳制到 0.05 以内） */
  dt: number
  bounds: Bounds
  pointer: PointerState
  /** 镜头位置（相对屏幕中心，-1..1）：各层按远近反向平移，形成视差 */
  camera: { x: number; y: number }
  /**
   * 页面滚动位置（px）。滚动是无限制的，所以竖直方向按「环带」处理：
   * 完全离开视口之后才回绕到另一侧，且落点同样在视口外 —— 永远看不到跳变。
   */
  scrollY: number
  /** 竖直环带长度：粒子位置按它取模，滚动多远都在环带里循环 */
  wrapSpan: number
  /** 当前主题：重生时按主题取对应亮度的颜色 */
  theme: ParticleTheme
}

/** 环带比视口多出来的那一段（全部落在屏幕外） */
export const WRAP_MARGIN = 40

// ---------------------------------------------------------------------------
// 配色
// ---------------------------------------------------------------------------

const COLOR_POOL: readonly Rgb[] = [
  { r: 96, g: 165, b: 250 }, // 蓝
  { r: 52, g: 211, b: 153 }, // 绿
  { r: 251, g: 191, b: 36 }, // 黄
  { r: 236, g: 72, b: 153 }, // 粉
  { r: 168, g: 85, b: 247 }, // 紫
  { r: 249, g: 115, b: 22 }, // 橙
]

/**
 * 深色模式的同一组色相（更亮）：切换主题时每颗粒子只在「自己这一色」的深浅两版之间过渡，
 * 不会跳到别的颜色上去。
 */
const COLOR_POOL_DARK: readonly Rgb[] = [
  { r: 147, g: 197, b: 253 }, // 蓝
  { r: 110, g: 231, b: 183 }, // 绿
  { r: 253, g: 224, b: 71 }, // 黄
  { r: 251, g: 113, b: 133 }, // 粉
  { r: 192, g: 132, b: 252 }, // 紫
  { r: 253, g: 186, b: 116 }, // 橙
]

/**
 * 两种主题：浅色底正常叠加（半透明淡彩）；
 * 深色底改用 screen 混合 + 更高透明度 —— 重叠处越叠越亮，像彩色玻璃，而不是糊上一层灰。
 * 两条 colors 数组索引一一对应，换主题时只改「亮度版本」，色相不变。
 */
export const PARTICLE_PALETTES: Record<ParticleTheme, ParticlePalette> = {
  dark: { alpha: 0.34, colors: COLOR_POOL_DARK, blend: 'screen' },
  light: { alpha: 0.1, colors: COLOR_POOL, blend: 'source-over' },
}

/** 按主题取某个色相索引对应的颜色 */
function paletteColor(theme: ParticleTheme, index: number): Rgb {
  return PARTICLE_PALETTES[theme].colors[index] ?? COLOR_POOL[index]
}

/** 统一在这里拼颜色串，渲染层直接用缓存好的结果 */
export function rgbCss(color: Rgb): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`
}

// ---------------------------------------------------------------------------
// 五个层级：越大越远，越小越近（数值即 UX）
// ---------------------------------------------------------------------------

export const LAYER_COUNT = 5

interface LayerSpec {
  /** 该层粒子的基准边长（会再乘视口缩放系数） */
  size: number
  /** 出场延迟：越小的粒子越先出现 */
  delay: number
  /** 从重模糊到清晰需要的时间：远层更慢，像镜头慢慢合焦 */
  focus: number
}

const LAYERS: readonly LayerSpec[] = [
  { size: 320, delay: 0.52, focus: 1.75 },
  { size: 262, delay: 0.39, focus: 1.65 },
  { size: 212, delay: 0.26, focus: 1.55 },
  { size: 172, delay: 0.13, focus: 1.45 },
  { size: 138, delay: 0, focus: 1.35 },
]

/**
 * 镜头视差幅度（px）：镜头推到 ±1 时，最近 / 最远一层各自的最大位移。
 *
 * 真实透视里，屏幕位移 ∝ 1 / 距离。五层玻璃按「距离成等比」摆放，
 * 各层位移也就该成等比：相邻两层的速度比恒定。
 * （线性递减会把远层之间拉得很开、近层之间几乎没差别，正是「不像五层」的原因。）
 *
 * 这两个数是 PARALLAX_REF 视口下的像素值；其它尺寸按视口等比换算（见 stepField），
 * 否则同一段倾斜在大屏（iPad）上几乎看不出来、在手机上又晃得厉害。
 */
const PARALLAX_NEAR = 30
const PARALLAX_FAR = 5

/** 视差换算的基准视口：这组尺寸下 30px / 5px 就是屏幕上真实的像素数 */
export const PARALLAX_REF: Bounds = { width: 1280, height: 800 }

/** 景深 0..1 → 相对最近层的视差系数：最远层只有最近层的 1/6 速度 */
function parallaxFactor(depth: number): number {
  return Math.pow(PARALLAX_FAR / PARALLAX_NEAR, 1 - depth)
}

/**
 * 滚动视差：页面每滚动 1px，各层在屏幕上让开多少 px。
 *
 * 和镜头视差同一套「1/距离」逻辑：近层让得多、远层让得少，所以滚动时
 * 五层不是整体平移，而是各走各的速度 —— 这正是三维空间里应有的视差。
 * 注意这也意味着长距离滚动后层与层会错开一段（物理上本来就该如此），
 * 初始构图的堆叠约束只在第一屏严格成立。
 */
const SCROLL_NEAR = 0.2
const SCROLL_FAR = 0.075

// ---------------------------------------------------------------------------
// 其它调参常量
// ---------------------------------------------------------------------------

/** 清晰 → 模糊 → 消失的退场时长 */
const FOCUS_OUT = 2.6
/** 一轮寿命：到期后淡出、换位、再淡入 */
const LIFE_MIN = 34
const LIFE_MAX = 74
/** 同层内相邻两颗的出场间隔 */
const STAGGER = 0.06

/** 弹簧位移上限：鼠标再快也不会把粒子甩出画面 */
const MAX_OFFSET = 92
/** 推挤弹簧的刚度 / 阻尼（ζ ≈ 0.7，略欠阻尼，回位时有一点水的余韵） */
const SPRING_STIFFNESS = 7.2
const SPRING_DAMPING = 3.7
/** 布局后把「叠得太实」的粒子推开的迭代次数 */
const RELAX_ITERATIONS = 4
/** 两颗粒子在较浅那根轴上最多叠到较小边长的多少（超过就互相排斥） */
const MAX_PAIR_OVERLAP = 0.65
/** 加权随机：多大的概率把粒子撒进「热点」附近（其余均匀） */
const CLUMP_CHANCE = 0.5
/** 边缘 / 四角的生成权重加成：中心 1.0，贴边 1 + 这个值 */
const EDGE_BOOST = 0.2
/** 堆叠统计用的网格边长（px） */
const COVERAGE_CELL = 12
/** 静止时希望的最大堆叠数 */
export const TARGET_STACK = 3
/** 绝对上限（运动叠加后也不该超过） */
export const HARD_STACK = 5

const TAU = Math.PI * 2

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value
}

/** 0→1 平滑过渡，两端导数为 0 */
function smoothstep01(value: number): number {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

function easeInOutCubic(value: number): number {
  const t = clamp01(value)
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// ---------------------------------------------------------------------------
// 覆盖网格：直接回答「这个矩形最多压着几颗粒子」
// ---------------------------------------------------------------------------

interface CoverageGrid {
  cell: number
  cols: number
  rows: number
  stack: Uint8Array
}

function createCoverageGrid(bounds: Bounds, cell = COVERAGE_CELL): CoverageGrid {
  const cols = Math.max(1, Math.ceil(bounds.width / cell))
  const rows = Math.max(1, Math.ceil(bounds.height / cell))
  return { cell, cols, rows, stack: new Uint8Array(cols * rows) }
}

interface CellRange {
  c0: number
  c1: number
  r0: number
  r1: number
}

function cellRange(grid: CoverageGrid, x: number, y: number, size: number): CellRange | null {
  const c0 = Math.max(0, Math.floor(x / grid.cell))
  const c1 = Math.min(grid.cols - 1, Math.ceil((x + size) / grid.cell) - 1)
  const r0 = Math.max(0, Math.floor(y / grid.cell))
  const r1 = Math.min(grid.rows - 1, Math.ceil((y + size) / grid.cell) - 1)
  if (c1 < c0 || r1 < r0) return null
  return { c0, c1, r0, r1 }
}

function paintRect(grid: CoverageGrid, x: number, y: number, size: number): void {
  const range = cellRange(grid, x, y, size)
  if (!range) return
  for (let row = range.r0; row <= range.r1; row++) {
    const base = row * grid.cols
    for (let col = range.c0; col <= range.c1; col++) grid.stack[base + col] += 1
  }
}

/**
 * 这块矩形压到「已经叠满 threshold 层」的那部分面积占比。
 *
 * 为什么不用「矩形里最深的一个格子」判断：
 * 对 350px 的方框来说，只要屏幕角落有一点点 3 层叠压，整个矩形就永远不合格，
 * 于是大粒子被逼到无处可去。真正影响观感的是「有多少面积叠成一片」，
 * 所以这里按面积算，边角的细缝不算一层。
 */
function stackRatio(
  grid: CoverageGrid,
  x: number,
  y: number,
  size: number,
  threshold: number,
): number {
  const range = cellRange(grid, x, y, size)
  if (!range) return 0
  let deep = 0
  let total = 0
  for (let row = range.r0; row <= range.r1; row++) {
    const base = row * grid.cols
    for (let col = range.c0; col <= range.c1; col++) {
      total++
      if (grid.stack[base + col] >= threshold) deep++
    }
  }
  return total > 0 ? deep / total : 0
}


/** 对一组矩形做堆叠统计（npm run verify:field 用它校验约束） */
export function measureStack(
  bounds: Bounds,
  boxes: readonly { x: number; y: number; size: number }[],
  cell = COVERAGE_CELL,
): { max: number; mean: number; coverage: number; deepArea: number; ultraArea: number } {
  const grid = createCoverageGrid(bounds, cell)
  for (const box of boxes) paintRect(grid, box.x, box.y, box.size)
  let max = 0
  let sum = 0
  let painted = 0
  let deep = 0
  let ultra = 0
  for (let i = 0; i < grid.stack.length; i++) {
    const value = grid.stack[i]
    if (value > max) max = value
    if (value > 0) {
      sum += value
      painted++
    }
    if (value > TARGET_STACK) deep++
    if (value > TARGET_STACK + 1) ultra++
  }
  const cells = grid.cols * grid.rows
  return {
    max,
    mean: sum / cells,
    coverage: painted / cells,
    deepArea: deep / cells,
    ultraArea: ultra / cells,
  }
}

// ---------------------------------------------------------------------------
// 数量与尺寸
// ---------------------------------------------------------------------------

/** 视口越大粒子越多；上下限压住绘制与重叠成本 */
export function fieldCount(bounds: Bounds): number {
  const area = bounds.width * bounds.height
  return clamp(Math.round(area / 95_000), 14, 52)
}

/**
 * 竖直环带长度 = 视口高 + 最大粒子 + 两倍余量。
 *
 * 环带里的位置按模循环，视口对应环带的**最下面一段**：
 * 粒子从顶部滚出去后会在环带上半段（屏幕外）继续走，走到底再回到视口下沿。
 * 这样每颗粒子都保留自己的相位 —— 不会所有粒子挤在同一条线上「排队入场」。
 */
export function worldSpan(bounds: Bounds): number {
  const maxSize = LAYERS[0].size * fieldSizeScale(bounds) * 1.1
  return bounds.height + maxSize + WRAP_MARGIN * 2
}

/**
 * 小屏等比例收缩粒子，否则手机上一颗就糊满屏。
 * 用短边而不是面积：面积会同时压小粒子数和尺寸，导致小窗口双重缩水、背景变空。
 */
export function fieldSizeScale(bounds: Bounds): number {
  const side = Math.min(bounds.width, bounds.height)
  return clamp(side / 900, 0.45, 1.1)
}



/**
 * 按层级分配数量。
 * 权重取 1/尺寸：越大的一层颗数越少，各层覆盖面积才接近，
 * 否则远景大粒子一多就把整屏糊满，近景反倒空。
 */
function distributeCounts(total: number): number[] {
  const weights = LAYERS.map((spec) => 1 / spec.size)
  const sum = weights.reduce((acc, weight) => acc + weight, 0)
  const exact = weights.map((weight) => (weight / sum) * total)
  const counts = exact.map((value) => Math.floor(value))

  let remainder = total - counts.reduce((acc, value) => acc + value, 0)
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
  for (let i = 0; i < order.length && remainder > 0; i++, remainder--) counts[order[i].index] += 1
  return counts
}

// ---------------------------------------------------------------------------
// 加权随机：几团「热点」+ 均匀底噪
// ---------------------------------------------------------------------------

interface DensityBlob {
  x: number
  y: number
  radius: number
}

interface Density {
  blobs: DensityBlob[]
  chance: number
}

/**
 * 每块场地随机撒 4~6 个热点，采样时按概率落进热点附近，否则全屏均匀。
 * 这就是「有权重的随机」：局部自然成团、局部留白，
 * 而不是均匀网格（太规矩）或纯随机（必然糊成一团）。
 */
function createDensity(bounds: Bounds): Density {
  const count = 4 + Math.floor(Math.random() * 3)
  const minSide = Math.min(bounds.width, bounds.height)
  const blobs: DensityBlob[] = []
  for (let i = 0; i < count; i++) {
    blobs.push({
      x: rand(0.08, 0.92) * bounds.width,
      y: rand(0.08, 0.92) * bounds.height,
      radius: minSide * rand(0.3, 0.55),
    })
  }
  return { blobs, chance: CLUMP_CHANCE }
}

/** 单轴取点：允许少量出血（粒子一部分在屏幕外），视口比粒子还小时居中 */
function sampleAxis(limit: number, size: number): number {
  const bleed = size * 0.16
  const span = limit + bleed * 2 - size
  if (span <= 0) return (limit - size) / 2
  return -bleed + Math.random() * span
}

/** 按热点权重取一个左上角坐标（不含边缘加成） */
function rawSample(bounds: Bounds, size: number, density: Density): { x: number; y: number } {
  if (density.blobs.length > 0 && Math.random() < density.chance) {
    const blob = density.blobs[Math.floor(Math.random() * density.blobs.length)]
    // 两个均匀分布相加 ≈ 三角分布：够像高斯，也不会拖出屏幕
    const offsetX = (Math.random() + Math.random() - 1) * blob.radius
    const offsetY = (Math.random() + Math.random() - 1) * blob.radius
    const centerX = clamp(blob.x + offsetX, -size * 0.25, Math.max(-size * 0.25, bounds.width - size * 0.75))
    const centerY = clamp(blob.y + offsetY, -size * 0.25, Math.max(-size * 0.25, bounds.height - size * 0.75))
    return { x: centerX - size * 0.5, y: centerY - size * 0.5 }
  }
  return { x: sampleAxis(bounds.width, size), y: sampleAxis(bounds.height, size) }
}

/**
 * 边缘 / 四角的生成权重。
 * 正中是 1.0，越贴边越高（+EDGE_BOOST）。只是「略微偏爱」，
 * 不禁止中心 —— 中间该有粒子照样有。
 */
function edgeWeight(bounds: Bounds, x: number, y: number, size: number): number {
  const centerX = Math.min(1, Math.abs(((x + size * 0.5) / bounds.width) * 2 - 1))
  const centerY = Math.min(1, Math.abs(((y + size * 0.5) / bounds.height) * 2 - 1))
  // 取「离最近那条边有多近」：0 = 正中，1 = 贴边或四角
  return 1 + EDGE_BOOST * Math.max(centerX, centerY)
}

/**
 * 加权采样：先按热点抽点，再按边缘权重做一次拒绝采样。
 * 接受概率 = w / 最大 w（中心 ≈0.86、贴边 1.0），
 * 于是边缘和四角的生成概率相对高出 EDGE_BOOST，而中心不会被排除。
 */
function sampleWeighted(bounds: Bounds, size: number, density: Density): { x: number; y: number } {
  for (let attempt = 0; attempt < 6; attempt++) {
    const point = rawSample(bounds, size, density)
    if (Math.random() < edgeWeight(bounds, point.x, point.y, size) / (1 + EDGE_BOOST)) return point
  }
  return rawSample(bounds, size, density)
}

// ---------------------------------------------------------------------------
// 放置：加权随机 + 堆叠上限
// ---------------------------------------------------------------------------

/** 挑好的落点 */
interface AnchorSpot {
  x: number
  y: number
}

interface AnchorOptions {
  size: number
  bounds: Bounds
  /** 已经放好的粒子（用来算堆叠层数） */
  neighbors: readonly Particle[]
  /** 加权随机的热点；不传则全屏均匀 */
  density?: Density | null
  /** 换位重生时要排除的自己 */
  avoid?: Particle | null
}

/** 单颗粒子最多试多少次落点（拒绝采样） */
const PLACE_ATTEMPTS = 40
/** 新粒子最多允许压到「3 层区域」上的面积占比 */
const MAX_DEEP_RATIO = 0.05
/** 压到「4 层区域」上的面积占比上限：保证 5 层只可能是极小的边角 */
const MAX_ULTRA_RATIO = 0.004

interface StackCost {
  /** 压在已经 3 层区域上的面积占比 */
  deep: number
  /** 压在已经 4 层区域上的面积占比 */
  ultra: number
}

function stackCost(grid: CoverageGrid, x: number, y: number, size: number): StackCost {
  return {
    deep: stackRatio(grid, x, y, size, TARGET_STACK),
    ultra: stackRatio(grid, x, y, size, TARGET_STACK + 1),
  }
}

function isAcceptable(cost: StackCost): boolean {
  return cost.ultra <= MAX_ULTRA_RATIO && cost.deep <= MAX_DEEP_RATIO
}


/**
 * 挑落点：按权重拒绝采样。
 *
 * 关键差别 —— 以前是「抽 40 个点再选最空的」，那等于一直在摊均匀；
 * 现在是「抽一个点，只要没叠成一片就直接用」。
 * 于是位置服从加权随机分布：该成团的地方成团、该留白的地方留白，
 * 只有「一大片面积已经叠了 3 层」这种位置才会被拒绝。
 */
function pickAnchor(options: AnchorOptions): AnchorSpot {
  const { size, bounds } = options
  const avoid = options.avoid ?? null
  const minTravel = Math.min(bounds.width, bounds.height) * 0.18
  const density = options.density ?? { blobs: [], chance: 0 }

  const grid = createCoverageGrid(bounds)
  for (const other of options.neighbors) {
    if (other === avoid) continue
    paintRect(grid, other.anchorX, other.anchorY, other.size)
  }

  let soft: AnchorSpot | null = null
  let loose: AnchorSpot | null = null
  let looseDeep = Number.POSITIVE_INFINITY

  for (let attempt = 0; attempt < PLACE_ATTEMPTS; attempt++) {
    const { x, y } = sampleWeighted(bounds, size, density)
    const cost = stackCost(grid, x, y, size)

    if (!isAcceptable(cost)) {
      if (cost.deep < looseDeep) {
        looseDeep = cost.deep
        loose = { x, y }
      }
      continue
    }

    // 软约束：重生时别在原地复活 —— 只重试，不禁止
    const tooClose = avoid !== null && Math.hypot(x - avoid.anchorX, y - avoid.anchorY) < minTravel
    if (!tooClose) return { x, y }
    if (!soft) soft = { x, y }
  }

  if (soft) return soft
  if (loose) return loose

  // 极端情况（热点被塞满、处处叠满）：退回全屏均匀采样里最松的一个
  let fallback: AnchorSpot = { x: 0, y: 0 }
  let fallbackDeep = Number.POSITIVE_INFINITY
  for (let attempt = 0; attempt < PLACE_ATTEMPTS; attempt++) {
    const x = sampleAxis(bounds.width, size)
    const y = sampleAxis(bounds.height, size)
    const deep = stackRatio(grid, x, y, size, TARGET_STACK)
    if (deep < fallbackDeep) {
      fallbackDeep = deep
      fallback = { x, y }
    }
  }
  return fallback
}
// ---------------------------------------------------------------------------
// 轻微排斥：只推「叠得太实」的粒子，其余毫发无损
// ---------------------------------------------------------------------------

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const temp = items[i]
    items[i] = items[j]
    items[j] = temp
  }
  return items
}

function keepInBounds(particle: Particle, bounds: Bounds): void {
  const marginX = particle.size * 0.35
  const minX = -marginX
  const maxX = bounds.width - particle.size + marginX
  particle.anchorX = maxX < minX ? (bounds.width - particle.size) * 0.5 : clamp(particle.anchorX, minX, maxX)

  const marginY = particle.size * 0.35
  const minY = -marginY
  const maxY = bounds.height - particle.size + marginY
  particle.anchorY = maxY < minY ? (bounds.height - particle.size) * 0.5 : clamp(particle.anchorY, minY, maxY)
}

/**
 * 布局收尾 1：两两检查，叠得超过 MAX_PAIR_OVERLAP 的轻轻推开。
 * 每次推的位移很小，只解决「几乎重合」这种硬伤，
 * 不会把成团的粒子摊平成均匀网格 —— 那正是要避免的。
 */
function relaxField(field: Particle[], bounds: Bounds): void {
  for (let iteration = 0; iteration < RELAX_ITERATIONS; iteration++) {
    for (let i = 0; i < field.length; i++) {
      for (let j = i + 1; j < field.length; j++) {
        const a = field[i]
        const b = field[j]
        const minSide = Math.min(a.size, b.size)
        const centerAX = a.anchorX + a.size * 0.5
        const centerAY = a.anchorY + a.size * 0.5
        const centerBX = b.anchorX + b.size * 0.5
        const centerBY = b.anchorY + b.size * 0.5
        const dx = centerBX - centerAX
        const dy = centerBY - centerAY
        const overlapX = (a.size + b.size) * 0.5 - Math.abs(dx)
        const overlapY = (a.size + b.size) * 0.5 - Math.abs(dy)
        if (overlapX <= 0 || overlapY <= 0) continue

        const overlapRatio = Math.min(overlapX, overlapY) / minSide
        if (overlapRatio <= MAX_PAIR_OVERLAP) continue

        const push = (overlapRatio - MAX_PAIR_OVERLAP) * minSide * 0.5
        const length = Math.hypot(dx, dy)
        const ux = length > 0.001 ? dx / length : Math.random() - 0.5
        const uy = length > 0.001 ? dy / length : Math.random() - 0.5
        a.anchorX -= ux * push
        a.anchorY -= uy * push
        b.anchorX += ux * push
        b.anchorY += uy * push
      }
    }
    for (const particle of field) keepInBounds(particle, bounds)
  }
}

/**
 * 布局收尾 2：按随机顺序重新「登记」一遍，谁放上去会超过 TARGET_STACK 层，
 * 就在自己附近找个更松的位置挪一点。保证硬约束，同时不动大格局。
 */
/** 环形搜索：从近到远找第一个「放下去不会叠成一片」的位置 */
function searchFreeSpot(
  grid: CoverageGrid,
  particle: Particle,
  bounds: Bounds,
): { x: number; y: number } | null {
  const radiusSteps = [0.2, 0.35, 0.5, 0.7, 0.9, 1.15]
  const angleSteps = 8

  for (const step of radiusSteps) {
    for (let i = 0; i < angleSteps; i++) {
      const angle = (i / angleSteps) * TAU + Math.random() * 0.3
      const radius = particle.size * step
      const x = particle.anchorX + Math.cos(angle) * radius
      const y = particle.anchorY + Math.sin(angle) * radius
      if (isAcceptable(stackCost(grid, x, y, particle.size))) return { x, y }
    }
  }

  // 附近没有空位：全屏扫一遍，找叠得最少的落点（失败路径，很少走到）
  const step = Math.max(grid.cell * 2, particle.size * 0.25)
  let best: { x: number; y: number; deep: number } | null = null
  for (let y = -particle.size * 0.3; y < bounds.height; y += step) {
    for (let x = -particle.size * 0.3; x < bounds.width; x += step) {
      const cost = stackCost(grid, x, y, particle.size)
      if (isAcceptable(cost)) return { x, y }
      if (!best || cost.deep < best.deep) best = { x, y, deep: cost.deep }
    }
  }
  return best ? { x: best.x, y: best.y } : null
}

/**
 * 布局收尾 2：按随机顺序重新「登记」一遍，谁放上去会叠成一片，
 * 就沿环形找最近的空位挪过去。保证面积口径的堆叠上限，同时不动大格局。
 */
function enforceStackLimit(field: Particle[], bounds: Bounds): void {
  for (let pass = 0; pass < 2; pass++) {
    const grid = createCoverageGrid(bounds)
    let violations = 0

    for (const particle of shuffle([...field])) {
      if (!isAcceptable(stackCost(grid, particle.anchorX, particle.anchorY, particle.size))) {
        const spot = searchFreeSpot(grid, particle, bounds)
        if (spot) {
          particle.anchorX = spot.x
          particle.anchorY = spot.y
          violations++
        }
      }
      paintRect(grid, particle.anchorX, particle.anchorY, particle.size)
    }

    if (violations === 0) break
  }
  for (const particle of field) keepInBounds(particle, bounds)
}
// ---------------------------------------------------------------------------
// 生成一整块粒子场
// ---------------------------------------------------------------------------

/** 配色时只需要位置和颜色，用最小接口描述，重生/换色都能复用 */
interface ColorSlot {
  anchorX: number
  anchorY: number
  size: number
  colorIndex: number
}

/**
 * 某个颜色的「代价」：全局用得越多越贵，附近已有同色越近越贵。
 * 两个代价一叠加，屏幕上的颜色自然会铺开，而不是随机撞成一片同色。
 */
function colorCost(
  slots: readonly ColorSlot[],
  anchorX: number,
  anchorY: number,
  size: number,
  candidate: number,
): number {
  const centerX = anchorX + size * 0.5
  const centerY = anchorY + size * 0.5
  let usage = 0
  let nearby = 0

  for (const slot of slots) {
    if (slot.colorIndex !== candidate) continue
    usage++
    const distance = Math.hypot(
      centerX - (slot.anchorX + slot.size * 0.5),
      centerY - (slot.anchorY + slot.size * 0.5),
    )
    // 「挨得近」的范围取两颗粒子尺寸和：同色只要离得近就算冲突
    const near = size + slot.size
    if (distance < near) {
      const weight = 1 - distance / near
      nearby += weight * weight * 5
      // 真的压在别人身上再重罚一次：同色重叠是最刺眼的一种
      if (distance < (size + slot.size) * 0.5) nearby += 8
    }
  }

  return nearby + usage * COLOR_POOL.length * 0.6
}

/**
 * 挑颜色：让「屏幕上出现的颜色尽量多」。
 * 先按远离同色的原则打分，得分相同时随机 —— 所以既有规律又不呆板。
 */
function pickColorIndex(slots: readonly ColorSlot[], anchorX: number, anchorY: number, size: number): number {
  let best = 0
  let bestCost = Number.POSITIVE_INFINITY
  for (const candidate of shuffle(COLOR_POOL.map((_, index) => index))) {
    const cost = colorCost(slots, anchorX, anchorY, size, candidate) + Math.random() * 0.6
    if (cost < bestCost) {
      bestCost = cost
      best = candidate
    }
  }
  return best
}

function syncColorKey(particle: Particle): void {
  const key = (particle.color.r << 16) | (particle.color.g << 8) | particle.color.b
  if (key === particle.colorKey) return
  particle.colorKey = key
  particle.colorVersion += 1
  particle.colorCss = rgbCss(particle.color)
}

interface CreateParticleOptions {
  anchor: AnchorSpot
  size: number
  layer: number
  colorIndex: number
  /** 当前主题下这个色相的具体颜色 */
  color: Rgb
  /** 同层内的出场序号，用来错峰 */
  index: number
}

function createParticle(options: CreateParticleOptions): Particle {
  const { anchor, size, layer, colorIndex, color, index } = options
  const spec = LAYERS[layer]
  const depth = LAYER_COUNT > 1 ? layer / (LAYER_COUNT - 1) : 1
  return {
    layer,
    depth,
    anchorX: anchor.x,
    anchorY: anchor.y,
    size,
    colorIndex,
    color: { ...color },
    colorFrom: { ...color },
    colorTo: { ...color },
    colorT: 1,
    colorDelay: 0,
    colorFade: 1,
    colorVersion: 0,
    colorKey: (color.r << 16) | (color.g << 8) | color.b,
    colorCss: rgbCss(color),
    offsetX: 0,
    offsetY: 0,
    velX: 0,
    velY: 0,
    phase: [rand(0, TAU), rand(0, TAU), rand(0, TAU), rand(0, TAU)],
    driftAmp: 9 + 21 * depth,
    parallax: PARALLAX_NEAR * parallaxFactor(depth),
    scrollFactor: SCROLL_NEAR * Math.pow(SCROLL_FAR / SCROLL_NEAR, 1 - depth),
    state: 'in',
    // 负数年龄 = 还没出生：先按层错峰（越小越先），再按同层序号微错开
    age: -(spec.delay + index * STAGGER),
    life: rand(LIFE_MIN, LIFE_MAX),
    focusIn: spec.focus,
    focus: 0,
    alpha: 0,
    renderX: anchor.x,
    renderY: anchor.y,
  }
}

/**
 * 生成一整块粒子场。
 *
 * 1. 五个层级各分到一批粒子（越大的一层颗数越少）；
 * 2. 每颗按「热点权重」随机落点，只受 TARGET_STACK 层硬约束；
 * 3. 轻推叠得过实的粒子，再把偶尔仍超限的挪开一点。
 * 结果是有疏有密的自然分布，而不是均匀网格，也不会糊成一团。
 */
export function createField(bounds: Bounds, worldHeight = bounds.height, theme: ParticleTheme = 'light'): Particle[] {
  // 布局铺满整个竖直环带：视口只显示环带最下面一段，上方的粒子已经排好队，
  // 滚动时是一整条均匀的环带在走，不会出现「下方突然空掉」。
  const world: Bounds = { width: bounds.width, height: worldHeight }
  const scale = fieldSizeScale(bounds)
  const counts = distributeCounts(fieldCount(world))
  const field: Particle[] = []

  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    const spec = LAYERS[layer]
    // 每层用自己的一组热点：各层的疏密位置不同，画面才不像一张平面贴图
    const density = createDensity(world)
    for (let index = 0; index < counts[layer]; index++) {
      const size = spec.size * scale * rand(0.9, 1.1)
      const anchor = pickAnchor({ size, bounds: world, neighbors: field, density })
      // 落点定了再挑颜色：和周围已有的颜色错开，屏幕上的色相才丰富
      const colorIndex = pickColorIndex(field, anchor.x, anchor.y, size)
      field.push(createParticle({ anchor, size, layer, colorIndex, index, color: paletteColor(theme, colorIndex) }))
    }
  }

  relaxField(field, world)
  enforceStackLimit(field, world)

  // 远处的先画，近处的压在上面 —— 层级顺序就是绘制顺序
  field.sort((a, b) => a.layer - b.layer)
  return field
}

// ---------------------------------------------------------------------------
// 生命周期
// ---------------------------------------------------------------------------

function respawn(particle: Particle, bounds: Bounds, field: readonly Particle[], theme: ParticleTheme): void {
  const spot = pickAnchor({
    size: particle.size,
    bounds,
    neighbors: field,
    density: createDensity(bounds),
    avoid: particle,
  })
  particle.anchorX = spot.x
  particle.anchorY = spot.y

  // 刚到新位置，顺便换一个和周围不撞的颜色（此时透明度为 0，看不出换色）
  const colorIndex = pickColorIndex(
    field.filter((other) => other !== particle),
    spot.x,
    spot.y,
    particle.size,
  )
  particle.colorIndex = colorIndex
  particle.color = { ...paletteColor(theme, colorIndex) }
  particle.colorFrom = { ...particle.color }
  particle.colorTo = { ...particle.color }
  particle.colorT = 1
  syncColorKey(particle)
  particle.offsetX = 0
  particle.offsetY = 0
  particle.velX = 0
  particle.velY = 0
  particle.phase = [rand(0, TAU), rand(0, TAU), rand(0, TAU), rand(0, TAU)]
  particle.state = 'in'
  particle.age = 0
  particle.life = rand(LIFE_MIN, LIFE_MAX)
  particle.focus = 0
  particle.alpha = 0
}

function advanceLifecycle(particle: Particle, input: FieldInput, field: readonly Particle[]): void {
  particle.age += input.dt

  if (particle.state === 'in') {
    const t = clamp01(particle.age / particle.focusIn)
    // 透明度稍快、焦点稍慢：先浮出一团虚影，再慢慢收实，不会「啪」地出现
    particle.focus = easeInOutCubic(t)
    particle.alpha = smoothstep01(clamp01(t / 0.55))
    if (t >= 1) {
      particle.state = 'alive'
      particle.age = 0
      particle.focus = 1
      particle.alpha = 1
    }
    return
  }

  if (particle.state === 'alive') {
    particle.focus = 1
    particle.alpha = 1
    if (particle.age >= particle.life) {
      particle.state = 'out'
      particle.age = 0
    }
    return
  }

  // out：入场动画的反向 —— 先保持不透明度、一路变糊，最后才淡出。
  // （之前是先行淡出，等真正糊起来时粒子已经几乎看不见了，所以「退场没有模糊感」。）
  const t = clamp01(particle.age / FOCUS_OUT)
  particle.focus = 1 - easeInOutCubic(clamp01(t / 0.78))
  particle.alpha = 1 - smoothstep01(clamp01((t - 0.3) / 0.7))
  if (t >= 1) {
    const span = input.wrapSpan > 0 ? input.wrapSpan : input.bounds.height
    respawn(particle, { width: input.bounds.width, height: span }, field, input.theme)
  }
}

// ---------------------------------------------------------------------------
// 物理
// ---------------------------------------------------------------------------

function advanceColor(particle: Particle, dt: number): void {
  if (particle.colorT >= 1) return
  if (particle.colorDelay > 0) {
    particle.colorDelay -= dt
    return
  }
  particle.colorT = Math.min(1, particle.colorT + dt / particle.colorFade)
  const t = smoothstep01(particle.colorT)
  particle.color = {
    r: Math.round(particle.colorFrom.r + (particle.colorTo.r - particle.colorFrom.r) * t),
    g: Math.round(particle.colorFrom.g + (particle.colorTo.g - particle.colorFrom.g) * t),
    b: Math.round(particle.colorFrom.b + (particle.colorTo.b - particle.colorFrom.b) * t),
  }
  syncColorKey(particle)
}

/** 指针影响半径：随视口缩放，但把绝对值锁在舒服的区间 */
function pointerRadius(bounds: Bounds): number {
  return clamp(Math.min(bounds.width, bounds.height) * 0.42, 170, 340)
}


function advanceMotion(
  particle: Particle,
  input: FieldInput,
  radius: number,
  parallaxX: number,
  parallaxY: number,
): void {
  const { time } = input

  // 屏幕基础位置：锚点 - 镜头视差 - 滚动视差（镜头视差已按视口等比换算）
  const baseX = particle.anchorX - input.camera.x * particle.parallax * parallaxX
  const span = input.wrapSpan > 0 ? input.wrapSpan : input.bounds.height
  // 竖直方向按环带取模：滚动多少都不会把粒子甩丢，也不会露边。
  // 视口对应环带最下面一段 —— 粒子滚出顶部后先在环带上半段（屏幕外）继续走，走到底再回到底部入场，
  // 每颗粒子都保留自己的相位，不会挤成一条线一起入场。
  let torusY = particle.anchorY - input.camera.y * particle.parallax * parallaxY - input.scrollY * particle.scrollFactor
  torusY = ((torusY % span) + span) % span
  // 视口对应环带底部再往上一段余量，取模的接缝因此落在屏幕外
  const visibleTop = Math.max(0, span - input.bounds.height - WRAP_MARGIN)
  const baseY = torusY - visibleTop

  // 环境漂浮：两组相差一个数量级的频率叠加，走的是有界的慢速环流。
  // 位移上限 ≈ driftAmp，速度峰值只有每秒几像素 —— 这就是「水里的轻微漂浮」。
  const amp = particle.driftAmp
  const driftX = amp * (Math.sin(time * 0.24 + particle.phase[0]) * 0.62 + Math.sin(time * 0.058 + particle.phase[1]) * 0.34)
  const driftY = amp * (Math.cos(time * 0.2 + particle.phase[2]) * 0.62 + Math.cos(time * 0.051 + particle.phase[3]) * 0.34)

  let pushX = 0
  let pushY = 0

  const { pointer } = input
  if (pointer.active) {
    // 用屏幕上实际的位置算推挤距离（锚点可能已经被滚动带离屏幕）
    const centerX = baseX + particle.size * 0.5
    const centerY = baseY + particle.size * 0.5
    const dx = centerX - pointer.x
    const dy = centerY - pointer.y
    const distance = Math.hypot(dx, dy) || 1

    if (distance < radius) {
      const falloff = 1 - distance / radius
      const weight = falloff * falloff
      const depthScale = 0.55 + 0.45 * particle.depth
      // 单颗粒子只被轻轻带一下：鼠标对画面的影响主要交给镜头视差，
      // 粒子本身推太多会显得「整块背景在躲鼠标」，反而失去水的从容。
      const force = (8 + 30 * pointer.energy) * weight * depthScale
      const swirl = 4 * weight * (0.45 + pointer.energy) * depthScale
      pushX = (dx / distance) * force - (dy / distance) * swirl
      pushY = (dy / distance) * force + (dx / distance) * swirl
    }
  }

  // 弹簧-阻尼：位移慢慢追上平衡点，鼠标移开后再顺着惯性回到原地
  const stiffness = SPRING_STIFFNESS * input.dt
  const damping = SPRING_DAMPING * input.dt
  particle.velX += (pushX - particle.offsetX) * stiffness - particle.velX * damping
  particle.velY += (pushY - particle.offsetY) * stiffness - particle.velY * damping
  particle.offsetX += particle.velX * input.dt
  particle.offsetY += particle.velY * input.dt

  // 位移封顶，保证任何输入下速度与偏移都有界
  const offset = Math.hypot(particle.offsetX, particle.offsetY)
  if (offset > MAX_OFFSET) {
    const ratio = MAX_OFFSET / offset
    particle.offsetX *= ratio
    particle.offsetY *= ratio
    particle.velX *= 0.35
    particle.velY *= 0.35
  }

  particle.renderX = baseX + driftX + particle.offsetX
  particle.renderY = baseY + driftY + particle.offsetY
}

/**
 * 运行中的横向分离。
 *
 * 五层按不同速度随滚动滑动，久而久之不同层的粒子会偶然叠到同一位置，
 * 屏幕上就出现一小块「过于密集」的地方。速度差不能动，那就让叠得太实的粒子
 * 自己慢慢让开一条缝：只挪横向（纵向归滚动管），每帧最多几十像素/秒，
 * 到达「不再过密」就停 —— 既不动构图，也几乎没有存在感。
 */
const SEPARATE_DEPTH = 0.66
const SEPARATE_RATE = 0.55
const SEPARATE_MAX_SPEED = 24
const SEPARATE_MARGIN = 24

function separateDeepStacks(field: Particle[], input: FieldInput): void {
  const { bounds, dt } = input
  const width = bounds.width
  const height = bounds.height

  for (let i = 0; i < field.length; i++) {
    const a = field[i]
    if (a.renderY > height + SEPARATE_MARGIN || a.renderY + a.size < -SEPARATE_MARGIN) continue
    for (let j = i + 1; j < field.length; j++) {
      const b = field[j]
      if (b.renderY > height + SEPARATE_MARGIN || b.renderY + b.size < -SEPARATE_MARGIN) continue

      const minSide = Math.min(a.size, b.size)
      const dx = b.renderX + b.size * 0.5 - (a.renderX + a.size * 0.5)
      const dy = b.renderY + b.size * 0.5 - (a.renderY + a.size * 0.5)
      const overlapX = (a.size + b.size) * 0.5 - Math.abs(dx)
      const overlapY = (a.size + b.size) * 0.5 - Math.abs(dy)
      if (overlapX <= 0 || overlapY <= 0) continue

      const depth = Math.min(overlapX, overlapY) / minSide
      if (depth <= SEPARATE_DEPTH) continue

      const speed = Math.min(SEPARATE_MAX_SPEED, (depth - SEPARATE_DEPTH) * minSide * SEPARATE_RATE * 4)
      const push = speed * dt * 0.5
      // 中心几乎重合时按序号定一个方向，避免互相「推不动」
      const direction = dx > 0.5 ? 1 : dx < -0.5 ? -1 : i % 2 === 0 ? 1 : -1
      a.anchorX -= direction * push
      b.anchorX += direction * push
    }
  }

  for (const particle of field) {
    const minX = -particle.size * 0.4
    const maxX = width - particle.size * 0.6
    particle.anchorX = maxX > minX ? clamp(particle.anchorX, minX, maxX) : (width - particle.size) * 0.5
  }
}

/** 每帧推进整块粒子场 */
export function stepField(field: Particle[], input: FieldInput): void {
  const radius = pointerRadius(input.bounds)
  // 镜头视差按视口等比换算：镜头推到 ±1 时，各层让开的距离始终是「视口的固定比例」，
  // 而不是固定像素 —— 同一段倾斜在 iPad 和手机上看起来才一致。
  const parallaxX = input.bounds.width / PARALLAX_REF.width
  const parallaxY = input.bounds.height / PARALLAX_REF.height
  for (const particle of field) {
    advanceLifecycle(particle, input, field)
    advanceColor(particle, input.dt)
    advanceMotion(particle, input, radius, parallaxX, parallaxY)
  }
  if (input.dt > 0) separateDeepStacks(field, input)
}

/**
 * 把粒子场摆到「全部出生、全部清晰」的状态，用于静止背景
 * （低性能模式 / reduce-motion）。
 *
 * 故意不重置弹簧位移：从动画切到静止时，粒子会停在它当前的位置，
 * 不会因为位移归零而「跳回去」。
 */
export function settleField(field: Particle[], input: FieldInput): void {
  for (const particle of field) {
    particle.state = 'alive'
    particle.age = 0
    particle.focus = 1
    particle.alpha = 1
  }
  stepField(field, { ...input, dt: 0 })
}

/** 视口变化：按比例挪锚点，并把这部分跳变塞进弹簧里，避免整块背景瞬移 */
export function resizeField(field: Particle[], from: Bounds, to: Bounds): void {
  if (from.width <= 0 || from.height <= 0) return
  const scaleX = to.width / from.width
  const scaleY = to.height / from.height
  const scaleSize = Math.sqrt(scaleX * scaleY)

  for (const particle of field) {
    const nextX = particle.anchorX * scaleX
    const nextY = particle.anchorY * scaleY
    particle.offsetX += particle.anchorX - nextX
    particle.offsetY += particle.anchorY - nextY
    particle.anchorX = nextX
    particle.anchorY = nextY
    particle.size = clamp(particle.size * scaleSize, 40, 460)
  }
}

/** 换主题：重新抽一套颜色，并做一次柔和过渡（视野里的颜色不会硬切） */
/**
 * 换主题：每颗粒子只在自己这一色相的深浅两版之间过渡，不重新抽色。
 * 时长/延迟带一点随机，切换时像一层光晕扫过，但落点一定是目标主题的那一版。
 */
export function recolorField(field: Particle[], theme: ParticleTheme, instant = false): void {
  for (const particle of field) {
    particle.colorFrom = { ...particle.color }
    particle.colorTo = { ...paletteColor(theme, particle.colorIndex) }
    if (instant) {
      particle.color = { ...particle.colorTo }
      particle.colorT = 1
      particle.colorDelay = 0
      syncColorKey(particle)
    } else {
      particle.colorT = 0
      particle.colorDelay = rand(0, 0.22)
      particle.colorFade = rand(0.4, 0.7)
    }
  }
}

/** 单颗粒子当前的绘制透明度（基础透明度 × 景深 × 出入场进度） */
export function particleAlpha(particle: Particle, baseAlpha: number): number {
  return baseAlpha * (0.5 + 0.8 * particle.depth) * particle.alpha
}

/**
 * 对焦进度 → 三档贴图的绘制权重（重模糊 / 轻模糊 / 清晰）。
 *
 * 相邻两档交叉淡化，权重和恒为 1，所以视觉上是连续变清晰，
 * 而不是「雾蒙蒙」突变成「锐利」。渲染层只要照着权重画 1~2 次就够。
 */
export function lodWeights(focus: number): [number, number, number] {
  const heavy = Math.max(0, 1 - focus / 0.5)
  const sharp = Math.max(0, (focus - 0.5) / 0.5)
  const light = Math.max(0, 1 - heavy - sharp)
  return [heavy, light, sharp]
}

/**
 * 入场时两档模糊贴图的高斯半径（CSS px）。
 * 远层从更糊的状态合焦；同时给一个绝对像素下限 ——
 * 手机上粒子本来就小，纯按比例算出来的模糊只有两三像素，等于没有效果。
 */
export function entryBlurRadius(particle: Particle): { heavy: number; light: number } {
  const relative = 0.08 + 0.05 * (1 - particle.depth)
  return {
    heavy: Math.max(particle.size * relative, 18),
    light: Math.max(particle.size * 0.04, 7),
  }
}
