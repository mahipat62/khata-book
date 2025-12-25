<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Modal'
  },
  size: {
    type: String,
    default: 'md',
    validator: (val) => ['sm', 'md', 'lg', 'xl'].includes(val)
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

function close() {
  isVisible.value = false
  emit('close')
}

const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'max-w-sm'
    case 'lg': return 'max-w-2xl'
    case 'xl': return 'max-w-4xl'
    default: return 'max-w-lg'
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isVisible"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="close"
        ></div>

        <!-- Modal Content -->
        <div
          :class="[
            'modal-content relative bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full transform transition-all max-h-[90vh] sm:max-h-[85vh] overflow-hidden',
            sizeClass
          ]"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-4 border-b sticky top-0 bg-white z-10">
            <h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3>
            <button
              @click="close"
              class="p-2 hover:bg-gray-100 rounded-lg transition-colors -mr-2"
            >
              <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="px-4 sm:px-6 py-4 overflow-y-auto scroll-smooth" style="max-height: calc(90vh - 130px);">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-4 sm:px-6 py-4 border-t bg-gray-50 rounded-b-xl safe-bottom">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
