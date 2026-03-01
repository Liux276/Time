<template>
  <div class="stat-card stagger-item" :class="{ 'cursor-pointer': clickable }" @click="$emit('click')">
    <div class="flex items-start justify-between">
      <div class="pl-3">
        <div class="stat-value">{{ displayValue }}</div>
        <div class="stat-label">{{ label }}</div>
      </div>
      <div
        v-if="icon"
        class="flex items-center justify-center w-10 h-10 rounded-md"
        :style="{ background: accentBg }"
      >
        <AppIcon :name="icon" :size="20" :color="accentColor" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';

const props = withDefaults(defineProps<{
  value: number | string
  label: string
  suffix?: string
  icon?: string
  accent?: string
  clickable?: boolean
}>(), {
  suffix: '',
  accent: 'var(--color-accent)',
  clickable: false,
});

defineEmits(['click']);

const displayValue = computed(() =>
  typeof props.value === 'number' ? `${props.value}${props.suffix}` : props.value
);

const accentColor = computed(() => props.accent);
const accentBg = computed(() => {
  if (props.accent === 'var(--color-accent)') return 'var(--color-accent-light)';
  if (props.accent === 'var(--color-success)') return 'rgba(92,184,92,0.1)';
  if (props.accent === 'var(--color-info)') return 'rgba(91,192,222,0.1)';
  if (props.accent === 'var(--color-warning)') return 'rgba(240,173,78,0.1)';
  return 'var(--color-accent-light)';
});
</script>
