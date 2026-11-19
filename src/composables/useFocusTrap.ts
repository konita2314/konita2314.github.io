import { nextTick, onUnmounted, toValue, watch, type MaybeRefOrGetter } from 'vue'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 面板打开时把焦点移入、Tab 在面板内循环，关闭时归还给触发元素。
 * Esc 的业务动作由面板自己处理，这里只做焦点边界。
 */
export function useFocusTrap(
  container: MaybeRefOrGetter<HTMLElement | null>,
  active: () => boolean,
) {
  let previous: HTMLElement | null = null

  function focusableElements(): HTMLElement[] {
    const root = toValue(container)
    if (!root) return []

    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => !element.closest('[hidden]') && element.getClientRects().length > 0,
    )
  }

  function onKeydown(event: KeyboardEvent) {
    if (!active() || event.key !== 'Tab') return

    const root = toValue(container)
    const elements = focusableElements()
    if (!root || !elements.length) return

    const first = elements[0]
    const last = elements[elements.length - 1]
    const current = document.activeElement

    if (!root.contains(current)) {
      event.preventDefault()
      first.focus()
    } else if (event.shiftKey && (current === first || current === root)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && current === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(
    active,
    async (open) => {
      if (open) {
        previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
        window.addEventListener('keydown', onKeydown)
        await nextTick()
        toValue(container)?.focus({ preventScroll: true })
      } else {
        window.removeEventListener('keydown', onKeydown)
        if (previous?.isConnected) previous.focus({ preventScroll: true })
        previous = null
      }
    },
    { immediate: true },
  )

  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
}
