<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { APP_CONFIG } from '@/config/google'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)

async function handleSignIn() {
  isLoading.value = true
  try {
    authStore.signIn()
    // Watch for authentication state change
    const checkAuth = setInterval(() => {
      if (authStore.isAuthenticated) {
        clearInterval(checkAuth)
        router.push('/dashboard')
      }
      if (!authStore.isLoading && authStore.error) {
        clearInterval(checkAuth)
        isLoading.value = false
      }
    }, 500)
  } catch (error) {
    console.error('Sign in error:', error)
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-800 p-4">
    <div class="w-full max-w-md">
      <!-- Logo Card -->
      <div class="bg-white rounded-2xl shadow-2xl p-8 text-center">
        <!-- Logo -->
        <div class="w-20 h-20 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>

        <!-- Title -->
        <h1 class="text-3xl font-bold text-gray-800 mb-2">{{ APP_CONFIG.APP_NAME }}</h1>
        <p class="text-gray-500 mb-8">Manage your personal & business accounts with ease</p>

        <!-- Features List -->
        <div class="text-left space-y-3 mb-8">
          <div class="flex items-center space-x-3 text-gray-600">
            <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-sm">Track credits & debits easily</span>
          </div>
          <div class="flex items-center space-x-3 text-gray-600">
            <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-sm">Sync with Google Sheets</span>
          </div>
          <div class="flex items-center space-x-3 text-gray-600">
            <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-sm">Filter, sort & analyze data</span>
          </div>
          <div class="flex items-center space-x-3 text-gray-600">
            <svg class="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-sm">Share with partners</span>
          </div>
        </div>

        <!-- Sign In Button -->
        <button
          @click="handleSignIn"
          :disabled="isLoading || !authStore.isReady"
          class="w-full flex items-center justify-center space-x-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-xl px-6 py-3 font-medium text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="isLoading" class="w-5 h-5 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <template v-else>
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Sign in with Google</span>
          </template>
        </button>

        <!-- Error Message -->
        <p v-if="authStore.error" class="mt-4 text-sm text-red-600">
          {{ authStore.error }}
        </p>

        <!-- Loading State -->
        <p v-if="!authStore.isReady" class="mt-4 text-sm text-gray-500">
          Loading Google API...
        </p>
      </div>

      <!-- Footer -->
      <p class="text-center text-white/70 text-sm mt-6">
        Your data is stored securely in your own Google Drive
      </p>
    </div>
  </div>
</template>
