<template>
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
    <div class="flex items-center gap-3 min-w-0">
      <button
        v-if="showBack"
        class="flex items-center justify-center w-10 h-10 rounded-md hover:bg-surface transition-colors flex-shrink-0"
        @click="$router.back()"
      >
        <AppIcon name="arrow-back" :size="20" />
      </button>
      <div class="min-w-0">
        <h1 class="text-h3 sm:text-h2 truncate">{{ title }}</h1>
        <p v-if="subtitle" class="text-caption mt-1">{{ subtitle }}</p>
      </div>
      <slot name="after-title" />
    </div>
    <div class="flex items-center gap-2 flex-shrink-0">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue';

defineProps<{
  title: string
  subtitle?: string
  showBack?: boolean
}>();
</script>
