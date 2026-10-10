import { useSettingsStore } from '@/stores/settings'
import { translate, supportedLocales } from '@/i18n'

export function useI18n() {
  const settings = useSettingsStore()
  // t 每次调用都读响应式 store.locale，禁止在某处缓存 dict[store.locale]（否则语言切换不响应）
  const t = (key: string) => translate(settings.locale, key)
  return { t, locale: settings.locale, setLocale: settings.setLocale, supportedLocales }
}
