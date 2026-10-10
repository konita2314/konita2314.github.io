// 博客内容加载：约定 blog/{id}/info.txt（元信息）+ info.md（正文）
// info.txt 为 key: value 行格式：title / date / excerpt / cover / lastModified
export interface Post {
  id: string
  title: string
  date: string
  excerpt: string
  cover?: string
  lastModified?: string
  content: string
}

// glob key 是相对当前模块的路径（如 '../../blog/1/info.md'），
// 不能按 `blog/${id}/info.md` 模板字符串直接索引（恒为 undefined）——
// 必须遍历 key 正则抽 id 建 map（补丁 2）
const metaFiles = import.meta.glob('../../blog/*/info.txt', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

const contentFiles = import.meta.glob('../../blog/*/info.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function extractId(path: string): string | null {
  const m = path.match(/blog\/(\d+)\/info\.(txt|md)$/)
  return m ? m[1] : null
}

function parseMeta(raw: string): Record<string, string> {
  const meta: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx > 0) {
      const key = line.slice(0, idx).trim()
      const value = line.slice(idx + 1).trim()
      if (key) meta[key] = value
    }
  }
  return meta
}

function findContent(id: string): string {
  for (const [path, content] of Object.entries(contentFiles)) {
    if (extractId(path) === id) return content
  }
  return ''
}

function loadPosts(): Post[] {
  const posts: Post[] = []
  for (const [path, metaRaw] of Object.entries(metaFiles)) {
    const id = extractId(path)
    if (!id) continue
    const meta = parseMeta(metaRaw)
    const content = findContent(id)
    if (!content) continue // 元信息与正文必须成对，否则列表有、正文空
    posts.push({
      id,
      title: meta.title ?? `博客 ${id}`,
      date: meta.date ?? '',
      excerpt: meta.excerpt ?? content.trim().slice(0, 100),
      cover: meta.cover || undefined,
      lastModified: meta.lastModified || undefined,
      content,
    })
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}

// 模块级单例：同步读取，无 loading 态
const posts = loadPosts()

export function getAllPosts(): Post[] {
  return posts
}

export function getPostById(id: string): Post | undefined {
  return posts.find((p) => p.id === id)
}

export interface SearchEntry {
  path: string
  title: string
  excerpt: string
}

const staticPages: SearchEntry[] = [
  { path: '/', title: '首页', excerpt: '' },
  { path: '/tools', title: '工具', excerpt: '' },
  { path: '/tools/clock', title: '时钟', excerpt: '' },
  { path: '/tools/maimai', title: '舞萌查分', excerpt: '' },
  { path: '/blog', title: '博客', excerpt: '' },
  { path: '/about', title: '关于', excerpt: '' },
]

export function getSearchIndex(): SearchEntry[] {
  const blogEntries = posts.map((p) => ({ path: `/blog/${p.id}`, title: p.title, excerpt: p.excerpt }))
  return [...staticPages, ...blogEntries]
}
