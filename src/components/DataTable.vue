<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true
  },
  data: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  sortColumn: {
    type: String,
    default: ''
  },
  sortDirection: {
    type: String,
    default: 'asc'
  }
})

const emit = defineEmits(['sort', 'edit', 'delete'])

function handleSort(column) {
  emit('sort', column)
}

function formatValue(value, column) {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  
  if (column.type === 'boolean') {
    return value === 'Yes' || value === true || value === 'TRUE' ? '✓ Yes' : '✕ No'
  }
  
  if (column.type === 'number') {
    const num = parseFloat(value)
    return isNaN(num) ? value : num.toLocaleString('en-IN')
  }
  
  return value
}

function getBooleanClass(value) {
  const isYes = value === 'Yes' || value === true || value === 'TRUE'
  return isYes 
    ? 'bg-green-100 text-green-800' 
    : 'bg-red-100 text-red-800'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full">
      <thead>
        <tr class="bg-gray-50 border-b">
          <th
            v-for="column in columns"
            :key="column.name"
            class="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
            @click="handleSort(column.name)"
          >
            <div class="flex items-center space-x-1">
              <span>{{ column.name }}</span>
              <span v-if="sortColumn === column.name" class="text-primary-600">
                {{ sortDirection === 'asc' ? '↑' : '↓' }}
              </span>
            </div>
          </th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      
      <tbody class="divide-y divide-gray-200">
        <!-- Loading State -->
        <tr v-if="loading">
          <td :colspan="columns.length + 1" class="px-4 py-8 text-center">
            <div class="flex items-center justify-center space-x-2 text-gray-500">
              <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>Loading...</span>
            </div>
          </td>
        </tr>

        <!-- Empty State -->
        <tr v-else-if="data.length === 0">
          <td :colspan="columns.length + 1" class="px-4 py-12 text-center">
            <div class="text-gray-400">
              <svg class="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-lg font-medium">No records found</p>
              <p class="text-sm">Add your first record to get started</p>
            </div>
          </td>
        </tr>

        <!-- Data Rows -->
        <tr
          v-else
          v-for="(row, index) in data"
          :key="row._rowIndex || index"
          :class="[
            'transition-colors',
            index % 2 === 0 ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 hover:bg-blue-50'
          ]"
        >
          <td
            v-for="column in columns"
            :key="column.name"
            class="px-4 py-3 text-sm"
          >
            <span
              v-if="column.type === 'boolean'"
              :class="[
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                getBooleanClass(row[column.name])
              ]"
            >
              {{ formatValue(row[column.name], column) }}
            </span>
            <span
              v-else-if="column.type === 'number'"
              class="font-mono"
            >
              {{ formatValue(row[column.name], column) }}
            </span>
            <span v-else>
              {{ formatValue(row[column.name], column) }}
            </span>
          </td>
          
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end space-x-2">
              <button
                @click="emit('edit', row)"
                class="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Edit"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click="emit('delete', row)"
                class="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
