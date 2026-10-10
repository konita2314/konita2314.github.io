<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { hasPerformancePopupShown, useSettingsStore } from '@/stores/settings'
import { useI18n } from '@/composables/useI18n'

const settings = useSettingsStore()
const { t } = useI18n()

const visible = ref(false)
let timer: number | undefined

// 关闭按钮、自动关闭、两个按钮都会写 performancePopupShown key（补丁 9）
function dismiss() {
  visible.value = false
  settings.markPerformancePopupShown()
  if (timer !== undefined) {
    clearTimeout(timer)
    timer = undefined
  }
}

function disableAnimations() {
  settings.setLowPerformance(true)
  dismiss()
}

function keepAnimations() {
  settings.setLowPerformance(false)
  dismiss()
}

onMounted(() => {
  // key 不存在才弹
  const shown = hasPerformancePopupShown()
  visible.value = !shown
  if (!shown) timer = window.setTimeout(dismiss, 8000)
})

onUnmounted(() => {
  if (timer !== undefined) clearTimeout(timer)
})
</script>

<template>
  <Transition name="popup">
    <div v-if="visible" class="performance-popup">
      <button class="popup-close" aria-label="关闭" @click="dismiss">✕</button>
      <h3>{{ t('popup.title') }}</h3>
      <p>{{ t('popup.text') }}</p>
      <div class="popup-actions">
        <button class="btn btn-primary" @click="disableAnimations">{{ t('popup.disable') }}</button>
        <button class="btn btn-secondary" @click="keepAnimations">{{ t('popup.keep') }}</button>
      </div>
    </div>
  </Transition>
</template>
