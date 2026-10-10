import { defineStore } from 'pinia'
import { ref } from 'vue'

// localStorage 格式契约（与 index.html 内联 FOUC 脚本逐字一致）：
// darkMode: 'true'/'false'，null = 未设置 → 跟随系统
// performanceOptimization: 'disabled'/'enabled'
// performancePopupShown: 'true'（关闭按钮、自动关闭、弹窗按钮都写它）
const DARK_KEY = 'darkMode'
const PERF_KEY = 'performanceOptimization'
const POPUP_KEY = 'performancePopupShown'
const LOCALE_KEY = 'locale'
const VISITS_KEY = 'recentVisits'
const VISIT_LIMIT = 6

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // 隐私模式下静默失败
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return false
  }
}

function initDark(): boolean {
  const saved = readStorage(DARK_KEY)
  return saved === null ? systemPrefersDark() : saved === 'true'
}

function initLowPerformance(): boolean {
  return readStorage(PERF_KEY) === 'disabled'
}

function initLocale(): string {
  return readStorage(LOCALE_KEY) ?? 'zh-CN'
}

function initRecentVisits(): string[] {
  const raw = readStorage(VISITS_KEY)
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, VISIT_LIMIT)
  } catch {
    return []
  }
}

/** 性能弹窗是否已经展示过（弹窗组件挂载时查一次即可，无需响应式） */
export function hasPerformancePopupShown(): boolean {
  return readStorage(POPUP_KEY) === 'true'
}

export const useSettingsStore = defineStore('settings', () => {
  const darkMode = ref(initDark())
  const lowPerformance = ref(initLowPerformance())
  const locale = ref(initLocale())
  const recentVisits = ref<string[]>(initRecentVisits())
  const isPanelOpen = ref(false)
  const isDrawerOpen = ref(false)
  const hideChrome = ref(false)

  function setDarkMode(value: boolean) {
    darkMode.value = value
    writeStorage(DARK_KEY, String(value))
  }

  function toggleDarkMode() {
    setDarkMode(!darkMode.value)
  }

  function setLowPerformance(value: boolean) {
    lowPerformance.value = value
    writeStorage(PERF_KEY, value ? 'disabled' : 'enabled')
  }

  function setLocale(value: string) {
    locale.value = value
    writeStorage(LOCALE_KEY, value)
  }

  function recordVisit(path: string) {
    recentVisits.value = [path, ...recentVisits.value.filter((p) => p !== path)].slice(0, VISIT_LIMIT)
    writeStorage(VISITS_KEY, JSON.stringify(recentVisits.value))
  }

  function markPerformancePopupShown() {
    writeStorage(POPUP_KEY, 'true')
  }

  // 系统深色偏好变化：localStorage 有值 → 忽略本次系统变化（用户手动选择优先）；
  // 无值 → 跟随 e.matches。监听注册一次（模块级 store 天然单例）。
  try {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', (e) => {
      if (readStorage(DARK_KEY) !== null) return
      darkMode.value = e.matches
    })
  } catch {
    // matchMedia 不可用时忽略
  }

  return {
    darkMode,
    lowPerformance,
    locale,
    recentVisits,
    isPanelOpen,
    isDrawerOpen,
    hideChrome,
    setDarkMode,
    toggleDarkMode,
    setLowPerformance,
    setLocale,
    recordVisit,
    markPerformancePopupShown,
  }
})
