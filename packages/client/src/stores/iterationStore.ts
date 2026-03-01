import { iterationApi } from '@/api';
import type { Iteration } from '@/types';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useIterationStore = defineStore('iteration', () => {
  const iterations = ref<Iteration[]>([]);
  const activeIteration = ref<Iteration | null>(null);
  const currentIteration = ref<Iteration | null>(null);
  const loading = ref(false);

  async function fetchIterations() {
    loading.value = true;
    try {
      const { data } = await iterationApi.list();
      iterations.value = data;
    } finally {
      loading.value = false;
    }
  }

  async function fetchActive() {
    const { data } = await iterationApi.active();
    activeIteration.value = data;
    return data;
  }

    async function fetchLatest() {
        const { data } = await iterationApi.latest();
        return data;
    }

  async function fetchById(id: string) {
    const { data } = await iterationApi.getById(id);
    currentIteration.value = data;
    return data;
  }

  async function createIteration(input: Partial<Iteration>) {
    const { data } = await iterationApi.create(input);
    await fetchIterations();
    return data;
  }

  async function updateIteration(id: string, input: Partial<Iteration>) {
    const { data } = await iterationApi.update(id, input);
    await fetchIterations();
    if (currentIteration.value?.id === id) {
      currentIteration.value = data;
    }
    return data;
  }

  async function changeStatus(id: string, status: string) {
    const { data } = await iterationApi.changeStatus(id, status);
    await fetchIterations();
    await fetchActive();
    if (currentIteration.value?.id === id) {
      currentIteration.value = data;
    }
    return data;
  }

  async function deleteIteration(id: string) {
    await iterationApi.delete(id);
    await fetchIterations();
  }

  return {
    iterations, activeIteration, currentIteration, loading,
      fetchIterations, fetchActive, fetchLatest, fetchById,
    createIteration, updateIteration, changeStatus, deleteIteration,
  };
});
