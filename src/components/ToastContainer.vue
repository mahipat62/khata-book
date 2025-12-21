<script setup>
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

function getToastClass(type) {
  switch (type) {
    case 'success': return 'bg-green-500'
    case 'error': return 'bg-red-500'
    case 'warning': return 'bg-yellow-500'
    default: return 'bg-blue-500'
  }
}

function getToastIcon(type) {
  switch (type) {
    case 'success': return '✓'
    case 'error': return '✕'
    case 'warning': return '⚠'
    default: return 'ℹ'
  }
}
</script>

<template>
  <div class="fixed top-20 right-4 z-50 space-y-2">
    <TransitionGroup name="toast">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        :class="[
          'flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg text-white min-w-[280px] max-w-md',
          getToastClass(toast.type)
        ]"
      >
        <span class="text-lg">{{ getToastIcon(toast.type) }}</span>
        <p class="flex-1 text-sm">{{ toast.message }}</p>
        <button
          @click="toastStore.removeToast(toast.id)"
          class="text-white/80 hover:text-white"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active {
  animation: slideIn 0.3s ease-out;
}

.toast-leave-active {
  animation: slideOut 0.3s ease-in;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
