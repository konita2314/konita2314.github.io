/**
 * 设备能力探测（陀螺仪）。
 *
 * 只做「能不能用」的判断与权限申请，具体怎么用交给调用方。
 */

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

/** 申请方向传感器权限；不支持权限模型的浏览器直接返回 true */
export async function requestGyroPermission(): Promise<boolean> {
  const api = orientationApi()
  if (!api || typeof api.requestPermission !== 'function') return true
  try {
    return (await api.requestPermission()) === 'granted'
  } catch {
    return false
  }
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

/** 当前屏幕方向角度（0 / 90 / 180 / 270），用来换算 beta / gamma */
export function screenAngle(): number {
  const orientation = (screen as Screen & { orientation?: ScreenOrientation }).orientation
  return typeof orientation?.angle === 'number' ? orientation.angle : 0
}
