<script setup lang="ts">
import type { MaimaiChart } from '@/utils/maimai'

/** 列表条目：SD/DX Best 列表传 MaimaiChart，推荐列表额外带 raGap */
export type ChartEntry = MaimaiChart & { raGap?: number }

const props = defineProps<{
  charts: ChartEntry[]
  statKey: 'ra' | 'raGap'
}>()

const statLabel = props.statKey === 'ra' ? 'RA' : '潜力RA提升'
</script>

<template>
  <div class="chart-grid">
    <div v-for="(chart, index) in charts" :key="`${chart.type}-${index}`" class="chart-item">
      <div class="chart-rank">#{{ index + 1 }}</div>
      <div class="chart-info">
        <div class="chart-title">{{ chart.title }} [{{ chart.type }}]</div>
        <div class="chart-stats">
          <span>难度: {{ chart.level_label || chart.level }} ({{ chart.ds }})</span>
          <span>达成率: {{ chart.achievements.toFixed(4) }}%</span>
          <span>{{ statLabel }}: {{ chart[statKey] }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
