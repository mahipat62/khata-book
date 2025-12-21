<script setup>
defineProps({
  message: {
    type: String,
    default: 'Loading...'
  }
})
</script>

<template>
  <div class="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="text-center">
      <div class="relative w-16 h-16 mx-auto mb-4">
        <div class="absolute inset-0 border-4 border-primary-200 rounded-full"></div>
        <div class="absolute inset-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p class="text-gray-600 font-medium">{{ message }}</p>
    </div>
  </div>
</template>
