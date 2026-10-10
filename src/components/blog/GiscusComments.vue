<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { giscusConfig } from '@/config/giscus'

const settings = useSettingsStore()
const containerRef = useTemplateRef<HTMLDivElement>('container')
const frameReady = ref(false)

let observer: MutationObserver | null = null

// giscus 只认内置主题名 'dark'/'light'，不传自定义主题字符串（补丁 5）
function sendTheme(theme: 'light' | 'dark') {
  const frame = containerRef.value?.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
  frame?.contentWindow?.postMessage({ giscus: { setConfig: { theme } } }, 'https://giscus.app')
}

onMounted(() => {
  // 未配置 repoId/categoryId 时静默不注入（用户去 giscus.app 填写后生效）
  if (!giscusConfig.repoId || !giscusConfig.categoryId) return

  const container = containerRef.value
  if (!container) return

  // script 注入组件内部容器：组件卸载时 script 与 iframe 随 DOM 一起移除，
  // 路由切换天然无残留、无需全局去重（补丁 5）
  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.async = true
  script.crossOrigin = 'anonymous'
  script.setAttribute('data-repo', giscusConfig.repo)
  script.setAttribute('data-repo-id', giscusConfig.repoId)
  script.setAttribute('data-category', giscusConfig.category)
  script.setAttribute('data-category-id', giscusConfig.categoryId)
  script.setAttribute('data-mapping', giscusConfig.mapping)
  script.setAttribute('data-strict', giscusConfig.strict)
  script.setAttribute('data-reactions-enabled', giscusConfig.reactionsEnabled)
  script.setAttribute('data-emit-metadata', giscusConfig.emitMetadata)
  script.setAttribute('data-input-position', giscusConfig.inputPosition)
  script.setAttribute('data-theme', settings.darkMode ? 'dark' : 'light')
  script.setAttribute('data-lang', giscusConfig.lang)
  script.setAttribute('data-loading', 'lazy')
  container.appendChild(script)

  // MutationObserver 等 iframe 出现后发一次当前主题；load 事件可能已错过（缓存），先发一次无害
  observer = new MutationObserver(() => {
    const frame = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
    if (frame) {
      observer?.disconnect()
      observer = null
      frameReady.value = true
      frame.addEventListener('load', () => sendTheme(settings.darkMode ? 'dark' : 'light'))
      sendTheme(settings.darkMode ? 'dark' : 'light')
    }
  })
  observer.observe(container, { childList: true, subtree: true })
})

watch(
  () => settings.darkMode,
  (isDark) => {
    // iframe 不存在时跳过，等待下次出现/变化
    if (frameReady.value) sendTheme(isDark ? 'dark' : 'light')
  }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <!-- giscus 内容器：script 与 iframe 均在其内，卸载即清理 -->
  <div ref="container" class="giscus-container"></div>
</template>
