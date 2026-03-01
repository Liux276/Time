import { authApi } from '@/api';
import { createRouter, createWebHistory } from 'vue-router';

// Cache setup status to avoid repeated API calls
let setupStatusCache: boolean | null = null;

async function checkNeedsSetup(): Promise<boolean> {
  if (setupStatusCache !== null) return setupStatusCache;
  try {
    const { data } = await authApi.setupStatus();
    setupStatusCache = data.needsSetup;
    return data.needsSetup;
  } catch {
    return false;
  }
}

/** Call after first admin is created to clear the cache */
export function clearSetupCache(): void {
  setupStatusCache = null;
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/setup',
      name: 'setup',
      component: () => import('@/views/SetupView.vue'),
      meta: { public: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      redirect: '/iterations',
    },
    {
      path: '/iterations',
      name: 'iterations',
      component: () => import('@/views/IterationsView.vue'),
    },
    {
      path: '/iterations/all',
      name: 'iteration-list',
      component: () => import('@/views/IterationListView.vue'),
    },
    {
      path: '/iterations/:id',
      name: 'iteration-detail',
      component: () => import('@/views/IterationsView.vue'),
    },
    {
      path: '/requirements',
      name: 'requirements',
      component: () => import('@/views/RequirementsView.vue'),
    },
    {
      path: '/requirements/:id',
      name: 'task-detail',
      component: () => import('@/views/TaskDetailView.vue'),
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/admin/users',
      name: 'admin-users',
      component: () => import('@/views/AdminUsersView.vue'),
      meta: { admin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      redirect: '/',
    },
  ],
});

// Auth guard
router.beforeEach(async (to) => {
  const needsSetup = await checkNeedsSetup();

  // If system needs initial setup, redirect everywhere to /setup
  if (needsSetup && to.name !== 'setup') {
    return { name: 'setup' };
  }
  // If system is already set up, block /setup
  if (!needsSetup && to.name === 'setup') {
    return { name: 'login' };
  }

  const isPublic = to.meta.public === true;
  const token = localStorage.getItem('token');

  if (!isPublic && !token) {
    return { name: 'login' };
  }
  if (to.name === 'login' && token) {
    return { path: '/' };
  }

  // Admin route guard
  if (to.meta.admin === true && token) {
    try {
      const saved = localStorage.getItem('user');
      const user = saved ? JSON.parse(saved) : null;
      if (user?.role !== 'admin') {
        return { path: '/' };
      }
    } catch {
      return { path: '/' };
    }
  }
});

export default router;
