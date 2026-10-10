<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import ChartList from '@/components/maimai/ChartList.vue'
import { ApiError, exportB50Image, fetchPlayerData, type MaimaiResult } from '@/utils/maimai'

const settings = useSettingsStore()

const username = ref('')
const importToken = ref('')
const loading = ref(false)
const error = ref('')
const result = ref<MaimaiResult | null>(null)
const isLoggedIn = ref(false)

const SAVED_KEY = 'maimaiUser'

// 组件加载时恢复本地保存的用户信息（真实功能保留）
onMounted(() => {
  try {
    const saved = localStorage.getItem(SAVED_KEY)
    if (saved) {
      const userData: { username?: unknown; importToken?: unknown } = JSON.parse(saved)
      username.value = String(userData.username ?? '')
      importToken.value = String(userData.importToken ?? '')
      isLoggedIn.value = true
    }
  } catch {
    localStorage.removeItem(SAVED_KEY)
  }
})

async function handleSubmit() {
  if (!username.value) {
    error.value = '请输入用户名或ID'
    return
  }

  loading.value = true
  error.value = ''
  result.value = null

  try {
    const data = await fetchPlayerData(username.value, importToken.value)
    result.value = data
    localStorage.setItem(SAVED_KEY, JSON.stringify({ username: username.value, importToken: importToken.value }))
    isLoggedIn.value = true
  } catch (err) {
    error.value = err instanceof ApiError ? err.message : '网络错误，请稍后再试'
  } finally {
    loading.value = false
  }
}

function handleLogout() {
  localStorage.removeItem(SAVED_KEY)
  username.value = ''
  importToken.value = ''
  isLoggedIn.value = false
  result.value = null
}

function handleExport() {
  if (result.value) exportB50Image(result.value, settings.darkMode)
}
</script>

<template>
  <section class="maimai-page">
    <div class="container">
      <h2 class="section-title">舞萌查分器</h2>

      <div class="maimai-container">
        <div class="maimai-content">
          <h3>舞萌查分器</h3>

          <form class="maimai-form" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label for="username">用户名/ID</label>
              <input
                id="username"
                v-model="username"
                type="text"
                placeholder="请输入舞萌用户名或ID"
                class="form-input"
              />
            </div>
            <div class="form-group">
              <label for="importToken">Import-Token (可选，用于获取完整数据)</label>
              <input
                id="importToken"
                v-model="importToken"
                type="text"
                placeholder="输入水鱼查分器的Import-Token以获取完整数据"
                class="form-input"
              />
            </div>
            <div class="form-actions">
              <button type="submit" class="submit-button" :disabled="loading">
                {{ loading ? '查询中...' : '生成B50' }}
              </button>
              <button v-if="isLoggedIn" type="button" class="submit-button logout-btn" @click="handleLogout">
                登出
              </button>
            </div>
          </form>

          <div v-if="error" class="error-message">{{ error }}</div>

          <div v-if="result" class="maimai-result">
            <div class="result-header">
              <h4>{{ result.nickname }} 的 B50</h4>
              <div class="rating-info">
                <span>SD: {{ result.sdRating }}</span>
                <span>DX: {{ result.dxRating }}</span>
                <span>总计: {{ result.totalRating }}</span>
              </div>
              <div v-if="!result.isDataComplete" class="data-warning">
                <p>⚠️ 数据不完整：API仅返回了部分游玩记录</p>
                <p>SD歌曲: {{ result.sdCount }}/35首 | DX歌曲: {{ result.dxCount }}/15首</p>
                <p>建议：如需完整B50，请使用水鱼查分器同步完整数据</p>
              </div>
              <button class="submit-button" @click="handleExport">导出B50图片</button>
            </div>

            <div class="best-lists">
              <div class="best-list sd-list">
                <h5>SD Best 35</h5>
                <ChartList :charts="result.sdBest" stat-key="ra" />
              </div>
              <div class="best-list dx-list">
                <h5>DX Best 15</h5>
                <ChartList :charts="result.dxBest" stat-key="ra" />
              </div>
            </div>

            <div v-if="result.recommendations.length > 0" class="recommendations">
              <h5>推荐推分歌曲</h5>
              <ChartList :charts="result.recommendations" stat-key="raGap" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
