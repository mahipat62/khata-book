<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSheetsStore } from '@/stores/sheets'
import { useToastStore } from '@/stores/toast'
import { APP_CONFIG, GOOGLE_CONFIG } from '@/config/google'

const authStore = useAuthStore()
const sheetsStore = useSheetsStore()
const toastStore = useToastStore()

const showApiInfo = ref(false)

async function handleReAuth() {
  try {
    authStore.signIn()
    toastStore.info('Re-authenticating...')
  } catch (error) {
    toastStore.error('Failed to re-authenticate')
  }
}

async function clearCache() {
  try {
    sessionStorage.clear()
    sheetsStore.clearState()
    toastStore.success('Cache cleared successfully')
  } catch (error) {
    toastStore.error('Failed to clear cache')
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-gray-800 mb-8">Settings</h1>

    <!-- Account Section -->
    <div class="card mb-6">
      <h2 class="card-header">Account</h2>
      
      <div class="flex items-center space-x-4 mb-6">
        <img
          v-if="authStore.user?.picture"
          :src="authStore.user.picture"
          :alt="authStore.user.name"
          class="w-16 h-16 rounded-full"
        />
        <div v-else class="w-16 h-16 bg-primary-200 rounded-full flex items-center justify-center">
          <span class="text-2xl text-primary-700 font-bold">{{ authStore.user?.name?.[0] || 'U' }}</span>
        </div>
        <div>
          <p class="text-lg font-semibold text-gray-800">{{ authStore.user?.name }}</p>
          <p class="text-gray-500">{{ authStore.user?.email }}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <button @click="handleReAuth" class="btn-secondary">
          Re-authenticate
        </button>
        <button @click="clearCache" class="btn-secondary">
          Clear Cache
        </button>
      </div>
    </div>

    <!-- App Info Section -->
    <div class="card mb-6">
      <h2 class="card-header">About</h2>
      
      <div class="space-y-3">
        <div class="flex justify-between py-2 border-b">
          <span class="text-gray-600">App Name</span>
          <span class="font-medium text-gray-800">{{ APP_CONFIG.APP_NAME }}</span>
        </div>
        <div class="flex justify-between py-2 border-b">
          <span class="text-gray-600">Version</span>
          <span class="font-medium text-gray-800">{{ APP_CONFIG.VERSION }}</span>
        </div>
        <div class="flex justify-between py-2 border-b">
          <span class="text-gray-600">Currency</span>
          <span class="font-medium text-gray-800">{{ APP_CONFIG.CURRENCY }} (INR)</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-gray-600">Data Storage</span>
          <span class="font-medium text-gray-800">Google Sheets</span>
        </div>
      </div>
    </div>

    <!-- API Configuration Section -->
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="card-header mb-0">API Configuration</h2>
        <button
          @click="showApiInfo = !showApiInfo"
          class="text-sm text-primary-600 hover:text-primary-700"
        >
          {{ showApiInfo ? 'Hide' : 'Show' }} Details
        </button>
      </div>

      <div v-if="showApiInfo" class="space-y-4">
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm text-gray-600 mb-2">Client ID (truncated):</p>
          <code class="text-xs bg-gray-200 px-2 py-1 rounded">
            {{ GOOGLE_CONFIG.CLIENT_ID.substring(0, 30) }}...
          </code>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm text-gray-600 mb-2">OAuth Scopes:</p>
          <ul class="text-xs space-y-1">
            <li v-for="scope in GOOGLE_CONFIG.SCOPES.split(' ')" :key="scope" class="text-gray-700">
              • {{ scope.split('/').pop() }}
            </li>
          </ul>
        </div>
      </div>

      <div v-else class="text-sm text-gray-500">
        Click "Show Details" to view API configuration.
      </div>
    </div>

    <!-- Help Section -->
    <div class="card">
      <h2 class="card-header">Help & Resources</h2>
      
      <div class="space-y-3">
        <a
          href="https://github.com"
          target="_blank"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span class="text-gray-700">View on GitHub</span>
          </div>
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <a
          href="https://console.cloud.google.com"
          target="_blank"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            </svg>
            <span class="text-gray-700">Google Cloud Console</span>
          </div>
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <a
          href="https://docs.google.com/spreadsheets"
          target="_blank"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
              <path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/>
            </svg>
            <span class="text-gray-700">Google Sheets</span>
          </div>
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>
