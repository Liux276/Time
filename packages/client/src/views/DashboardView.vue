<template>
  <MainLayout>
    <div>
      <PageHeader title="数据看板" />

      <div class="grid grid-cols-1 gap-6">
        <!-- Burndown chart -->
        <n-card size="small" class="card-no-hover">
          <template #header><span class="subsection-title">迭代燃尽图</span></template>
          <template #header-extra>
            <n-select v-model:value="selectedIterationId" :options="iterationOptions" placeholder="选择迭代" clearable size="small" style="width: 160px" />
          </template>
          <div v-if="burndownData && burndownData.snapshots.length > 0" class="h-64 sm:h-80">
            <v-chart :option="burndownOption" autoresize />
          </div>
          <n-empty v-else description="暂无燃尽图数据，请选择一个迭代" />
        </n-card>

        <!-- Workload chart -->
        <n-card size="small" class="card-no-hover">
          <template #header><span class="subsection-title">工时投入统计</span></template>
          <template #header-extra>
            <div class="flex flex-wrap items-center gap-2">
              <n-select v-model:value="granularity" :options="granularityOptions" size="small" style="width: 100px" @update:value="loadWorkload" />
              <n-date-picker v-model:formatted-value="startDate" type="date" value-format="yyyy-MM-dd" size="small" style="width: 140px" @update:formatted-value="loadWorkload" />
              <span class="text-caption" style="color: var(--color-text-muted)">~</span>
              <n-date-picker v-model:formatted-value="endDate" type="date" value-format="yyyy-MM-dd" size="small" style="width: 140px" @update:formatted-value="loadWorkload" />
            </div>
          </template>
          <div v-if="workloadStats && workloadStats.data.length > 0">
            <div class="h-64 sm:h-80">
              <v-chart :option="workloadOption" autoresize />
            </div>
            <div class="mt-3 text-center text-sm-body" style="color: var(--color-text-secondary)">
              总投入:
              <span class="font-bold" style="color: var(--color-accent)">{{ workloadStats.total_hours }}h</span>
            </div>
          </div>
          <n-empty v-else description="暂无工时数据" />
        </n-card>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useStatsStore } from '@/stores/statsStore';
import { useIterationStore } from '@/stores/iterationStore';
import MainLayout from '@/layouts/MainLayout.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import VChart from 'vue-echarts';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import dayjs from 'dayjs';

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent]);

const statsStore = useStatsStore();
const iterationStore = useIterationStore();

const selectedIterationId = ref<string | null>(null);
const granularity = ref('month');
const startDate = ref(dayjs().subtract(6, 'month').format('YYYY-MM-DD'));
const endDate = ref(dayjs().format('YYYY-MM-DD'));

const iterationOptions = computed(() =>
  iterationStore.iterations.map(i => ({ label: i.name, value: i.id }))
);

const granularityOptions = [
  { label: '按周', value: 'week' },
  { label: '按月', value: 'month' },
  { label: '按季度', value: 'quarter' },
  { label: '按年', value: 'year' },
];

const burndownData = computed(() => statsStore.burndownData);
const workloadStats = computed(() => statsStore.workloadStats);

// Design token colors for charts
const accentColor = '#E07A4B';
const successColor = '#5B9A73';
const idealColor = '#B5AFA7';

const burndownOption = computed(() => {
  const data = burndownData.value;
  if (!data) return {};

  const dates = data.snapshots.map(s => s.snapshot_date);
  const remaining = data.snapshots.map(s => s.remaining_hours);
  const completed = data.snapshots.map(s => s.completed_hours);

  const option: Record<string, unknown> = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['剩余工时', '完成工时'], bottom: 0, textStyle: { color: '#6B645B' } },
    grid: { top: 10, right: 20, bottom: 40, left: 50 },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10, color: '#6B645B' }, axisLine: { lineStyle: { color: '#E8E4DF' } } },
    yAxis: { type: 'value', name: '工时(h)', nameTextStyle: { color: '#6B645B' }, axisLabel: { color: '#6B645B' }, splitLine: { lineStyle: { color: '#F0ECE8' } } },
    series: [
      { name: '剩余工时', type: 'line', data: remaining, smooth: true, itemStyle: { color: accentColor } },
      { name: '完成工时', type: 'line', data: completed, smooth: true, itemStyle: { color: successColor } },
    ],
  };

  if (data.ideal_line.length > 0) {
    const idealHours = data.ideal_line.map(p => Math.round(p.hours * 10) / 10);
    (option.legend as { data: string[] }).data.push('理想线');
    (option.series as unknown[]).push({
      name: '理想线', type: 'line', data: idealHours,
      lineStyle: { type: 'dashed', color: idealColor },
      itemStyle: { color: idealColor }, symbol: 'none',
    });
  }

  return option;
});

const workloadOption = computed(() => {
  const data = workloadStats.value;
  if (!data) return {};
  return {
    tooltip: { trigger: 'axis' },
    grid: { top: 10, right: 20, bottom: 30, left: 50 },
    xAxis: { type: 'category', data: data.data.map(d => d.period), axisLabel: { fontSize: 10, color: '#6B645B' }, axisLine: { lineStyle: { color: '#E8E4DF' } } },
    yAxis: { type: 'value', name: '工时(h)', nameTextStyle: { color: '#6B645B' }, axisLabel: { color: '#6B645B' }, splitLine: { lineStyle: { color: '#F0ECE8' } } },
    series: [{
      type: 'bar', data: data.data.map(d => d.hours),
      itemStyle: { color: accentColor, borderRadius: [6, 6, 0, 0] },
      barMaxWidth: 40,
    }],
  };
});


onMounted(async () => {
  await iterationStore.fetchIterations();
  const active = await iterationStore.fetchActive();
  if (active) {
    selectedIterationId.value = active.id;
  } else {
    const latest = await iterationStore.fetchLatest();
    selectedIterationId.value = latest?.id ?? null;
  }
  await loadWorkload();
});

watch(selectedIterationId, async (id) => {
  if (id) await statsStore.fetchBurndown(id);
});

async function loadWorkload() {
  if (startDate.value && endDate.value) {
    await statsStore.fetchWorkload(startDate.value, endDate.value, granularity.value);
  }
}
</script>
