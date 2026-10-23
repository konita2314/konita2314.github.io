/**
 * 关于页头像：URL 唯一来源 + 空闲预加载。
 *
 * 关于页是懒加载路由，头像原本要等进入页面才开始下载，点开瞬间必然是一块空白。
 * 这里在主页加载完成后的空闲时段先取一次：同一 URL 的第二次请求直接命中内存/HTTP
 * 缓存，进入关于页时头像立即出现，不再等网络。
 */

/** 头像地址（关于页与预加载共用，避免两处硬编码漂移） */
export const AVATAR_URL = 'https://github.com/konita2314.png'

/** 单次预加载的最长等待；超时按失败处理，交给退避重试 */
const ATTEMPT_TIMEOUT = 15000

/** 失败后的重试间隔（指数退避）；重试次数用完仍失败就不再打扰用户 */
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]

/** 是否已经拿到过头像（拿到后无需再请求） */
let loaded = false

/** 持有 Image 引用：不让解码结果被回收，后续 <img> 换用同一 URL 时直接复用 */
let preloaded: HTMLImageElement | null = null

/** 是否已有一轮预加载在跑；重复调用（如再回主页）不重复排队 */
let running = false

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/** 单次尝试：成功返回 true，失败（断网、被拦、超时）返回 false */
function loadOnce(): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    let settled = false
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      if (ok) {
        preloaded = img
        loaded = true
      }
      resolve(ok)
    }
    const timer = window.setTimeout(() => finish(false), ATTEMPT_TIMEOUT)
    img.decoding = 'async'
    img.onload = () => finish(true)
    img.onerror = () => finish(false)
    img.src = AVATAR_URL
  })
}

/** 依次尝试，失败按 RETRY_DELAYS 退避重试，直到成功或次数用完 */
async function runPreload(): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    if (await loadOnce()) break
    if (attempt >= RETRY_DELAYS.length) break
    await delay(RETRY_DELAYS[attempt])
  }
  running = false
}

/** 空闲时段执行：优先 requestIdleCallback（Safari 无此 API，降级为延时） */
function whenIdle(task: () => void) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(task, { timeout: 2000 })
  } else {
    window.setTimeout(task, 1200)
  }
}

/** 等页面 load 之后再排队，避免和首屏关键资源抢带宽 */
function afterLoad(task: () => void) {
  if (document.readyState === 'complete') task()
  else window.addEventListener('load', task, { once: true })
}

/**
 * 预加载关于页头像。主页挂载后调用一次即可：
 * 首屏 load 完成 → 空闲时下载；失败会退避重试。
 */
export function preloadAvatar() {
  if (loaded || running) return
  running = true
  afterLoad(() => {
    whenIdle(() => {
      void runPreload()
    })
  })
}

/** 预加载完成的 Image 元素（未完成时为 null）：既是引用锚点，也方便调试 */
export function getPreloadedAvatar(): HTMLImageElement | null {
  return preloaded
}
