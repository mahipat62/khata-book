<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      dateFrom: '',
      dateTo: '',
      paid: 'all',
      search: ''
    })
  },
  columns: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'apply', 'reset'])

const localFilters = ref({ ...props.modelValue })

function updateFilter(key, value) {
  localFilters.value[key] = value
  emit('update:modelValue', { ...localFilters.value })
}

function applyFilters() {
  emit('apply', { ...localFilters.value })
}

function resetFilters() {
  localFilters.value = {
    dateFrom: '',
    dateTo: '',
    paid: 'all',
    search: ''
  }
  emit('update:modelValue', { ...localFilters.value })
  emit('reset')
}

const hasActiveFilters = computed(() => {
  return localFilters.value.dateFrom || 
         localFilters.value.dateTo || 
         localFilters.value.paid !== 'all' ||
         localFilters.value.search
})
</script>

<template>
  <div class="bg-white rounded-lg shadow-sm border p-4">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-semibold text-gray-700 flex items-center space-x-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>Filters</span>
      </h3>
      <button
        v-if="hasActiveFilters"
        @click="resetFilters"
        class="text-xs text-primary-600 hover:text-primary-700 font-medium"
      >
        Reset All
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Search -->
      <div>
        <label class="label">Search</label>
        <div class="relative">
          <input
            type="text"
            :value="localFilters.search"
            @input="updateFilter('search', $event.target.value)"
            placeholder="Search records..."
            class="input pl-9"
          />
          <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <!-- Date From -->
      <div>
        <label class="label">From Date</label>
        <input
          type="date"
          :value="localFilters.dateFrom"
          @input="updateFilter('dateFrom', $event.target.value)"
          class="input"
        />
      </div>

      <!-- Date To -->
      <div>
        <label class="label">To Date</label>
        <input
          type="date"
          :value="localFilters.dateTo"
          @input="updateFilter('dateTo', $event.target.value)"
          class="input"
        />
      </div>

      <!-- Paid Status -->
      <div>
        <label class="label">Payment Status</label>
        <select
          :value="localFilters.paid"
          @change="updateFilter('paid', $event.target.value)"
          class="input"
        >
          <option value="all">All</option>
          <option value="paid">Paid Only</option>
          <option value="unpaid">Unpaid Only</option>
        </select>
      </div>
    </div>

    <div class="mt-4 flex justify-end">
      <button @click="applyFilters" class="btn-primary text-sm">
        Apply Filters
      </button>
    </div>
  </div>
</template>
