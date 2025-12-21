<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSheetsStore } from '@/stores/sheets'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const sheetsStore = useSheetsStore()

const user = computed(() => authStore.user)
const syncStatus = computed(() => sheetsStore.syncStatus)

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: 'chart' },
  { name: 'My Sheets', path: '/sheets', icon: 'folder' },
  { name: 'Settings', path: '/settings', icon: 'cog' }
]

function isActive(path) {
  return route.path === path || route.path.startsWith(path + '/')
}

function handleSignOut() {
  authStore.signOut()
  sheetsStore.clearState()
  router.push('/login')
}

const syncStatusClass = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return 'bg-yellow-500'
    case 'synced': return 'bg-green-500'
    case 'error': return 'bg-red-500'
    default: return 'bg-gray-400'
  }
})

const syncStatusText = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return 'Syncing...'
    case 'synced': return 'Synced'
    case 'error': return 'Sync Error'
    default: return 'Ready'
  }
})
</script>

<template>
  <nav class="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span class="text-xl font-bold text-gray-800">Khata Book</span>
        </div>

        <!-- Navigation Links -->
        <div class="hidden md:flex items-center space-x-1">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            :class="[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive(item.path)
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            ]"
          >
            {{ item.name }}
          </router-link>
        </div>

        <!-- Right side -->
        <div class="flex items-center space-x-4">
          <!-- Sync Status -->
          <div class="flex items-center space-x-2 text-sm">
            <span :class="['w-2 h-2 rounded-full', syncStatusClass]"></span>
            <span class="text-gray-600 hidden sm:inline">{{ syncStatusText }}</span>
          </div>

          <!-- User Menu -->
          <div class="relative group">
            <button class="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
              <img
                v-if="user?.picture"
                :src="user.picture"
                :alt="user.name"
                class="w-8 h-8 rounded-full"
              />
              <div v-else class="w-8 h-8 bg-primary-200 rounded-full flex items-center justify-center">
                <span class="text-primary-700 font-medium">{{ user?.name?.[0] || 'U' }}</span>
              </div>
              <span class="hidden sm:inline text-sm text-gray-700">{{ user?.name || 'User' }}</span>
              <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown -->
            <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <div class="px-4 py-2 border-b">
                <p class="text-sm font-medium text-gray-900">{{ user?.name }}</p>
                <p class="text-xs text-gray-500">{{ user?.email }}</p>
              </div>
              <button
                @click="handleSignOut"
                class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Navigation -->
    <div class="md:hidden border-t">
      <div class="flex justify-around py-2">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex flex-col items-center px-3 py-1 text-xs',
            isActive(item.path)
              ? 'text-primary-600'
              : 'text-gray-500'
          ]"
        >
          {{ item.name }}
        </router-link>
      </div>
    </div>
  </nav>
</template>
