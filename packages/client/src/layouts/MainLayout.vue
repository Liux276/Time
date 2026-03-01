<template>
  <div class="min-h-screen" style="background: var(--color-bg-base)">
    <!-- Desktop / Tablet Header -->
    <header class="nav-glass sticky top-0 z-40 h-14">
      <div class="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6">
        <!-- Logo -->
        <div class="flex items-center gap-3 flex-shrink-0">
          <div class="flex items-center justify-center w-8 h-8 rounded-md" style="background: var(--color-accent-light)">
            <AppIcon name="clipboard" :size="18" color="var(--color-accent)" />
          </div>
          <span class="text-sm-body font-semibold hidden sm:inline" style="color: var(--color-text-primary)">任务管理</span>
        </div>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center gap-1 flex-1 justify-center">
          <button
            v-for="item in navItems"
            :key="item.key"
            class="relative flex items-center gap-2 px-4 h-10 rounded-md text-sm-body font-medium transition-all duration-200"
            :class="activeKey === item.key
              ? 'text-accent'
              : 'text-txt-secondary hover:text-txt-primary hover:bg-surface'"
            @click="router.push(item.path)"
          >
            <AppIcon :name="item.icon" :size="18" />
            <span>{{ item.label }}</span>
            <span
              v-if="activeKey === item.key"
              class="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
              style="background: var(--color-accent)"
            />
          </button>
        </nav>

        <!-- Right Actions -->
        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            class="hidden md:flex items-center justify-center w-10 h-10 rounded-md hover:bg-surface transition-colors"
            title="设置"
            @click="router.push('/settings')"
          >
            <AppIcon name="settings" :size="18" color="var(--color-text-secondary)" />
          </button>
          <n-dropdown :options="userMenuOptions" @select="onUserMenuSelect">
            <button class="flex items-center gap-2 h-10 px-2 rounded-md hover:bg-surface transition-colors">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style="background: var(--color-accent-light); color: var(--color-accent)"
              >
                {{ userInitial }}
              </div>
              <span class="hidden sm:inline text-sm-body font-medium" style="color: var(--color-text-primary)">
                {{ displayName }}
              </span>
            </button>
          </n-dropdown>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="px-4 sm:px-6 pt-6 pb-6" :class="{ 'pb-20 md:pb-6': true }">
      <div class="max-w-7xl mx-auto">
        <transition name="page-fade" mode="out-in">
          <slot />
        </transition>
      </div>
    </main>

    <!-- Mobile Bottom Tab Bar -->
    <div class="mobile-tab-bar md:hidden">
      <button
        v-for="item in mobileNavItems"
        :key="item.key"
        class="tab-item"
        :class="{ active: activeKey === item.key }"
        @click="router.push(item.path)"
      >
        <AppIcon :name="item.icon" :size="22" />
        <span>{{ item.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NIcon } from 'naive-ui';
import { LogOutOutline } from '@vicons/ionicons5';
import { useAuthStore } from '@/stores/authStore';
import AppIcon from '@/components/common/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const activeKey = computed(() => {
  if (route.path.startsWith('/iterations')) return 'iterations';
  if (route.path.startsWith('/requirements')) return 'requirements';
  if (route.path.startsWith('/dashboard')) return 'dashboard';
  if (route.path.startsWith('/admin')) return 'admin';
  if (route.path.startsWith('/settings')) return 'settings';
  return '';
});

const displayName = computed(() =>
  authStore.user?.display_name || authStore.user?.username || ''
);

const userInitial = computed(() => {
  const name = displayName.value;
  return name ? name.charAt(0).toUpperCase() : 'U';
});

const baseNavItems = [
  { label: '迭代', key: 'iterations', path: '/iterations', icon: 'iteration' },
  { label: '需求', key: 'requirements', path: '/requirements', icon: 'task' },
  { label: '看板', key: 'dashboard', path: '/dashboard', icon: 'dashboard' },
];

const navItems = computed(() => {
  const items = [...baseNavItems];
  if (authStore.isAdmin) {
    items.push({ label: '管理', key: 'admin', path: '/admin/users', icon: 'users' });
  }
  return items;
});

const mobileNavItems = computed(() => [
  ...navItems.value,
  { label: '设置', key: 'settings', path: '/settings', icon: 'settings' },
]);

const userMenuOptions = [
  { label: '退出登录', key: 'logout', icon: () => h(NIcon, null, { default: () => h(LogOutOutline) }) },
];

function onUserMenuSelect(key: string) {
  if (key === 'logout') {
    authStore.logout();
    router.push('/login');
  }
}
</script>
