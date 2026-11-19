import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'
import type { SearchEntry } from '@/utils/blog'

/**
 * 面板搜索：query → 打分排序后的结果 → 键盘 activeIndex。
 * 副作用（滚动 / 发事件）留在组件，composable 只负责派生数据。
 */
export function usePanelSearch(entries: MaybeRefOrGetter<SearchEntry[]>) {
  const query = ref('')
  const activeIndex = ref(-1)

  const normalizedQuery = computed(() => query.value.trim().toLowerCase())

  const isSearching = computed(() => normalizedQuery.value.length > 0)

  const results = computed<SearchEntry[]>(() => {
    const q = normalizedQuery.value
    if (!q) return []

    return toValue(entries)
      .map((entry, order) => {
        const title = entry.title.toLowerCase()
        const excerpt = entry.excerpt.toLowerCase()
        const path = entry.path.toLowerCase()
        let score = -1

        if (title.startsWith(q)) score = 0
        else if (title.includes(q)) score = 1
        else if (excerpt.includes(q)) score = 2
        else if (path.includes(q)) score = 3

        return { entry, order, score }
      })
      .filter((item) => item.score >= 0)
      .sort((a, b) => a.score - b.score || a.order - b.order)
      .slice(0, 8)
      .map((item) => item.entry)
  })

  // 结果集变化后回到“未选中”；activeIndex 只由 ↑↓ / hover 改。
  watch(results, () => {
    activeIndex.value = -1
  })

  const activeEntry = computed(() => results.value[activeIndex.value] ?? null)

  function setActive(index: number) {
    activeIndex.value = index
  }

  function move(delta: number) {
    const total = results.value.length
    if (!total) return

    activeIndex.value = activeIndex.value < 0
      ? (delta > 0 ? 0 : total - 1)
      : (activeIndex.value + delta + total) % total
  }

  function reset() {
    query.value = ''
    activeIndex.value = -1
  }

  return {
    query,
    results,
    activeIndex,
    activeEntry,
    isSearching,
    setActive,
    move,
    reset,
  }
}
