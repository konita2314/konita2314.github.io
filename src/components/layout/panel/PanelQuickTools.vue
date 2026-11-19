<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { QuickToolItem } from './types'

defineProps<{ items: QuickToolItem[] }>()

const emit = defineEmits<{ select: [path: string] }>()

const { t } = useI18n()
</script>

<template>
  <section class="tools-section" aria-labelledby="panel-tools-title">
    <div class="section-head">
      <h3 id="panel-tools-title">{{ t('panel.tools') }}</h3>
    </div>

    <ul class="tools-list">
      <li v-for="item in items" :key="item.path" class="tool-item">
        <a :href="item.path" @click.prevent="emit('select', item.path)">
          <span class="tool-icon" aria-hidden="true">
            <component :is="item.icon" :size="16" />
          </span>
          <span class="tool-name">{{ t(item.labelKey) }}</span>
        </a>
      </li>
    </ul>
  </section>
</template>
