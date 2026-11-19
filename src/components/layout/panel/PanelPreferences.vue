<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import ToggleSwitch from './ToggleSwitch.vue'

defineProps<{
  darkMode: boolean
  lowPerformance: boolean
  gyroscope: boolean
  locale: string
  showGyroscope: boolean
}>()

const emit = defineEmits<{
  'update-dark-mode': [value: boolean]
  'update-low-performance': [value: boolean]
  'update-gyroscope': [value: boolean]
  'update-locale': [value: string]
}>()

const { t } = useI18n()
</script>

<template>
  <section class="settings-section" aria-labelledby="panel-settings-title">
    <div class="section-head">
      <h3 id="panel-settings-title">{{ t('panel.settings') }}</h3>
    </div>

    <label class="setting-item">
      <span class="setting-label">{{ t('panel.setting.dark') }}</span>
      <ToggleSwitch :checked="darkMode" @change="emit('update-dark-mode', $event)" />
    </label>

    <label class="setting-item">
      <span class="setting-label">{{ t('panel.setting.lowPerformance') }}</span>
      <ToggleSwitch
        :checked="lowPerformance"
        @change="emit('update-low-performance', $event)"
      />
    </label>

    <label v-if="showGyroscope" class="setting-item">
      <span class="setting-label">{{ t('panel.setting.gyroscope') }}</span>
      <ToggleSwitch :checked="gyroscope" @change="emit('update-gyroscope', $event)" />
    </label>
  </section>

  <section class="language-section" aria-labelledby="panel-language-title">
    <div class="section-head">
      <h3 id="panel-language-title">{{ t('panel.language') }}</h3>
    </div>

    <select
      class="language-select"
      :value="locale"
      :aria-label="t('panel.language')"
      @change="emit('update-locale', ($event.target as HTMLSelectElement).value)"
    >
      <option value="zh-CN">简体中文</option>
      <option value="zh-TW">繁体中文</option>
      <option value="en-US">English</option>
    </select>
  </section>
</template>
