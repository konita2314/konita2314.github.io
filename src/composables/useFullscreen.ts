import { onMounted, onUnmounted } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export function useFullscreen() {
  const settings = useSettingsStore()

  // Esc 退出全屏不卸载组件，事件驱动同步；onUnmounted 兜底复位
  function onFullscreenChange() {
    settings.hideChrome = !!document.fullscreenElement
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // 全屏失败（权限/不支持）时静默忽略
    }
  }

  onMounted(() => document.addEventListener('fullscreenchange', onFullscreenChange))
  onUnmounted(() => {
    // 移除监听，避免来回切全屏时叠加监听器
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    settings.hideChrome = false
  })

  return { toggleFullscreen }
}
