import { authApi } from '@/api';
import type { User } from '@/types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(loadUser());
  const token = ref<string | null>(localStorage.getItem('token'));

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');

  function loadUser(): User | null {
    const saved = localStorage.getItem('user');
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return null;
  }

  function setAuth(t: string, u: User) {
    token.value = t;
    user.value = u;
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  }

  async function login(username: string, password: string) {
    const { data } = await authApi.login(username, password);
    setAuth(data.token, data.user);
  }

  async function setup(username: string, password: string, displayName?: string) {
    const { data } = await authApi.setup(username, password, displayName);
    setAuth(data.token, data.user);
  }

  async function fetchMe() {
    try {
      const { data } = await authApi.me();
      user.value = data;
      localStorage.setItem('user', JSON.stringify(data));
    } catch {
      logout();
    }
  }

  function logout() {
    token.value = null;
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return { user, token, isLoggedIn, isAdmin, login, setup, fetchMe, logout };
});
