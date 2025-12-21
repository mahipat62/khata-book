<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const columns = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const columnTypes = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'select', label: 'Dropdown' }
]

const newColumn = ref({
  name: '',
  type: 'text',
  required: false,
  options: ''
})

const editingIndex = ref(-1)
const showAddForm = ref(false)

function addColumn() {
  if (!newColumn.value.name.trim()) return

  const column = {
    name: newColumn.value.name.trim(),
    type: newColumn.value.type,
    required: newColumn.value.required
  }

  // Add options for select type
  if (newColumn.value.type === 'select' && newColumn.value.options) {
    column.options = newColumn.value.options.split(',').map(o => o.trim()).filter(o => o)
  }

  if (editingIndex.value >= 0) {
    // Update existing
    const updated = [...columns.value]
    updated[editingIndex.value] = column
    columns.value = updated
    editingIndex.value = -1
  } else {
    // Add new
    columns.value = [...columns.value, column]
  }

  resetForm()
}

function editColumn(index) {
  const col = columns.value[index]
  newColumn.value = {
    name: col.name,
    type: col.type,
    required: col.required || false,
    options: col.options?.join(', ') || ''
  }
  editingIndex.value = index
  showAddForm.value = true
}

function removeColumn(index) {
  columns.value = columns.value.filter((_, i) => i !== index)
}

function moveColumn(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= columns.value.length) return
  
  const updated = [...columns.value]
  const temp = updated[index]
  updated[index] = updated[newIndex]
  updated[newIndex] = temp
  columns.value = updated
}

function resetForm() {
  newColumn.value = {
    name: '',
    type: 'text',
    required: false,
    options: ''
  }
  showAddForm.value = false
  editingIndex.value = -1
}

function getTypeLabel(type) {
  return columnTypes.find(t => t.value === type)?.label || type
}
</script>

<template>
  <div class="space-y-4">
    <!-- Column List -->
    <div v-if="columns.length > 0" class="space-y-2">
      <div
        v-for="(col, index) in columns"
        :key="index"
        class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
      >
        <div class="flex items-center space-x-3">
          <div class="flex flex-col space-y-1">
            <button
              @click="moveColumn(index, -1)"
              :disabled="index === 0"
              class="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              @click="moveColumn(index, 1)"
              :disabled="index === columns.length - 1"
              class="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
            >
              <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div>
            <p class="font-medium text-gray-800">
              {{ col.name }}
              <span v-if="col.required" class="text-red-500 text-xs">*</span>
            </p>
            <p class="text-xs text-gray-500">
              {{ getTypeLabel(col.type) }}
              <span v-if="col.options?.length">({{ col.options.join(', ') }})</span>
            </p>
          </div>
        </div>
        <div class="flex items-center space-x-1">
          <button
            @click="editColumn(index)"
            class="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            @click="removeColumn(index)"
            class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
      <p>No columns defined yet</p>
      <p class="text-sm">Add columns to structure your Khata</p>
    </div>

    <!-- Add/Edit Form -->
    <div v-if="showAddForm" class="border rounded-lg p-4 bg-blue-50">
      <h4 class="font-medium text-gray-800 mb-3">
        {{ editingIndex >= 0 ? 'Edit Column' : 'Add New Column' }}
      </h4>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">Column Name</label>
          <input
            v-model="newColumn.name"
            type="text"
            class="input"
            placeholder="e.g., Amount, Date"
          />
        </div>
        <div>
          <label class="label">Type</label>
          <select v-model="newColumn.type" class="input">
            <option v-for="type in columnTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="newColumn.type === 'select'" class="mt-3">
        <label class="label">Options (comma separated)</label>
        <input
          v-model="newColumn.options"
          type="text"
          class="input"
          placeholder="e.g., Credit, Debit"
        />
      </div>

      <div class="mt-3">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="newColumn.required"
            class="w-4 h-4 text-primary-600 rounded"
          />
          <span class="text-sm text-gray-700">Required field</span>
        </label>
      </div>

      <div class="flex justify-end space-x-2 mt-4">
        <button @click="resetForm" class="btn-secondary text-sm py-1.5">
          Cancel
        </button>
        <button
          @click="addColumn"
          :disabled="!newColumn.name.trim()"
          class="btn-primary text-sm py-1.5"
        >
          {{ editingIndex >= 0 ? 'Update' : 'Add' }}
        </button>
      </div>
    </div>

    <!-- Add Button -->
    <button
      v-if="!showAddForm"
      @click="showAddForm = true"
      class="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-500 hover:text-primary-600 transition-colors"
    >
      + Add Column
    </button>
  </div>
</template>
