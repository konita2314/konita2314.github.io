<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { SearchEntry } from '@/utils/blog'

defineProps<{
  items: SearchEntry[]
  currentPath: string
}>()

const emit = defineEmits<{
  select: [path: string]
  clear: []
}>()

const { t } = useI18n()
</script>

<template>
  <section class="recent-section" aria-labelledby="panel-recent-title">
    <div class="section-head">
      <h3 id="panel-recent-title">{{ t('panel.recent') }}</h3>
      <button
        v-if="items.length"
        class="section-action"
        type="button"
        :aria-label="t('panel.recent.clearAria')"
        @click="emit('clear')"
      >
        {{ t('panel.recent.clear') }}
      </button>
    </div>

    <ul v-if="items.length" class="recent-list">
      <li
        v-for="(item, index) in items"
        :key="item.path"
        class="recent-item"
        :style="{ animationDelay: `${index * 18}ms` }"
      >
        <a
          :href="item.path"
          :class="{ 'is-current': item.path === currentPath }"
          :aria-current="item.path === currentPath ? 'page' : undefined"
          @click.prevent="emit('select', item.path)"
        >
          {{ item.title }}
        </a>
      </li>
    </ul>

    <p v-else class="panel-empty">{{ t('panel.recent.empty') }}</p>
  </section>
</template>
