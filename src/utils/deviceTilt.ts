/**
 * 设备姿态 → 镜头倾斜（纯数学，不碰 DOM）。
 *
 * 为什么不直接拿 beta / gamma 当倾斜角：
 * 这两个欧拉角在「设备竖直握持」（beta ≈ ±90°）附近存在万向锁 —— 姿态只转过一两度，
 * gamma 却会在 ±180° 之间翻跟头。同一段动作，Android 上会瞬间把镜头打满
 * （看起来「突变得非常快」），iPad 上又几乎不动（看起来「非常小」）。
 *
 * 这里先把三个欧拉角还原成四元数（W3C 的 R = Rz(alpha)·Rx(beta)·Ry(gamma)），
 * 再取「相对基准姿态的旋转矢量」：单位是真实转过的角度，
 * 与握持姿势、设备型号无关，也没有奇点。
 *
 * 镜头语义：把屏幕当成一扇窗 —— 绕屏幕「上」轴转动 → 镜头横向移动，
 * 绕屏幕「右」轴转动 → 镜头纵向移动。所以竖直握持时左右转身是平滑平移，
 * 而不是旧实现里那种一步跳到底。
 */

const DEG = Math.PI / 180

/** 单位四元数（Hamilton 约定：v' = q · v · q⁻¹） */
export interface Quaternion {
  x: number
  y: number
  z: number
  w: number
}

/** 一次 deviceorientation 读数（欧拉角，度） */
export interface DevicePose {
  /** 罗盘朝向；浏览器不提供时为 null —— 相对倾斜用不到它，按 0 处理即可 */
  alpha: number | null
  beta: number
  gamma: number
}

/**
 * 镜头倾斜（度）。
 * - x：左右方向（绕屏幕上轴的转角），喂给镜头的横向位移
 * - y：前后方向（绕屏幕右轴的转角），喂给镜头的纵向位移
 */
export interface Tilt {
  x: number
  y: number
}

/** 单位四元数：绕单位轴 (x, y, z) 旋转 angle（弧度） */
function axisAngle(x: number, y: number, z: number, angle: number): Quaternion {
  const half = angle * 0.5
  const sin = Math.sin(half)
  return { x: x * sin, y: y * sin, z: z * sin, w: Math.cos(half) }
}

/** Hamilton 积：multiply(a, b) 等价于旋转矩阵 R(a)·R(b)（先 b 后 a） */
function multiply(a: Quaternion, b: Quaternion): Quaternion {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  }
}

/** 共轭即逆（单位四元数） */
function invert(q: Quaternion): Quaternion {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w }
}

/**
 * 欧拉角 → 「设备坐标系 → 地球坐标系」的旋转四元数。
 * 与 W3C DeviceOrientation 的旋转矩阵同源：R = Rz(alpha)·Rx(beta)·Ry(gamma)。
 */
export function poseQuaternion(pose: DevicePose): Quaternion {
  const roll = axisAngle(0, 1, 0, pose.gamma * DEG)
  const pitch = axisAngle(1, 0, 0, pose.beta * DEG)
  const yaw = axisAngle(0, 0, 1, (pose.alpha ?? 0) * DEG)
  return multiply(yaw, multiply(pitch, roll))
}

/** 姿态差 → 旋转矢量（度，轴长即转角）；方向取短弧，角度落在 0..180° */
function rotationVector(from: Quaternion, to: Quaternion): { x: number; y: number; z: number } {
  const delta = multiply(invert(from), to)
  // w < 0 表示走了长弧：取相反表示（同一旋转），角度才落在 0..180°
  const sign = delta.w < 0 ? -1 : 1
  const x = delta.x * sign
  const y = delta.y * sign
  const z = delta.z * sign
  const w = delta.w * sign

  // 旋转矢量 = 轴 × 转角；用 atan2 而不是 acos，接近 0 时数值更稳
  const sinHalf = Math.hypot(x, y, z)
  if (sinHalf < 1e-9) return { x: 0, y: 0, z: 0 }
  const angle = (2 * Math.atan2(sinHalf, w)) / DEG
  const scale = angle / sinHalf
  return { x: x * scale, y: y * scale, z: z * scale }
}

/**
 * 相对基准姿态的倾斜角（度），已按屏幕方向旋到屏幕坐标。
 *
 * @param baseline 启用陀螺仪那一刻的姿态（用户当时的握持姿势就是「视角原点」）
 * @param current  当前姿态
 * @param screenAngle 屏幕方向角（0/90/180/270，`screen.orientation.angle`）
 */
export function tiltSince(baseline: Quaternion, current: Quaternion, screenAngle: number): Tilt {
  const v = rotationVector(baseline, current)
  const rad = screenAngle * DEG
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  // 设备 x/y 轴与屏幕上/右轴不一定重合（横屏差 90°），把倾斜矢量旋到屏幕坐标
  const right = v.x * cos - v.y * sin
  const up = v.x * sin + v.y * cos
  return { x: up, y: right }
}
