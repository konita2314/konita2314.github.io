/**
 * 一条命令完成「提交 + 推送」，推送后由 .github/workflows/deploy.yml 自动构建并部署。
 *
 * 用法：
 *   npm run deploy                                  # 提交信息用时间戳
 *   $env:SHIP_MSG = "修复陀螺仪"; npm run deploy      # 自定义提交信息（推荐）
 *   npm run deploy -- "修复陀螺仪"                    # 也可以，但 Windows 下空格会被 cmd 转义
 *
 * 说明：不再走 gh-pages 分支那条老路 —— Pages 的发布源是 GitHub Actions，
 * 只有 push 到 main 才会触发部署。
 */
import { spawnSync } from 'node:child_process'

/** 跑一条 git 命令，输出直接透传到终端 */
function git(args, extra = {}) {
  return spawnSync('git', args, { stdio: 'inherit', ...extra })
}

/** 跑一条 git 命令，只取 stdout */
function gitOut(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' })
  return r.status === 0 ? (r.stdout ?? '').trim() : ''
}

function fail(message) {
  console.error(`\n✗ ${message}`)
  process.exit(1)
}

// 1. 暂存全部改动（dist / node_modules 由 .gitignore 排除）
if (git(['add', '-A']).status !== 0) fail('git add 失败')

// 2. 有改动才提交；没改动就跳过，避免「提交失败 → push 被 && 短路」的老坑
const nothingStaged = spawnSync('git', ['diff', '--cached', '--quiet'], { stdio: 'ignore' }).status === 0
if (nothingStaged) {
  console.log('· 没有新的改动，跳过提交，直接推送。')
} else {
  const stamp = new Date().toLocaleString('zh-CN', { hour12: false })
  // Windows 下 npm 走 cmd.exe，命令行里的空格会被转义成 "^ " 之类；SHIP_MSG 环境变量不受影响
  const fromArgs = process.argv
    .slice(2)
    .join(' ')
    .replace(/\^/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const message = (process.env.SHIP_MSG ?? '').trim() || fromArgs || `deploy: ${stamp}`
  console.log(`· 提交：${message}`)
  if (git(['commit', '-m', message]).status !== 0) fail('git commit 失败')
}

// 3. 推送，触发 Actions
if (git(['push']).status !== 0) fail('git push 失败（检查网络 / SSH 免密）')

// 4. 顺手给出 Actions 地址
const remote = gitOut(['remote', 'get-url', 'origin'])
const repo = remote
  .replace(/^git@github\.com:/, '')
  .replace(/^https?:\/\/github\.com\//, '')
  .replace(/\.git$/, '')

console.log(`\n✓ 已推送${repo ? `，部署进度：https://github.com/${repo}/actions` : '。'}`)
