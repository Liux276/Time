<template>
  <div
    class="card-glass p-4 cursor-pointer transition-all hover:shadow-md"
    :class="[
      selected ? 'ring-2 ring-[var(--color-accent)] bg-[var(--color-surface)]' : 'hover:-translate-y-0.5',
      iteration.status === 'completed' ? 'opacity-50 grayscale-[30%]' : '',
    ]"
    @click="$emit('select', iteration.id)"
  >
    <!-- Header: name + status -->
    <div class="flex items-start justify-between gap-2 mb-2">
      <h3 class="text-sm font-semibold truncate" style="color: var(--color-text-primary)">{{ iteration.name }}</h3>
      <n-tag :type="ITERATION_STATUS_NAIVE_TYPE[iteration.status]" size="tiny" :bordered="false" round class="flex-shrink-0">
        {{ ITERATION_STATUS_CONFIG[iteration.status].label }}
      </n-tag>
    </div>

    <!-- Date range -->
    <div class="text-caption mb-3" style="color: var(--color-text-tertiary)">
      {{ iteration.planned_start || '-' }} ~ {{ iteration.planned_end || '-' }}
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-1 text-center pt-2" style="border-top: 1px solid var(--color-border)">
      <div>
        <div class="text-xs font-bold" style="color: var(--color-accent)">{{ iteration.task_count }}</div>
        <div class="text-caption" style="color: var(--color-text-tertiary)">任务</div>
      </div>
      <div>
        <div class="text-xs font-bold" style="color: var(--color-info)">{{ iteration.estimated_hours }}h</div>
        <div class="text-caption" style="color: var(--color-text-tertiary)">预估</div>
      </div>
      <div>
        <div class="text-xs font-bold" style="color: var(--color-success)">{{ iteration.completed_hours }}h</div>
        <div class="text-caption" style="color: var(--color-text-tertiary)">完成</div>
      </div>
    </div>

    <!-- Summary preview -->
    <p v-if="iteration.summary" class="text-caption mt-2 line-clamp-2" style="color: var(--color-text-secondary)">
      {{ iteration.summary }}
    </p>
  </div>
</template>

<script setup lang="ts">
import type { Iteration } from '@/types';
import { ITERATION_STATUS_CONFIG, ITERATION_STATUS_NAIVE_TYPE } from '@/types';

defineProps<{
  iteration: Iteration;
  selected: boolean;
}>();

defineEmits<{
  select: [id: string];
}>();
</script>
