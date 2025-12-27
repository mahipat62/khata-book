<script setup>
import { onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useBackupStore } from '@/stores/backup'
import { useSheetsStore } from '@/stores/sheets'
import { useToastStore } from '@/stores/toast'
import NavBar from '@/components/NavBar.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'

const authStore = useAuthStore()
const backupStore = useBackupStore()
const sheetsStore = useSheetsStore()
const toastStore = useToastStore()
const isInitializing = ref(true)

onMounted(async () => {
  try {
    await authStore.initGoogleApi()
    
    // After auth is ready, check for auto backup (only if authenticated)
    if (authStore.isAuthenticated) {
      await performAutoBackupCheck()
    }
  } catch (error) {
    console.error('Failed to initialize Google API:', error)
  } finally {
    isInitializing.value = false
  }
})

// Check and perform auto backup if configured and due
async function performAutoBackupCheck() {
  try {
    const data = {
      sheets: sheetsStore.sheets,
      currentSheet: sheetsStore.currentSheet,
      user: authStore.user
    }
    
    const result = await backupStore.performAutoBackupIfNeeded(data)
    
    if (result.performed && result.success) {
      toastStore.success('Auto backup completed successfully! ☁️')
    } else if (result.performed && !result.success) {
      console.warn('Auto backup failed:', result.error)
      // Don't show error toast to avoid annoying user on every visit
    }
  } catch (error) {
    console.error('Auto backup check failed:', error)
  }
}
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
