<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { getPostById } from '@/utils/blog'
import { renderMarkdown } from '@/utils/markdown'
import BlogToc from '@/components/blog/BlogToc.vue'
import GiscusComments from '@/components/blog/GiscusComments.vue'

const route = useRoute()

const post = computed(() => getPostById(route.params.id as string))

const rendered = computed(() => (post.value ? renderMarkdown(post.value.content) : null))

const isOverAYearOld = computed(() => {
  if (!post.value?.lastModified) return false
  const lastModified = new Date(post.value.lastModified)
  const diffYears = Math.abs(Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return diffYears > 1
})

// 文章加载后标题覆盖路由 afterEach 的默认标题
watchEffect(() => {
  if (post.value) document.title = `${post.value.title} | Konita`
})
</script>

<template>
  <section class="blog-post-page">
    <div class="container">
      <div class="blog-content">
        <div v-if="!post" class="error">博客不存在</div>
        <template v-else>
          <div class="markdown-content">
            <!-- 标题从 info.txt 渲染一次（修复原每个 h1 都重复渲染标题+meta 的 bug） -->
            <h1 class="blog-title">{{ post.title }}</h1>
            <blockquote class="blog-meta">
              <p>
                发布日期: {{ post.date || '未知' }} | 最后修改日期: {{ post.lastModified || '未知' }}
              </p>
              <p v-if="isOverAYearOld" class="blog-warning">
                文章已超过一年未更新，可能无法提供准确的信息，请仔细甄别
              </p>
            </blockquote>

            <!-- markdown-it 渲染正文（hljs 高亮，标题 id heading-N 与 TOC 同源） -->
            <div v-html="rendered?.html"></div>
          </div>

          <!-- giscus 评论区（GitHub Discussions，替代原假评论 UI） -->
          <GiscusComments />
        </template>
      </div>
    </div>

    <BlogToc :items="rendered?.toc ?? []" />
  </section>
</template>
