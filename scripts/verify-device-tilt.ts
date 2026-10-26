/**
 * 陀螺仪倾斜 → 镜头位移的校验。
 *
 *   npm run verify:gyro
 *
 * 需要 Node ≥ 22.18（原生跑 TypeScript，无需额外依赖）。
 *
 * 复查的就是两个真机现象：
 *  1. 竖直握持（beta ≈ ±90°）时万向锁：老的「beta / gamma 差值」算法会把同一段动作
 *     放大成十几倍，画面看起来「突变得非常快」；
 *  2. 同一段物理动作在不同握持姿势下读数天差地别 —— 也就是「iPad 几乎不动、Android 直接打满」。
 *
 * 做法：先造一个真实姿态（基准姿态 × 绕某根设备轴的旋转），再按 W3C 的
 * R = Rz(alpha)·Rx(beta)·Ry(gamma) 反解出「传感器会报的那组欧拉角」，
 * 然后同时喂给老算法和新算法（四元数相对倾斜），把结果并排打出来。
 */
import { poseQuaternion, tiltSince } from '../src/utils/deviceTilt.ts'

const DEG = Math.PI / 180

type Vec3 = [number, number, number]
/** 3×3 旋转矩阵，行优先 */
type Mat3 = number[]

const AXIS_X: Vec3 = [1, 0, 0]
const AXIS_Y: Vec3 = [0, 1, 0]
const AXIS_Z: Vec3 = [0, 0, 1]

function multiply(a: Mat3, b: Mat3): Mat3 {
  const out = new Array<number>(9).fill(0)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      let sum = 0
      for (let k = 0; k < 3; k++) sum += a[row * 3 + k] * b[k * 3 + col]
      out[row * 3 + col] = sum
    }
  }
  return out
}

/** Rodrigues：绕单位轴旋转（度） */
function rotationAbout([x, y, z]: Vec3, degrees: number): Mat3 {
  const t = degrees * DEG
  const c = Math.cos(t)
  const s = Math.sin(t)
  const C = 1 - c
  return [
    c + x * x * C, x * y * C - z * s, x * z * C + y * s,
    y * x * C + z * s, c + y * y * C, y * z * C - x * s,
    z * x * C - y * s, z * y * C + x * s, c + z * z * C,
  ]
}

/** 与 W3C 同源：R = Rz(alpha)·Rx(beta)·Ry(gamma) */
function eulerMatrix(alpha: number, beta: number, gamma: number): Mat3 {
  return multiply(
    multiply(rotationAbout(AXIS_Z, alpha), rotationAbout(AXIS_X, beta)),
    rotationAbout(AXIS_Y, gamma),
  )
}

interface EulerAngles {
  alpha: number
  beta: number
  gamma: number
}

/** 反解成传感器会报的那组欧拉角（beta 落在 -90..90，万向锁时把 gamma 归零） */
function eulerFromMatrix(m: Mat3): EulerAngles {
  const sinBeta = Math.max(-1, Math.min(1, m[7]))
  const cosBeta = Math.sqrt(Math.max(0, m[6] * m[6] + m[8] * m[8]))
  const beta = Math.atan2(sinBeta, cosBeta) / DEG
  if (cosBeta > 1e-6) {
    return {
      alpha: Math.atan2(-m[1], m[4]) / DEG,
      beta,
      gamma: Math.atan2(-m[6], m[8]) / DEG,
    }
  }
  // 万向锁：alpha 与 gamma 只剩「和」有意义，传感器把 gamma 归零
  return { alpha: Math.atan2(m[3], m[0]) / DEG, beta, gamma: 0 }
}

interface Motion {
  name: string
  /** 绕哪根设备轴转 */
  axis: Vec3
  degrees: number
}

const MOTIONS: Motion[] = [
  { name: '屏幕左右倾', axis: AXIS_Y, degrees: 10 },
  { name: '屏幕前后倾', axis: AXIS_X, degrees: 10 },
  { name: '屏幕内转动', axis: AXIS_Z, degrees: 10 },
]

const BASELINES = [
  { alpha: 40, beta: 0, gamma: 0 },
  { alpha: 40, beta: 30, gamma: 20 },
  { alpha: 40, beta: 60, gamma: -15 },
  { alpha: 40, beta: 80, gamma: 10 },
  { alpha: 40, beta: 88, gamma: 0 },
  { alpha: 40, beta: 89.5, gamma: 0 },
  { alpha: 40, beta: 90, gamma: 0 },
  { alpha: 40, beta: 91, gamma: 0 },
  { alpha: 40, beta: 95, gamma: 0 },
]

/** 老算法：直接用 beta / gamma 的差值（单位：度） */
function legacyTilt(baseline: EulerAngles, current: EulerAngles): { x: number; y: number } {
  return { x: current.gamma - baseline.gamma, y: current.beta - baseline.beta }
}

/** 新算法：四元数相对倾斜（单位：度，已按屏幕方向旋到屏幕坐标） */
function quaternionTilt(baseline: EulerAngles, current: EulerAngles, screenAngle: number) {
  const from = poseQuaternion(baseline)
  const to = poseQuaternion(current)
  return tiltSince(from, to, screenAngle)
}

interface Sample {
  baseline: string
  motion: string
  legacy: { x: number; y: number }
  tilt: { x: number; y: number }
  /** 归一化 + 夹紧之后的镜头位移（和 composable 里一致，量程 22°） */
  camera: { x: number; y: number }
}

const RANGE = 22

function clampUnit(value: number): number {
  return value < -1 ? -1 : value > 1 ? 1 : value
}

function clampCamera(value: number): number {
  return clampUnit(value / RANGE)
}

/** 造一次动作：基准姿态 × 绕设备轴的旋转 → 传感器读数 */
function simulate(baselineSpec: EulerAngles, motion: Motion): EulerAngles {
  const base = eulerMatrix(baselineSpec.alpha, baselineSpec.beta, baselineSpec.gamma)
  const moved = multiply(base, rotationAbout(motion.axis, motion.degrees))
  return eulerFromMatrix(moved)
}

const samples: Sample[] = []
for (const baseline of BASELINES) {
  const baseAngles = eulerFromMatrix(eulerMatrix(baseline.alpha, baseline.beta, baseline.gamma))
  for (const motion of MOTIONS) {
    const current = simulate(baseline, motion)
    const legacy = legacyTilt(baseAngles, current)
    const tilt = quaternionTilt(baseAngles, current, 0)
    samples.push({
      baseline: `β=${baseline.beta}° γ=${baseline.gamma}°`,
      motion: motion.name,
      legacy,
      tilt,
      camera: { x: clampCamera(tilt.x), y: clampCamera(tilt.y) },
    })
  }
}

const pad = (text: string | number, width: number) => String(text).padEnd(width)
const num = (value: number, width = 7) => value.toFixed(1).padStart(width)

console.log('竖直握持附近：同一段 10° 动作，老算法与新算法的读数对比（单位：度）\n')
console.log(
  pad('基准姿态', 18) + pad('动作', 14) + pad('老:Δγ(横)', 11) + pad('老:Δβ(纵)', 11) +
    pad('新:横', 8) + pad('新:纵', 8) + '新:镜头(横,纵)',
)
for (const sample of samples) {
  console.log(
    pad(sample.baseline, 18) +
      pad(sample.motion, 14) +
      num(sample.legacy.x, 10) +
      num(sample.legacy.y, 11) +
      num(sample.tilt.x, 7) +
      num(sample.tilt.y, 8) +
      `   (${sample.camera.x.toFixed(2)}, ${sample.camera.y.toFixed(2)})`,
  )
}

const failures: string[] = []

// ---------------------------------------------------------------------------
// 1. 同一段物理动作，在任何握持姿势下都必须给出同样的倾斜角（±10°）
// ---------------------------------------------------------------------------
for (const baseline of BASELINES) {
  const baseAngles = eulerFromMatrix(eulerMatrix(baseline.alpha, baseline.beta, baseline.gamma))
  for (const motion of MOTIONS) {
    const tilt = quaternionTilt(baseAngles, simulate(baseline, motion), 0)
    const label = `β=${baseline.beta}° γ=${baseline.gamma}° / ${motion.name}`
    if (motion.axis === AXIS_Y) {
      // 绕屏幕上轴（竖屏时就是设备 y 轴）转 10° → 横向 10°，纵向 0°
      if (Math.abs(tilt.x - 10) > 0.4) failures.push(`${label} 横向 ${tilt.x.toFixed(2)}° ≠ 10°`)
      if (Math.abs(tilt.y) > 0.4) failures.push(`${label} 纵向 ${tilt.y.toFixed(2)}° ≠ 0°`)
    } else if (motion.axis === AXIS_X) {
      if (Math.abs(tilt.y - 10) > 0.4) failures.push(`${label} 纵向 ${tilt.y.toFixed(2)}° ≠ 10°`)
      if (Math.abs(tilt.x) > 0.4) failures.push(`${label} 横向 ${tilt.x.toFixed(2)}° ≠ 0°`)
    } else {
      // 屏幕内转动（绕屏幕法线）不驱动镜头 —— 和旧实现一致
      if (Math.abs(tilt.x) > 0.4 || Math.abs(tilt.y) > 0.4) {
        failures.push(`${label} 不该驱动镜头：(${tilt.x.toFixed(2)}, ${tilt.y.toFixed(2)})`)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. 跨过万向锁必须连续：β 从 80° 扫到 100°，读数不能跳
// ---------------------------------------------------------------------------
const sweepMotion = MOTIONS[0]
let previous: { x: number; y: number } | null = null
let maxJump = 0
for (let beta = 80; beta <= 100.0001; beta += 0.25) {
  const baseline = eulerFromMatrix(eulerMatrix(40, beta, 0))
  const tilt = quaternionTilt(baseline, simulate({ alpha: 40, beta, gamma: 0 }, sweepMotion), 0)
  if (previous) maxJump = Math.max(maxJump, Math.abs(tilt.x - previous.x), Math.abs(tilt.y - previous.y))
  previous = tilt
}
console.log(`\n扫过万向锁（β 80°→100°，每步 0.25°）时相邻读数的最大跳变：${maxJump.toFixed(3)}°`)
if (maxJump > 0.5) failures.push(`跨过万向锁时倾斜读数跳变 ${maxJump.toFixed(2)}°（应连续）`)

// ---------------------------------------------------------------------------
// 3. 横屏：绕屏幕上轴的 10° 动作（此时是设备 x 轴）同样要给横向 10°
// ---------------------------------------------------------------------------
for (const beta of [0, 45, 88, 90]) {
  const base = eulerFromMatrix(eulerMatrix(40, beta, 0))
  const tilt = quaternionTilt(base, simulate({ alpha: 40, beta, gamma: 0 }, MOTIONS[1]), 90)
  if (Math.abs(tilt.x - 10) > 0.4 || Math.abs(tilt.y) > 0.4) {
    failures.push(`横屏 β=${beta}° 绕设备 x 轴转 10° → (${tilt.x.toFixed(2)}, ${tilt.y.toFixed(2)})，应为 (10, 0)`)
  }
}

// ---------------------------------------------------------------------------
// 4. 老算法在新算法「不动」的地方会炸开（真机上的「突变」）—— 把差距量化出来
// ---------------------------------------------------------------------------
/** 老算法换算成镜头量（-1..1，量程 22°），和新算法口径一致 */
const legacyCameras = samples.map((s) => ({
  motion: s.motion,
  x: clampCamera(s.legacy.x),
  y: clampCamera(s.legacy.y),
}))
const newCameras = samples.map((s) => ({
  motion: s.motion,
  x: s.camera.x,
  y: s.camera.y,
}))

const legacyPeak = Math.max(...legacyCameras.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y))))
const newPeak = Math.max(...newCameras.map((c) => Math.max(Math.abs(c.x), Math.abs(c.y))))

/** 同一段动作、不同握持姿势之间横向量的最大差值（姿势依赖有多严重） */
function spreadAcrossPoses(list: { motion: string; x: number }[]): number {
  const byMotion = new Map<string, number[]>()
  for (const item of list) {
    const values = byMotion.get(item.motion) ?? []
    values.push(item.x)
    byMotion.set(item.motion, values)
  }
  let worst = 0
  for (const values of byMotion.values()) worst = Math.max(worst, Math.max(...values) - Math.min(...values))
  return worst
}

const legacySpread = spreadAcrossPoses(legacyCameras)
const newSpread = spreadAcrossPoses(newCameras)

console.log(
  `\n同一段动作、不同握持姿势之间的镜头横向量差值：老算法 ${legacySpread.toFixed(2)}（峰值 ${legacyPeak.toFixed(2)}），` +
    `新算法 ${newSpread.toFixed(2)}（峰值 ${newPeak.toFixed(2)}）`,
)
if (legacyPeak < 0.99) failures.push(`老算法峰值只有 ${legacyPeak.toFixed(2)}，复现不出真机上的「突然打满」`)
if (legacySpread < 0.9) failures.push(`老算法的姿势差值只有 ${legacySpread.toFixed(2)}，复现不出「iPad 小 / Android 大」`)
if (newPeak > 0.46) failures.push(`新算法的镜头峰值 ${newPeak.toFixed(2)} 超过了动作本身的 10° / 22°`)
if (newSpread > 0.01) failures.push(`新算法在不同姿势下仍有 ${newSpread.toFixed(2)} 的差异`)

// ---------------------------------------------------------------------------
// 5. 大角度倾斜：镜头归一化后必须被夹在 ±1，不会继续外推
// ---------------------------------------------------------------------------
const bigMotion: Motion = { name: '大幅左右倾', axis: AXIS_Y, degrees: 60 }
for (const beta of [0, 60, 90]) {
  const base = eulerFromMatrix(eulerMatrix(40, beta, 0))
  const tilt = quaternionTilt(base, simulate({ alpha: 40, beta, gamma: 0 }, bigMotion), 0)
  const camera = clampCamera(tilt.x)
  if (Math.abs(camera) > 1) failures.push(`β=${beta}° 大幅倾斜时镜头 ${camera.toFixed(2)} 超出 ±1`)
  if (Math.abs(tilt.x) < 55) failures.push(`β=${beta}° 大幅倾斜读出 ${tilt.x.toFixed(1)}°，应接近 60°`)
}

console.log('\n镜头量程：' + [0, 30, 60, 90].map((deg) => `${deg}° → ${clampCamera(deg).toFixed(2)}`).join('  '))

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} 项不达标：`)
  for (const failure of failures) console.error(`  - ${failure}`)
  process.exit(1)
}
console.log('\n✓ 倾斜读数与握持姿势无关、跨万向锁连续、镜头有界')
