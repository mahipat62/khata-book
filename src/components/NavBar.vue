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
  { name: 'Analytics', path: '/analytics', icon: 'analytics' },
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
        <div class="flex items-center space-x-2 sm:space-x-3">
          <div class="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-800 to-purple-600 rounded-lg flex items-center justify-center overflow-hidden">
            <svg class="w-full h-full" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="navBgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#1e40af"/>
                  <stop offset="100%" style="stop-color:#7c3aed"/>
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="20" fill="url(#navBgGradient)"/>
              <path d="M25 20h20c16.569 0 30 13.431 30 30s-13.431 30-30 30H25V20z" stroke="#ffffff" stroke-width="4" fill="none"/>
              <path d="M30 25h15c13.807 0 25 11.193 25 25s-11.193 25-25 25H30V25z" fill="#ffffff" opacity="0.2"/>
              <path d="M38 35h20M38 45h20M48 35c4 0 7 3 7 7s-3 7-7 7H38l15 21" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="hidden sm:block">
            <span class="text-xl font-bold bg-gradient-to-r from-blue-800 to-purple-600 bg-clip-text text-transparent">Dhanvika</span>
            <span class="text-xs block text-gray-500">व्यवसाय प्रबंधन</span>
          </div>
          <span class="sm:hidden text-lg font-bold bg-gradient-to-r from-blue-800 to-purple-600 bg-clip-text text-transparent">Dhanvika</span>
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
    <div class="md:hidden border-t bg-white safe-bottom">
      <div class="flex justify-around py-1">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="[
            'flex flex-col items-center px-4 py-2 text-xs min-w-16 min-h-14',
            isActive(item.path)
              ? 'text-primary-600'
              : 'text-gray-500'
          ]"
        >
          <!-- Dashboard Icon -->
          <svg v-if="item.icon === 'chart'" class="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <!-- Folder Icon -->
          <svg v-else-if="item.icon === 'folder'" class="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <!-- Analytics Icon -->
          <svg v-else-if="item.icon === 'analytics'" class="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          <!-- Settings Icon -->
          <svg v-else-if="item.icon === 'cog'" class="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{{ item.name }}</span>
        </router-link>
      </div>
    </div>
  </nav>
</template>
