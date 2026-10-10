import { onUnmounted } from 'vue'

// 引用计数：RightPanel 与 NavDrawer 同开互不干扰
let lockCount = 0
let prevOverflow = ''
let prevPaddingRight = ''

// 滚动条消失 → 视口变宽 → 页面内容横向位移（打开面板"抖动"的根源）。
// 首选方案是 html { scrollbar-gutter: stable }（视口宽度恒定，固定元素也不动）；
// 这里的 padding 补偿只作为不支持 scrollbar-gutter 的旧浏览器兜底
// （且只能补偿文档流内容，救不了 fixed 元素——所以首选方案在 CSS 里）。
function getScrollbarWidth(): number {
  return window.innerWidth - document.documentElement.clientWidth
}

function supportsGutter(): boolean {
  return typeof CSS !== 'undefined' && CSS.supports('scrollbar-gutter', 'stable')
}

export function useScrollLock() {
  function lock() {
    if (lockCount === 0) {
      prevOverflow = document.body.style.overflow
      prevPaddingRight = document.body.style.paddingRight
      document.body.style.overflow = 'hidden'
      if (!supportsGutter()) {
        document.body.style.paddingRight = `${getScrollbarWidth()}px`
      }
    }
    lockCount++
  }

  function unlock() {
    if (lockCount === 0) return // 幂等：未锁定时调用无副作用
    lockCount--
    if (lockCount === 0) {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
    }
  }

  // 组件异常卸载（如路由切换时未走 close 流程）不把 body 永久锁住
  onUnmounted(unlock)

  return { lock, unlock }
}
