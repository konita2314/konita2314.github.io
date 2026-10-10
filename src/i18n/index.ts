// 最小字典：只覆盖 chrome 文案（导航/页脚/面板/设置/弹窗/404），页面正文保持中文
export const supportedLocales = ['zh-CN', 'zh-TW', 'en-US'] as const
export type Locale = (typeof supportedLocales)[number]

type Entry = Record<Locale, string>

const dict: Record<string, Entry> = {
  'nav.home': { 'zh-CN': '首页', 'zh-TW': '首頁', 'en-US': 'Home' },
  'nav.tools': { 'zh-CN': '工具', 'zh-TW': '工具', 'en-US': 'Tools' },
  'nav.blog': { 'zh-CN': '博客', 'zh-TW': '部落格', 'en-US': 'Blog' },
  'nav.about': { 'zh-CN': '关于', 'zh-TW': '關於', 'en-US': 'About' },
  'footer.tagline': {
    'zh-CN': '--让世界再次可爱--',
    'zh-TW': '--讓世界再次可愛--',
    'en-US': '--Make the world lovely again--',
  },
  'panel.title': { 'zh-CN': '功能面板', 'zh-TW': '功能面板', 'en-US': 'Panel' },
  'panel.search.placeholder': { 'zh-CN': '搜索...', 'zh-TW': '搜尋...', 'en-US': 'Search...' },
  'panel.search.noResults': { 'zh-CN': '无结果', 'zh-TW': '無結果', 'en-US': 'No results' },
  'panel.tools': { 'zh-CN': '快捷工具', 'zh-TW': '快捷工具', 'en-US': 'Quick Tools' },
  'panel.recent': { 'zh-CN': '最近访问', 'zh-TW': '最近訪問', 'en-US': 'Recent' },
  'panel.settings': { 'zh-CN': '系统设置', 'zh-TW': '系統設定', 'en-US': 'Settings' },
  'panel.language': { 'zh-CN': '语言设置', 'zh-TW': '語言設定', 'en-US': 'Language' },
  'panel.setting.dark': { 'zh-CN': '深色模式', 'zh-TW': '深色模式', 'en-US': 'Dark Mode' },
  'panel.setting.lowPerformance': {
    'zh-CN': '低性能模式',
    'zh-TW': '低效能模式',
    'en-US': 'Low Performance Mode',
  },
  'tool.clock': { 'zh-CN': '时钟', 'zh-TW': '時鐘', 'en-US': 'Clock' },
  'tool.maimai': { 'zh-CN': '舞萌查分', 'zh-TW': '舞萌查分', 'en-US': 'Maimai Scores' },
  'popup.title': { 'zh-CN': '性能优化', 'zh-TW': '效能最佳化', 'en-US': 'Performance' },
  'popup.text': {
    'zh-CN': '保持网页原有动画效果可能影响性能。是否关闭动画以提升速度？',
    'zh-TW': '保持網頁原有動畫效果可能影響效能。是否關閉動畫以提升速度？',
    'en-US': 'Keeping animations may affect performance. Disable them for better speed?',
  },
  'popup.disable': { 'zh-CN': '关闭动画', 'zh-TW': '關閉動畫', 'en-US': 'Disable' },
  'popup.keep': { 'zh-CN': '保持开启', 'zh-TW': '保持開啟', 'en-US': 'Keep' },
  'notFound.title': { 'zh-CN': '页面不存在', 'zh-TW': '頁面不存在', 'en-US': 'Page not found' },
  'notFound.back': { 'zh-CN': '返回首页', 'zh-TW': '返回首頁', 'en-US': 'Back to Home' },
  'loading': { 'zh-CN': '加载中...', 'zh-TW': '載入中...', 'en-US': 'Loading...' },
  'theme.toLight': { 'zh-CN': '切换到亮色模式', 'zh-TW': '切換到亮色模式', 'en-US': 'Switch to light mode' },
  'theme.toDark': { 'zh-CN': '切换到暗色模式', 'zh-TW': '切換到暗色模式', 'en-US': 'Switch to dark mode' },
  'nav.drawer': { 'zh-CN': '打开导航菜单', 'zh-TW': '開啟導航選單', 'en-US': 'Open navigation menu' },
}

export function translate(locale: string, key: string): string {
  const entry = dict[key]
  if (!entry) return key
  return entry[locale as Locale] ?? entry['zh-CN']
}
