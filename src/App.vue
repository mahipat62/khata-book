<script setup>
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NavBar from '@/components/NavBar.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'

const authStore = useAuthStore()
const isInitializing = ref(true)

onMounted(async () => {
  try {
    await authStore.initGoogleApi()
  } catch (error) {
    console.error('Failed to initialize Google API:', error)
  } finally {
    isInitializing.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <LoadingOverlay v-if="isInitializing" message="Initializing..." />
    
    <template v-else>
      <NavBar v-if="authStore.isAuthenticated" />
      
      <!-- pt-16 for header, pb-20 for mobile bottom nav on small screens -->
      <main :class="authStore.isAuthenticated ? 'pt-16 pb-20 md:pb-4' : ''">
        <RouterView />
      </main>
      
      <ToastContainer />
    </template>
  </div>
</template>
