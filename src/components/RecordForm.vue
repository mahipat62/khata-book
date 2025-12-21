<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  initialData: {
    type: Object,
    default: () => ({})
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['submit', 'cancel'])

const formData = ref({})
const errors = ref({})

// Initialize form data
onMounted(() => {
  initFormData()
})

watch(() => props.initialData, () => {
  initFormData()
}, { deep: true })

function initFormData() {
  const data = {}
  props.columns.forEach(col => {
    if (props.initialData && props.initialData[col.name] !== undefined) {
      data[col.name] = props.initialData[col.name]
    } else {
      // Set defaults based on type
      switch (col.type) {
        case 'date':
          data[col.name] = new Date().toISOString().split('T')[0]
          break
        case 'number':
          data[col.name] = ''
          break
        case 'boolean':
          data[col.name] = 'No'
          break
        case 'select':
          data[col.name] = col.options?.[0] || ''
          break
        default:
          data[col.name] = ''
      }
    }
  })
  formData.value = data
  errors.value = {}
}

function validate() {
  errors.value = {}
  let isValid = true

  props.columns.forEach(col => {
    const value = formData.value[col.name]
    
    if (col.required && (value === '' || value === undefined || value === null)) {
      errors.value[col.name] = `${col.name} is required`
      isValid = false
    }
    
    if (col.type === 'number' && value !== '' && isNaN(parseFloat(value))) {
      errors.value[col.name] = `${col.name} must be a valid number`
      isValid = false
    }
  })

  return isValid
}

function handleSubmit() {
  if (validate()) {
    emit('submit', { ...formData.value })
  }
}

function handleCancel() {
  emit('cancel')
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-4">
    <div
      v-for="column in columns"
      :key="column.name"
      class="space-y-1"
    >
      <label :for="column.name" class="label">
        {{ column.name }}
        <span v-if="column.required" class="text-red-500">*</span>
      </label>

      <!-- Text Input -->
      <input
        v-if="column.type === 'text'"
        :id="column.name"
        v-model="formData[column.name]"
        type="text"
        :class="['input', errors[column.name] ? 'border-red-500 focus:ring-red-500' : '']"
        :placeholder="`Enter ${column.name.toLowerCase()}`"
      />

      <!-- Number Input -->
      <input
        v-else-if="column.type === 'number'"
        :id="column.name"
        v-model="formData[column.name]"
        type="number"
        step="0.01"
        :class="['input', errors[column.name] ? 'border-red-500 focus:ring-red-500' : '']"
        :placeholder="`Enter ${column.name.toLowerCase()}`"
      />

      <!-- Date Input -->
      <input
        v-else-if="column.type === 'date'"
        :id="column.name"
        v-model="formData[column.name]"
        type="date"
        :class="['input', errors[column.name] ? 'border-red-500 focus:ring-red-500' : '']"
      />

      <!-- Boolean (Yes/No) -->
      <div v-else-if="column.type === 'boolean'" class="flex items-center space-x-4">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            v-model="formData[column.name]"
            value="Yes"
            class="w-4 h-4 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm text-gray-700">Yes</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            v-model="formData[column.name]"
            value="No"
            class="w-4 h-4 text-primary-600 focus:ring-primary-500"
          />
          <span class="text-sm text-gray-700">No</span>
        </label>
      </div>

      <!-- Select -->
      <select
        v-else-if="column.type === 'select'"
        :id="column.name"
        v-model="formData[column.name]"
        :class="['input', errors[column.name] ? 'border-red-500 focus:ring-red-500' : '']"
      >
        <option v-for="option in column.options" :key="option" :value="option">
          {{ option }}
        </option>
      </select>

      <!-- Error Message -->
      <p v-if="errors[column.name]" class="text-sm text-red-500">
        {{ errors[column.name] }}
      </p>
    </div>

    <!-- Form Actions -->
    <div class="flex items-center justify-end space-x-3 pt-4 border-t">
      <button
        type="button"
        @click="handleCancel"
        class="btn-secondary"
        :disabled="loading"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="btn-primary"
        :disabled="loading"
      >
        <span v-if="loading" class="flex items-center space-x-2">
          <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <span>Saving...</span>
        </span>
        <span v-else>{{ isEdit ? 'Update' : 'Add Record' }}</span>
      </button>
    </div>
  </form>
</template>
