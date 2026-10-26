/**
 * 设备能力探测（陀螺仪）。
 *
 * 只做「能不能用」「有没有权限」的判断与申请，具体怎么用交给调用方。
 */

/** 方向传感器的可授权状态（`unsupported` = 这台设备/浏览器拿不到读数） */
export type GyroAccess = 'granted' | 'prompt' | 'denied' | 'unsupported'

interface GyroPermissionApi {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

function orientationApi(): GyroPermissionApi | undefined {
  return (window as unknown as { DeviceOrientationEvent?: GyroPermissionApi }).DeviceOrientationEvent
}

/** 设备是否支持方向传感器（大部分移动端浏览器都有） */
export function gyroSupported(): boolean {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
}

/** iOS 13+ 需要用户手势触发权限；桌面/安卓返回 false */
export function needsGyroPermission(): boolean {
  return typeof orientationApi()?.requestPermission === 'function'
}

/**
 * 申请方向传感器权限（必须在用户手势里调用）。
 *
 * - 没有权限模型（安卓 / 桌面）：直接 granted；
 * - 已经授权过：系统不会弹窗，Promise 直接以 granted 兑现；
 * - 之前被拒绝：直接 denied，不会再弹。
 *
 * 同一时刻只保留一个在途请求：面板开关和「首次点击」可能落在同一次点击上，
 * 重复调用会让 iOS 收到两次 requestPermission。
 */
let pendingRequest: Promise<GyroAccess> | null = null

export function requestGyroAccess(): Promise<GyroAccess> {
  if (pendingRequest) return pendingRequest
  const request = (async (): Promise<GyroAccess> => {
    const api = orientationApi()
    if (!api || typeof api.requestPermission !== 'function') return 'granted'
    try {
      return (await api.requestPermission()) === 'granted' ? 'granted' : 'denied'
    } catch {
      return 'denied'
    }
  })()
  pendingRequest = request
  void request.finally(() => {
    if (pendingRequest === request) pendingRequest = null
  })
  return request
}

/**
 * 是否是「该显示陀螺仪开关」的设备。
 * 用触摸能力 + 传感器支持一起判断：触屏笔记本也会显示，但拿不到读数也不会有副作用。
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  if (!gyroSupported()) return false
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return coarse || navigator.maxTouchPoints > 0
}

/** 屏幕方向角规整到 0 / 90 / 180 / 270 */
function normalizeAngle(angle: number): number {
  return ((Math.round(angle / 90) * 90) % 360 + 360) % 360
}

/**
 * 当前屏幕方向角度（0 / 90 / 180 / 270），用来把设备坐标换算成屏幕坐标。
 *
 * 先取标准的 `screen.orientation.angle`；老系统（iOS 16.4 之前的 Safari）没有这个对象，
 * 退回 `window.orientation`（-90 等价于 270）。取不到就按竖屏处理。
 */
export function screenAngle(): number {
  const orientation = (screen as Screen & { orientation?: ScreenOrientation }).orientation
  if (typeof orientation?.angle === 'number') return normalizeAngle(orientation.angle)
  const legacy = (window as unknown as { orientation?: number }).orientation
  if (typeof legacy === 'number') return normalizeAngle(legacy)
  return 0
}
