<script setup lang="ts">
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Clock, Gamepad2 } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from '@/composables/useI18n'
import { useScrollLock } from '@/composables/useScrollLock'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { getSearchIndex, type SearchEntry } from '@/utils/blog'
import { isMobileDevice, requestGyroAccess } from '@/utils/device'
import PanelSearch from './panel/PanelSearch.vue'
import PanelQuickTools from './panel/PanelQuickTools.vue'
import PanelRecent from './panel/PanelRecent.vue'
import PanelPreferences from './panel/PanelPreferences.vue'
import type { QuickToolItem } from './panel/types'

const settings = useSettingsStore()
const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { lock, unlock } = useScrollLock()

const showGyroscope = isMobileDevice()
const panelRef = useTemplateRef<HTMLElement>('panel')
const isSearching = ref(false)

useFocusTrap(panelRef, () => settings.isPanelOpen)

const searchEntries: SearchEntry[] = getSearchIndex()

const quickTools: QuickToolItem[] = [
  { path: '/tools/clock', icon: Clock, labelKey: 'tool.clock' },
  { path: '/tools/maimai', icon: Gamepad2, labelKey: 'tool.maimai' },
]

const recent = computed<SearchEntry[]>(() =>
  settings.recentVisits
    .map((path) => searchEntries.find((entry) => entry.path === path))
    .filter((entry): entry is SearchEntry => entry !== undefined),
)

function close() {
  settings.isPanelOpen = false
  isSearching.value = false
}

function go(path: string) {
  close()
  void router.push(path)
}

function clearRecent() {
  settings.clearRecentVisits()
}

async function toggleGyroscope(enabled: boolean) {
  if (!enabled) {
    settings.setGyroscope(false)
    return
  }

  // 点击本身就是用户手势：iOS 的方向传感器授权必须在这里申请。
  const granted = (await requestGyroAccess()) === 'granted'
  settings.setGyroscope(granted)
}

function onKeydown(event: KeyboardEvent) {
  if (!settings.isPanelOpen) return
  if (event.key !== 'Escape' || event.isComposing) return

  event.preventDefault()
  close()
}

watch(
  () => settings.isPanelOpen,
  (open) => {
    if (open) {
      lock()
      window.addEventListener('keydown', onKeydown)
    } else {
      unlock()
      window.removeEventListener('keydown', onKeydown)
      isSearching.value = false
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <!-- 显式 :duration：根 .right-panel 自身无动画，Vue 无法从根元素测得时长。
       enter 800ms = 最晚分区 0.29s 延迟 + 0.34s 动画；leave 300ms = 内容 0.075s + 0.14s / 面板 0.26s -->
  <Transition name="panel" :duration="{ enter: 800, leave: 300 }">
    <div v-if="settings.isPanelOpen" class="right-panel">
      <div class="right-sidebar-overlay" @click="close"></div>

      <aside
        ref="panel"
        class="right-sidebar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="panelTitle"
        tabindex="-1"
      >
        <header class="right-sidebar-header">
          <h2 id="panelTitle">{{ t('panel.title') }}</h2>
          <button
            class="close-btn"
            type="button"
            :aria-label="t('panel.close')"
            @click="close"
          >
            ×
          </button>
        </header>

        <div class="right-sidebar-body">
          <PanelSearch
            :entries="searchEntries"
            @select="go"
            @update:searching="isSearching = $event"
          />

          <div v-if="!isSearching">
            <PanelQuickTools :items="quickTools" @select="go" />
            <PanelRecent
              :items="recent"
              :current-path="route.path"
              @select="go"
              @clear="clearRecent"
            />
            <PanelPreferences
              :dark-mode="settings.darkMode"
              :low-performance="settings.lowPerformance"
              :gyroscope="settings.gyroscope"
              :locale="settings.locale"
              :show-gyroscope="showGyroscope"
              @update-dark-mode="settings.setDarkMode"
              @update-low-performance="settings.setLowPerformance"
              @update-gyroscope="toggleGyroscope"
              @update-locale="settings.setLocale"
            />
          </div>
        </div>
      </aside>
    </div>
  </Transition>
</template>
