<script setup lang="ts">
import type { Post } from '@/utils/blog'

const props = defineProps<{ post: Post }>()

// cover 字段生效：URL 作图片，否则作字符；空回退 📝
function isUrl(value?: string): boolean {
  return !!value && /^https?:\/\//i.test(value.trim())
}
</script>

<template>
  <div class="blog-card">
    <div class="blog-image">
      <img v-if="isUrl(props.post.cover)" :src="props.post.cover" :alt="props.post.title" />
      <template v-else>{{ props.post.cover || '📝' }}</template>
    </div>
    <div class="blog-content">
      <h3 class="blog-title">{{ props.post.title }}</h3>
      <!-- excerpt 不硬拼 "..."（信息来自 info.txt） -->
      <p class="blog-excerpt">{{ props.post.excerpt }}</p>
      <div class="blog-link">
        <RouterLink :to="`/blog/${props.post.id}`">阅读更多 →</RouterLink>
      </div>
    </div>
  </div>
</template>
