import { onUnmounted } from 'vue'

// 引用计数：RightPanel 与 NavDrawer 同开互不干扰
let lockCount = 0
let prevOverflow = ''

export function useScrollLock() {
  function lock() {
    if (lockCount === 0) {
      prevOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    lockCount++
  }

  function unlock() {
    if (lockCount === 0) return // 幂等：未锁定时调用无副作用
    lockCount--
    if (lockCount === 0) {
      document.body.style.overflow = prevOverflow
    }
  }

  // 组件异常卸载（如路由切换时未走 close 流程）不把 body 永久锁住
  onUnmounted(unlock)

  return { lock, unlock }
}
