<script setup lang="ts">
import { ref } from 'vue'
import { BookOpen } from 'lucide-vue-next'
import type { TocItem } from '@/utils/markdown'

defineProps<{ items: TocItem[] }>()

const open = ref(false)

function scrollToHeading(id: string) {
  const element = document.getElementById(id)
  if (element) element.scrollIntoView({ behavior: 'smooth' })
  open.value = false
}
</script>

<template>
  <!-- 悬浮目录：id 与 markdown.ts 渲染的 heading-N 同源，中文标题可跳（修复原 slug 化空 id） -->
  <div class="toc-container">
    <button class="toc-button" aria-label="目录" @click="open = !open">
      <BookOpen :size="18" />
    </button>
    <div v-if="open" class="toc-panel">
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
