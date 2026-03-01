<template>
  <MainLayout>
    <div>
      <PageHeader title="全部迭代" showBack>
        <template #actions>
          <n-button type="primary" size="small" @click="showForm = true">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            新建迭代
          </n-button>
        </template>
      </PageHeader>

      <!-- Card grid -->
      <div v-if="iterationStore.iterations.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="iter in iterationStore.iterations"
          :key="iter.id"
          class="card-glass p-5 cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
          @click="router.push(`/iterations/${iter.id}`)"
        >
          <!-- Header: name + status -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <h3 class="text-base font-semibold truncate" style="color: var(--color-text-primary)">{{ iter.name }}</h3>
            <n-tag :type="ITERATION_STATUS_NAIVE_TYPE[iter.status]" size="small" :bordered="false" round class="flex-shrink-0">
              {{ ITERATION_STATUS_CONFIG[iter.status].label }}
            </n-tag>
          </div>

          <!-- Date range -->
          <div class="text-caption mb-4" style="color: var(--color-text-tertiary)">
            {{ iter.planned_start || '-' }} ~ {{ iter.planned_end || '-' }}
          </div>

          <!-- Stats row -->
          <div class="grid grid-cols-3 gap-2 text-center pt-3" style="border-top: 1px solid var(--color-border)">
            <div>
              <div class="text-sm-body font-bold" style="color: var(--color-accent)">{{ iter.task_count }}</div>
              <div class="text-caption" style="color: var(--color-text-tertiary)">任务</div>
            </div>
            <div>
              <div class="text-sm-body font-bold" style="color: var(--color-info)">{{ iter.estimated_hours }}h</div>
              <div class="text-caption" style="color: var(--color-text-tertiary)">预估</div>
            </div>
            <div>
              <div class="text-sm-body font-bold" style="color: var(--color-success)">{{ iter.completed_hours }}h</div>
              <div class="text-caption" style="color: var(--color-text-tertiary)">完成</div>
            </div>
          </div>

          <!-- Summary preview -->
          <p v-if="iter.summary" class="text-caption mt-3 line-clamp-2" style="color: var(--color-text-secondary)">
            {{ iter.summary }}
          </p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="card-glass p-12 text-center card-no-hover">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4" style="background: var(--color-accent-light)">
          <AppIcon name="iteration" :size="28" color="var(--color-accent)" />
        </div>
        <p class="text-sm-body mb-4" style="color: var(--color-text-secondary)">暂无迭代</p>
        <n-button type="primary" size="small" @click="showForm = true">创建第一个迭代</n-button>
      </div>

      <!-- Create form modal -->
      <n-modal v-model:show="showForm" preset="card" title="新建迭代" :style="{ width: '500px' }" :mask-closable="false">
        <n-form ref="formRef" :model="form" :rules="formRules" label-placement="top">
          <n-form-item label="迭代名称" path="name">
            <n-input v-model:value="form.name" placeholder="请输入迭代名称" />
          </n-form-item>
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="开始时间" path="planned_start">
                <n-date-picker v-model:formatted-value="form.planned_start" type="date" value-format="yyyy-MM-dd" class="w-full" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="结束时间" path="planned_end">
                <n-date-picker v-model:formatted-value="form.planned_end" type="date" value-format="yyyy-MM-dd" class="w-full" />
              </n-form-item>
            </n-gi>
          </n-grid>
          <n-form-item label="迭代总结" path="summary">
            <n-input v-model:value="form.summary" type="textarea" :rows="3" placeholder="可选" />
          </n-form-item>
        </n-form>
        <template #action>
          <div class="flex justify-end gap-2">
            <n-button @click="showForm = false">取消</n-button>
            <n-button type="primary" :loading="submitting" @click="createIteration">创建</n-button>
          </div>
        </template>
      </n-modal>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, type FormInst, type FormRules } from 'naive-ui';
import { AddOutline } from '@vicons/ionicons5';
import { useIterationStore } from '@/stores/iterationStore';
import { ITERATION_STATUS_CONFIG, ITERATION_STATUS_NAIVE_TYPE } from '@/types';
import MainLayout from '@/layouts/MainLayout.vue';
import PageHeader from '@/components/common/PageHeader.vue';
import AppIcon from '@/components/common/AppIcon.vue';

const router = useRouter();
const message = useMessage();
const iterationStore = useIterationStore();

const showForm = ref(false);
const submitting = ref(false);
const formRef = ref<FormInst | null>(null);

const form = reactive({
  name: '',
  planned_start: null as string | null,
  planned_end: null as string | null,
  summary: '',
});

const formRules: FormRules = {
  name: [{ required: true, message: '请输入迭代名称', trigger: 'blur' }],
  planned_start: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  planned_end: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
};

onMounted(() => {
  iterationStore.fetchIterations();
});

async function createIteration() {
  try { await formRef.value?.validate(); } catch { return; }
  submitting.value = true;
  try {
    await iterationStore.createIteration({
      name: form.name,
      planned_start: form.planned_start!,
      planned_end: form.planned_end!,
      summary: form.summary,
    });
    message.success('迭代创建成功');
    showForm.value = false;
    form.name = '';
    form.planned_start = null;
    form.planned_end = null;
    form.summary = '';
  } catch (e: any) {
    message.error(e.response?.data?.error || '创建失败');
  } finally {
    submitting.value = false;
  }
}
</script>
