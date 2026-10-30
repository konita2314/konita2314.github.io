<script setup lang="ts">
import { nextTick, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { BookOpen } from 'lucide-vue-next'
import type { TocItem } from '@/utils/markdown'

const props = defineProps<{ items: TocItem[] }>()

const open = ref(false)
const buttonRef = useTemplateRef<HTMLButtonElement>('button')
const panelRef = useTemplateRef<HTMLElement>('panel')

/**
 * 面板高度上限（px）：打开时按「按钮上方的实际可用空间」算出来。
 * 内容比它矮 → 面板自然收起、不出现滚动条；内容更高 → 封顶并滚动。
 */
const panelMaxHeight = ref<number | null>(null)
/** 本次展开是否需要滚动条（CSS 用它预留滚动条槽位，避免文字左右跳） */
const scrollable = ref(false)

function measure() {
  const panel = panelRef.value
  if (!panel) return
  // 面板贴在按钮正上方（bottom: calc(100% + 12px)），
  // 所以「它的下边缘到视口顶部」就是它最多能长多高
  const available = Math.max(180, Math.floor(panel.getBoundingClientRect().bottom - 16))
  panelMaxHeight.value = available
  scrollable.value = panel.scrollHeight > available + 1
}

function onResize() {
  measure()
}

/** 点到面板和按钮以外的地方就收起（悬浮面板的常规行为） */
function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Node | null
  if (!target) return
  if (panelRef.value?.contains(target) || buttonRef.value?.contains(target)) return
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

async function toggle() {
  open.value = !open.value
  if (!open.value) return
  await nextTick()
  measure()
}

watch(open, (isOpen) => {
  if (isOpen) {
    window.addEventListener('resize', onResize, { passive: true })
    document.addEventListener('pointerdown', onDocumentPointerDown, true)
    document.addEventListener('keydown', onKeydown)
    return
  }
  window.removeEventListener('resize', onResize)
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
})

// 换文章（目录内容变了）时重新量一次
watch(
  () => props.items,
  async () => {
    if (!open.value) return
    await nextTick()
    measure()
  },
)

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  document.removeEventListener('pointerdown', onDocumentPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
})

function scrollToHeading(id: string) {
  const element = document.getElementById(id)
  if (element) element.scrollIntoView({ behavior: 'smooth' })
  open.value = false
}
</script>

<template>
  <!-- 悬浮目录（右下角）：id 与 markdown.ts 渲染的 heading-N 同源，中文标题可跳（修复原 slug 化空 id） -->
  <div class="toc-container">
    <button
      ref="button"
      class="toc-button"
      :aria-expanded="open"
      :aria-label="open ? '关闭目录' : '打开目录'"
      @click="toggle"
    >
      <BookOpen :size="20" />
    </button>

    <div
      v-if="open"
      ref="panel"
      class="toc-panel"
      :class="{ 'is-scrollable': scrollable }"
      :style="panelMaxHeight === null ? undefined : { '--toc-max-h': `${panelMaxHeight}px` }"
      role="navigation"
      aria-label="文章目录"
    >
      <h4>目录</h4>
      <ul class="toc-list">
        <li
          v-for="item in items"
          :key="item.id"
          :class="['toc-item', `level-${item.level}`]"
          @click="scrollToHeading(item.id)"
        >
          {{ item.text }}
        </li>
      </ul>
    </div>
  </div>
</template>
