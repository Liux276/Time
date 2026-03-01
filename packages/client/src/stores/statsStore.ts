import { statsApi } from '@/api';
import type { BurndownData, WorkloadStats } from '@/types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useStatsStore = defineStore('stats', () => {
  const burndownData = ref<BurndownData | null>(null);
  const workloadStats = ref<WorkloadStats | null>(null);
  const loading = ref(false);

  async function fetchBurndown(iterationId: string) {
    loading.value = true;
    try {
      const { data } = await statsApi.burndown(iterationId);
      burndownData.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchWorkload(startDate: string, endDate: string, granularity: string = 'month') {
    loading.value = true;
    try {
      const { data } = await statsApi.workload(startDate, endDate, granularity);
      workloadStats.value = data;
    } finally {
      loading.value = false;
    }
  }

  return {
    burndownData, workloadStats, loading,
    fetchBurndown, fetchWorkload,
  };
});
