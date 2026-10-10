<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <div class="not-found-page">
    <h1 class="not-found-code">404</h1>
    <p class="not-found-text">{{ t('notFound.title') }}</p>
    <RouterLink to="/" class="btn btn-primary">{{ t('notFound.back') }}</RouterLink>
  </div>
</template>
