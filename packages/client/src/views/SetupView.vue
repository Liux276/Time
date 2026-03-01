<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-gradient-radial" style="background-color: var(--color-bg-base)">
    <div class="card-glass w-full max-w-md p-8 sm:p-10 animate-float-up card-no-hover">
      <!-- Logo & Title -->
      <div class="text-center mb-8">
        <div
          class="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4"
          style="background: var(--color-accent-light)"
        >
          <AppIcon name="clipboard" :size="28" color="var(--color-accent)" />
        </div>
        <h1 class="text-h2" style="color: var(--color-text-primary)">系统初始化</h1>
        <p class="text-caption mt-2">创建第一个管理员账户以开始使用</p>
      </div>

      <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="form.username" placeholder="请输入用户名" @keyup.enter="handleSubmit" />
        </n-form-item>

        <n-form-item label="显示名称" path="displayName">
          <n-input v-model:value="form.displayName" placeholder="可选，用于展示" @keyup.enter="handleSubmit" />
        </n-form-item>

        <n-form-item label="密码" path="password">
          <n-input v-model:value="form.password" type="password" show-password-on="click" placeholder="请输入密码" @keyup.enter="handleSubmit" />
        </n-form-item>

        <n-form-item label="确认密码" path="confirmPassword">
          <n-input v-model:value="form.confirmPassword" type="password" show-password-on="click" placeholder="再次输入密码" @keyup.enter="handleSubmit" />
        </n-form-item>
      </n-form>

      <n-button
        type="primary"
        block
        :loading="loading"
        @click="handleSubmit"
        style="height: 44px; font-size: 15px; font-weight: 600"
      >
        创建管理员并开始使用
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useMessage, type FormInst, type FormRules } from 'naive-ui';
import { useAuthStore } from '@/stores/authStore';
import { clearSetupCache } from '@/router';
import AppIcon from '@/components/common/AppIcon.vue';

const router = useRouter();
const message = useMessage();
const authStore = useAuthStore();

const loading = ref(false);
const formRef = ref<FormInst | null>(null);

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  displayName: '',
});

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 32, message: '用户名长度 2-32 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 128, message: '密码长度 6-128 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator(_rule: unknown, value: string) {
        return value === form.password || new Error('两次密码不一致');
      },
      trigger: 'blur',
    },
  ],
};

async function handleSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  loading.value = true;
  try {
    await authStore.setup(form.username, form.password, form.displayName || undefined);
    clearSetupCache();
    message.success('管理员账户创建成功');
    router.push('/');
  } catch (e: any) {
    message.error(e.response?.data?.error || '初始化失败');
  } finally {
    loading.value = false;
  }
}
</script>
