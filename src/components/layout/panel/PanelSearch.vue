<script setup lang="ts">
import { nextTick, useTemplateRef, watch } from 'vue'
import { Search } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import { usePanelSearch } from '@/composables/usePanelSearch'
import type { SearchEntry } from '@/utils/blog'

const props = defineProps<{ entries: SearchEntry[] }>()

const emit = defineEmits<{
  select: [path: string]
  'update:searching': [value: boolean]
}>()

const { t } = useI18n()

const {
  query,
  results,
  activeIndex,
  activeEntry,
  isSearching,
  setActive,
  move,
  reset,
} = usePanelSearch(() => props.entries)

const inputRef = useTemplateRef<HTMLInputElement>('searchInput')
const resultListRef = useTemplateRef<HTMLUListElement>('resultList')

// 父层据此在“搜索模式”和“浏览模式”之间切换。
watch(
  isSearching,
  (value) => emit('update:searching', value),
  { immediate: true },
)

// 键盘选中项始终留在可视区；滚动行为交给 DOM，composable 不碰 DOM。
watch(activeIndex, async (index) => {
  if (index < 0) return
  await nextTick()
  resultListRef.value
    ?.querySelector<HTMLElement>(`[data-index="${index}"]`)
    ?.scrollIntoView({ block: 'nearest' })
})

function submit() {
  const entry = activeEntry.value ?? results.value[0]
  if (entry) emit('select', entry.path)
}

function clear() {
  reset()
  void nextTick(() => inputRef.value?.focus())
}

function onInputKeydown(event: KeyboardEvent) {
  if (event.isComposing) return

  // 第一次 Esc 只清搜索；没有内容时不拦截，交给面板的 Esc 关闭。
  if (event.key === 'Escape') {
    if (!query.value) return
    event.preventDefault()
    event.stopPropagation()
    clear()
    return
  }

  if (!isSearching.value) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <div class="search-section" role="search">
    <form class="search-form" @submit.prevent="submit">
      <div class="search-input-container">
        <input
          ref="searchInput"
          v-model="query"
          class="search-input"
          type="search"
          :placeholder="t('panel.search.placeholder')"
          :aria-label="t('panel.search.label')"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          :aria-expanded="results.length > 0"
          aria-controls="panel-search-results"
          :aria-activedescendant="
            activeIndex >= 0 ? `panel-search-result-${activeIndex}` : undefined
          "
          autocomplete="off"
          spellcheck="false"
          @keydown="onInputKeydown"
        />

        <button
          v-if="!query"
          class="search-btn"
          type="submit"
          :aria-label="t('panel.search.label')"
        >
          <Search :size="16" />
        </button>
        <button
          v-else
          class="search-clear"
          type="button"
          :aria-label="t('panel.search.clear')"
          @click="clear"
        >
          ×
        </button>
      </div>
    </form>

    <div v-if="isSearching" class="search-results-wrap">
      <p v-if="results.length" class="search-count" aria-live="polite">
        {{ results.length }} {{ t('panel.search.count') }}
      </p>

      <ul
        v-if="results.length"
        id="panel-search-results"
        ref="resultList"
        class="search-results"
        role="listbox"
        :aria-label="t('panel.search.results')"
      >
        <li
          v-for="(entry, index) in results"
          :id="`panel-search-result-${index}`"
          :key="entry.path"
          class="search-result"
          :class="{ 'is-active': activeIndex === index }"
          role="option"
          :aria-selected="activeIndex === index"
          :data-index="index"
          @mouseenter="setActive(index)"
          @click="emit('select', entry.path)"
        >
          <span class="search-result-title">{{ entry.title }}</span>
          <span class="search-result-path">{{ entry.path }}</span>
        </li>
      </ul>

      <p v-else class="search-empty">
        {{ t('panel.search.empty') }}
        <span>{{ t('panel.search.emptyHint') }}</span>
      </p>
    </div>
  </div>
</template>
