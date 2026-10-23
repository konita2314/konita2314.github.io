<script setup lang="ts">
import { computed, onUnmounted, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { Clock, Gamepad2, Search } from 'lucide-vue-next'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from '@/composables/useI18n'
import { useScrollLock } from '@/composables/useScrollLock'
import { getSearchIndex, type SearchEntry } from '@/utils/blog'
import { isMobileDevice, requestGyroPermission } from '@/utils/device'

const settings = useSettingsStore()
const { t } = useI18n()
const router = useRouter()
const { lock, unlock } = useScrollLock()

const showGyroscope = isMobileDevice()

const searchQuery = ref('')
const isSearchFocused = ref(false)

const searchResults = computed<SearchEntry[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return getSearchIndex()
    .filter((e) => e.title.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q))
    .slice(0, 8)
})

const quickTools: { path: string; icon: Component; key: string }[] = [
  { path: '/tools/clock', icon: Clock, key: 'tool.clock' },
  { path: '/tools/maimai', icon: Gamepad2, key: 'tool.maimai' },
]

const recent = computed<SearchEntry[]>(() => {
  const index = getSearchIndex()
  return settings.recentVisits
    .map((path) => index.find((e) => e.path === path))
    .filter((e): e is SearchEntry => e !== undefined)
})

function close() {
  settings.isPanelOpen = false
  searchQuery.value = ''
}

function go(path: string) {
  close()
  void router.push(path)
}

async function toggleGyroscope(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.checked) {
    settings.setGyroscope(false)
    return
  }
  // 点击本身就是用户手势：iOS 的方向传感器授权必须在这里申请
  const granted = await requestGyroPermission()
  settings.setGyroscope(granted)
  input.checked = granted
}

function submitSearch() {
  if (searchResults.value.length > 0) go(searchResults.value[0].path)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && settings.isPanelOpen) close()
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
    }
  }
)

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- 显式 :duration：过渡根 .right-panel 自身无动画，Vue 无法从根元素测得时长，
       不指定会立即移除 enter/leave 类，子元素动画（overlay 淡入 + 侧栏滑入 + 节交错）全部不播放。
       enter 900ms = 最晚一节 0.75s 延迟 + 0.15s 动画；leave 只需 overlay 0.2s -->
  <Transition name="panel" :duration="{ enter: 900, leave: 300 }">
    <div v-if="settings.isPanelOpen" class="right-panel">
      <div class="right-sidebar-overlay" @click="close"></div>
      <aside class="right-sidebar">
        <div class="right-sidebar-header">
          <h2>{{ t('panel.title') }}</h2>
          <button class="close-btn" @click="close">×</button>
        </div>

        <!-- 搜索：搜索索引（博客 + 静态页面）computed 过滤 → router.push -->
        <div class="search-section">
          <form class="search-form" @submit.prevent="submitSearch">
            <div :class="['search-input-container', { focused: isSearchFocused }]">
              <input
                v-model="searchQuery"
                type="text"
                :placeholder="t('panel.search.placeholder')"
                class="search-input"
                @focus="isSearchFocused = true"
                @blur="isSearchFocused = false"
              />
              <button type="submit" class="search-btn" aria-label="搜索">
                <Search :size="16" />
              </button>
            </div>
          </form>
          <ul v-if="searchQuery.trim()" class="search-results">
            <li v-for="entry in searchResults" :key="entry.path" @click="go(entry.path)">
              <span class="search-result-title">{{ entry.title }}</span>
              <span class="search-result-path">{{ entry.path }}</span>
            </li>
            <li v-if="searchResults.length === 0" class="search-no-results">
              {{ t('panel.search.noResults') }}
            </li>
          </ul>
        </div>

        <!-- 快捷工具（编辑器已移除） -->
        <div class="tools-section">
          <h3>{{ t('panel.tools') }}</h3>
          <ul class="tools-list">
            <li v-for="item in quickTools" :key="item.path" class="tool-item">
              <a :href="item.path" @click.prevent="go(item.path)">
                <span class="tool-icon"><component :is="item.icon" :size="16" /></span>
                <span class="tool-name">{{ t(item.key) }}</span>
              </a>
            </li>
          </ul>
        </div>

        <!-- 最近访问 = store.recentVisits -->
        <div class="recent-section">
          <h3>{{ t('panel.recent') }}</h3>
          <ul class="recent-list">
            <li v-for="item in recent" :key="item.path" class="recent-item">
              <a :href="item.path" @click.prevent="go(item.path)">
                <span class="recent-name">{{ item.title }}</span>
              </a>
            </li>
          </ul>
        </div>

        <!-- 设置：深色 / 低性能 / 陀螺仪（移动端） -->
        <div class="settings-section">
          <h3>{{ t('panel.settings') }}</h3>
          <div class="setting-item">
            <span class="setting-label">{{ t('panel.setting.dark') }}</span>
            <label class="toggle-switch">
              <input
                type="checkbox"
                class="toggle-input"
                :checked="settings.darkMode"
                @change="settings.toggleDarkMode()"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <span class="setting-label">{{ t('panel.setting.lowPerformance') }}</span>
            <label class="toggle-switch">
              <input
                type="checkbox"
                class="toggle-input"
                :checked="settings.lowPerformance"
                @change="settings.setLowPerformance(!settings.lowPerformance)"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div v-if="showGyroscope" class="setting-item">
            <span class="setting-label">{{ t('panel.setting.gyroscope') }}</span>
            <label class="toggle-switch">
              <input
                type="checkbox"
                class="toggle-input"
                :checked="settings.gyroscope"
                @change="toggleGyroscope"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- 语言设置（i18n 字典，范围限 chrome 文案） -->
        <div class="language-section">
          <h3>{{ t('panel.language') }}</h3>
          <select
            :value="settings.locale"
            class="language-select"
            @change="settings.setLocale(($event.target as HTMLSelectElement).value)"
          >
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁体中文</option>
            <option value="en-US">English</option>
          </select>
        </div>
      </aside>
    </div>
  </Transition>
</template>
