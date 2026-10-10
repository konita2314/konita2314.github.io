<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useI18n } from '@/composables/useI18n'
import { useScrollLock } from '@/composables/useScrollLock'
import { getSearchIndex, type SearchEntry } from '@/utils/blog'

const settings = useSettingsStore()
const { t } = useI18n()
const router = useRouter()
const { lock, unlock } = useScrollLock()

const searchQuery = ref('')
const isSearchFocused = ref(false)

const searchResults = computed<SearchEntry[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  return getSearchIndex()
    .filter((e) => e.title.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q))
    .slice(0, 8)
})

const quickTools = [
  { path: '/tools/clock', icon: '🕒', key: 'tool.clock' },
  { path: '/tools/maimai', icon: '🎵', key: 'tool.maimai' },
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
  <Transition name="panel">
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
              <button type="submit" class="search-btn">🔍</button>
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
                <span class="tool-icon">{{ item.icon }}</span>
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

        <!-- 设置：两项接 store -->
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
