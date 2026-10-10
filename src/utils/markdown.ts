import MarkdownIt from 'markdown-it'
// 只引入 core + 常用语言（全量库 ~190 种语言会把博客分块撑到 1 MB）
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import json from 'highlight.js/lib/languages/json'
import markdown from 'highlight.js/lib/languages/markdown'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import yaml from 'highlight.js/lib/languages/yaml'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('json', json)
hljs.registerLanguage('markdown', markdown)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('python', python)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c', cpp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('yaml', yaml)

export interface TocItem {
  id: string
  text: string
  level: number
}

function escapeHtml(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// hljs 未知语言会抛异常：无该语言时转义降级，不得抛异常（补丁 1）
function highlight(code: string, lang: string): string {
  if (lang && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(code, { language: lang }).value
    } catch {
      // 高亮失败走转义降级
    }
  }
  return escapeHtml(code)
}

/**
 * 渲染 markdown 并生成 TOC。
 * counter 与 toc 必须是本函数局部变量（每次渲染重置，第二次渲染不得继续自增/累积），
 * 因此 MarkdownIt 实例也每次新建，core rule 闭包引用本次的局部变量（补丁 4）。
 * 标题 id 单遍自增编号（heading-1/2/...），渲染 id 与 TOC 数据同源，
 * 中文/emoji 标题永不为空、永不重复。
 */
export function renderMarkdown(source: string): { html: string; toc: TocItem[] } {
  let counter = 0
  const toc: TocItem[] = []

  const md = new MarkdownIt({
    html: false,
    linkify: true,
    highlight,
  })

  md.core.ruler.push('toc_heading_ids', (state) => {
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      if (token.type !== 'heading_open') continue
      const level = Number(token.tag.slice(1))
      let text = ''
      const inline = tokens[i + 1]
      if (inline && inline.type === 'inline' && inline.children) {
        text = inline.children
          .filter((c) => c.type === 'text' || c.type === 'code_inline')
          .map((c) => c.content)
          .join('')
      }
      const id = `heading-${++counter}`
      token.attrSet('id', id)
      toc.push({ id, text, level })
    }
    return true
  })

  return { html: md.render(source), toc }
}
