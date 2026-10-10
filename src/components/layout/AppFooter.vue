<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <h3 class="logo">Konita</h3>
        <p>{{ t('footer.tagline') }}</p>
      </div>
      <ul class="footer-links">
        <li><RouterLink to="/" class="footer-link">{{ t('nav.home') }}</RouterLink></li>
        <li><RouterLink to="/tools" class="footer-link">{{ t('nav.tools') }}</RouterLink></li>
        <li><RouterLink to="/blog" class="footer-link">{{ t('nav.blog') }}</RouterLink></li>
        <li><RouterLink to="/about" class="footer-link">{{ t('nav.about') }}</RouterLink></li>
      </ul>
      <p class="footer-copyright">© {{ new Date().getFullYear() }} Konita.</p>
    </div>
  </footer>
</template>
