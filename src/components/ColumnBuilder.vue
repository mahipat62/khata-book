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
  
  columns.value = [...columns.value, column]
  
  // Reset form
  newColumn.value = {
    name: '',
    type: 'text',
    required: false,
    options: ''
  }
}

function removeColumn(index) {
  const updated = [...columns.value]
  updated.splice(index, 1)
  columns.value = updated
}

function moveColumn(index, direction) {
  const updated = [...columns.value]
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= updated.length) return
  
  [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]]
  columns.value = updated
}

function getTypeLabel(type) {
  return columnTypes.find(t => t.value === type)?.label || type
}
</script>

<template>
  <div class="space-y-4">
    <!-- Existing Columns -->
    <div v-if="columns.length > 0" class="space-y-2">
      <p class="text-sm font-medium text-gray-700">Columns ({{ columns.length }})</p>
      
      <div class="space-y-2 max-h-48 overflow-y-auto">
        <div
          v-for="(col, index) in columns"
          :key="index"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
        >
          <div class="flex items-center space-x-3">
            <span class="text-sm font-medium text-gray-800">{{ col.name }}</span>
            <span class="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
              {{ getTypeLabel(col.type) }}
            </span>
            <span v-if="col.required" class="text-xs text-red-500">Required</span>
            <span v-if="col.options" class="text-xs text-gray-500">
              ({{ col.options.join(', ') }})
            </span>
          </div>
          
          <div class="flex items-center space-x-1">
            <button
              @click="moveColumn(index, -1)"
              :disabled="index === 0"
              class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Move Up"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              @click="moveColumn(index, 1)"
              :disabled="index === columns.length - 1"
              class="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
              title="Move Down"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              @click="removeColumn(index)"
              class="p-1 text-red-400 hover:text-red-600"
              title="Remove"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add New Column Form -->
    <div class="border border-dashed border-gray-300 rounded-lg p-4">
      <p class="text-sm font-medium text-gray-700 mb-3">Add New Column</p>
      
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="label">Column Name</label>
          <input
            v-model="newColumn.name"
            type="text"
            class="input"
            placeholder="e.g., Customer Name"
            @keyup.enter="addColumn"
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
      
      <!-- Options for Select type -->
      <div v-if="newColumn.type === 'select'" class="mt-3">
        <label class="label">Options (comma separated)</label>
        <input
          v-model="newColumn.options"
          type="text"
          class="input"
          placeholder="e.g., Option 1, Option 2, Option 3"
        />
      </div>
      
      <div class="flex items-center justify-between mt-3">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            v-model="newColumn.required"
            class="w-4 h-4 text-primary-600 rounded"
          />
          <span class="text-sm text-gray-600">Required field</span>
        </label>
        
        <button
          @click="addColumn"
          :disabled="!newColumn.name.trim()"
          class="btn-primary text-sm py-1.5 px-3"
        >
          + Add Column
        </button>
      </div>
    </div>

    <!-- Quick Add Templates -->
    <div class="flex flex-wrap gap-2">
      <button
        @click="columns = [
          { name: 'Date', type: 'date', required: true },
          { name: 'Person Name', type: 'text', required: true },
          { name: 'Description', type: 'text', required: false },
          { name: 'Amount', type: 'number', required: true },
          { name: 'Type', type: 'select', options: ['Credit', 'Debit'], required: true },
          { name: 'Paid', type: 'boolean', required: true },
          { name: 'Notes', type: 'text', required: false }
        ]"
        class="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"
      >
        📒 Khata Template
      </button>
      <button
        @click="columns = [
          { name: 'Date', type: 'date', required: true },
          { name: 'Item', type: 'text', required: true },
          { name: 'Quantity', type: 'number', required: true },
          { name: 'Rate', type: 'number', required: true },
          { name: 'Total', type: 'number', required: true },
          { name: 'Notes', type: 'text', required: false }
        ]"
        class="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-full hover:bg-green-100"
      >
        📦 Inventory Template
      </button>
      <button
        @click="columns = [
          { name: 'Date', type: 'date', required: true },
          { name: 'Category', type: 'select', options: ['Food', 'Travel', 'Shopping', 'Bills', 'Other'], required: true },
          { name: 'Description', type: 'text', required: false },
          { name: 'Amount', type: 'number', required: true },
          { name: 'Payment Mode', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank'], required: false }
        ]"
        class="text-xs px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100"
      >
        💰 Expense Template
      </button>
    </div>
  </div>
</template>
