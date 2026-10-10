<script setup lang="ts">
import { getAllPosts } from '@/utils/blog'
import BlogCard from '@/components/blog/BlogCard.vue'

// 同步读取（eager glob + 模块级单例），无 loading 态
const posts = getAllPosts()
</script>

<template>
  <section class="blog-page">
    <div class="container">
      <h2 class="section-title">博客</h2>

      <div v-if="posts.length === 0" class="no-posts">暂无博客</div>
      <div v-else class="blog-grid">
        <BlogCard v-for="post in posts" :key="post.id" :post="post" />
      </div>
    </div>
  </section>
</template>
