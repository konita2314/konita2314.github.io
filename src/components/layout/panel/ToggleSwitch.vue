<script setup lang="ts">
defineProps<{ checked: boolean }>()

const emit = defineEmits<{ change: [value: boolean] }>()

function onChange(event: Event) {
  emit('change', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <span class="toggle-switch">
    <input
      type="checkbox"
      role="switch"
      :checked="checked"
      @change="onChange"
    />
    <span class="toggle-slider" aria-hidden="true"></span>
  </span>
</template>
