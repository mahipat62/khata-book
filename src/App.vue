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
      
      <main :class="{ 'pt-16': authStore.isAuthenticated }">
        <RouterView />
      </main>
      
      <ToastContainer />
    </template>
  </div>
</template>
