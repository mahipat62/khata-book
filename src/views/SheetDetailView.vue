<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSheetsStore } from '@/stores/sheets'
import { useToastStore } from '@/stores/toast'
import DataTable from '@/components/DataTable.vue'
import RecordForm from '@/components/RecordForm.vue'
import FilterPanel from '@/components/FilterPanel.vue'
import SummaryCards from '@/components/SummaryCards.vue'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const router = useRouter()
const sheetsStore = useSheetsStore()
const toastStore = useToastStore()

const isLoading = ref(true)
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selectedRecord = ref(null)
const isSaving = ref(false)
const showFilters = ref(false)

const filters = ref({
  dateFrom: '',
  dateTo: '',
  paid: 'all',
  search: ''
})

const sortColumn = ref('')
const sortDirection = ref('asc')

const sheetId = computed(() => route.params.id)

onMounted(async () => {
  await loadSheet()
})

watch(() => route.params.id, async () => {
  await loadSheet()
})

async function loadSheet() {
  isLoading.value = true
  try {
    await sheetsStore.loadSheet(sheetId.value)
  } catch (error) {
    toastStore.error('Failed to load sheet')
    router.push('/sheets')
  } finally {
    isLoading.value = false
  }
}

const columns = computed(() => sheetsStore.currentSheet?.columns || [])

// Filter and sort data
const filteredData = computed(() => {
  let data = [...sheetsStore.currentData]

  // Search filter
  if (filters.value.search) {
    const searchLower = filters.value.search.toLowerCase()
    data = data.filter(row => {
      return Object.values(row).some(val => 
        String(val).toLowerCase().includes(searchLower)
      )
    })
  }

  // Date range filter
  if (filters.value.dateFrom) {
    data = data.filter(row => {
      const dateCol = columns.value.find(c => c.type === 'date')?.name || 'Date'
      const rowDate = row[dateCol]
      if (!rowDate) return true
      return new Date(rowDate) >= new Date(filters.value.dateFrom)
    })
  }

  if (filters.value.dateTo) {
    data = data.filter(row => {
      const dateCol = columns.value.find(c => c.type === 'date')?.name || 'Date'
      const rowDate = row[dateCol]
      if (!rowDate) return true
      return new Date(rowDate) <= new Date(filters.value.dateTo)
    })
  }

  // Paid status filter
  if (filters.value.paid !== 'all') {
    const paidCol = columns.value.find(c => c.type === 'boolean')?.name || 'Paid'
    data = data.filter(row => {
      const isPaid = row[paidCol] === 'Yes' || row[paidCol] === true || row[paidCol] === 'TRUE'
      return filters.value.paid === 'paid' ? isPaid : !isPaid
    })
  }

  // Sorting
  if (sortColumn.value) {
    data.sort((a, b) => {
      let valA = a[sortColumn.value]
      let valB = b[sortColumn.value]

      // Handle numeric comparison
      const col = columns.value.find(c => c.name === sortColumn.value)
      if (col?.type === 'number') {
        valA = parseFloat(valA) || 0
        valB = parseFloat(valB) || 0
      } else if (col?.type === 'date') {
        valA = new Date(valA || 0)
        valB = new Date(valB || 0)
      } else {
        valA = String(valA || '').toLowerCase()
        valB = String(valB || '').toLowerCase()
      }

      if (valA < valB) return sortDirection.value === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection.value === 'asc' ? 1 : -1
      return 0
    })
  }

  return data
})

function handleSort(column) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'asc'
  }
}

function openAddModal() {
  selectedRecord.value = null
  showAddModal.value = true
}

function openEditModal(record) {
  selectedRecord.value = { ...record }
  showEditModal.value = true
}

function openDeleteModal(record) {
  selectedRecord.value = record
  showDeleteModal.value = true
}

async function handleAddRecord(data) {
  isSaving.value = true
  try {
    await sheetsStore.addRecord(sheetId.value, data)
    toastStore.success('Record added successfully')
    showAddModal.value = false
  } catch (error) {
    toastStore.error('Failed to add record')
  } finally {
    isSaving.value = false
  }
}

async function handleUpdateRecord(data) {
  isSaving.value = true
  try {
    await sheetsStore.updateRecord(sheetId.value, selectedRecord.value._rowIndex, data)
    toastStore.success('Record updated successfully')
    showEditModal.value = false
    selectedRecord.value = null
  } catch (error) {
    toastStore.error('Failed to update record')
  } finally {
    isSaving.value = false
  }
}

async function handleDeleteRecord() {
  isSaving.value = true
  try {
    await sheetsStore.deleteRecord(sheetId.value, selectedRecord.value._rowIndex)
    toastStore.success('Record deleted successfully')
    showDeleteModal.value = false
    selectedRecord.value = null
  } catch (error) {
    toastStore.error('Failed to delete record')
  } finally {
    isSaving.value = false
  }
}

function resetFilters() {
  filters.value = {
    dateFrom: '',
    dateTo: '',
    paid: 'all',
    search: ''
  }
}

function openInGoogleSheets() {
  if (sheetsStore.currentSheet?.url) {
    window.open(sheetsStore.currentSheet.url, '_blank')
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-4 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="text-gray-500">Loading sheet...</p>
      </div>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div class="flex items-center space-x-4">
          <button
            @click="router.push('/sheets')"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-bold text-gray-800">{{ sheetsStore.currentSheet?.name }}</h1>
            <p class="text-gray-500 text-sm">{{ filteredData.length }} records</p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <button
            @click="openInGoogleSheets"
            class="btn-secondary flex items-center space-x-2"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
              <path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/>
            </svg>
            <span class="hidden sm:inline">Open in Sheets</span>
          </button>
          <button
            @click="showFilters = !showFilters"
            :class="['btn-secondary flex items-center space-x-2', showFilters ? 'bg-primary-100 text-primary-700' : '']"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span class="hidden sm:inline">Filters</span>
          </button>
          <button
            @click="loadSheet"
            class="btn-secondary flex items-center space-x-2"
            title="Refresh"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            @click="openAddModal"
            class="btn-primary flex items-center space-x-2"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Record</span>
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div v-if="showFilters" class="mb-6">
        <FilterPanel
          v-model="filters"
          :columns="columns"
          @reset="resetFilters"
        />
      </div>

      <!-- Summary Cards -->
      <SummaryCards
        :data="filteredData"
        :columns="columns"
        class="mb-6"
      />

      <!-- Data Table -->
      <div class="card">
        <DataTable
          :columns="columns"
          :data="filteredData"
          :loading="sheetsStore.isLoading"
          :sort-column="sortColumn"
          :sort-direction="sortDirection"
          @sort="handleSort"
          @edit="openEditModal"
          @delete="openDeleteModal"
        />
      </div>

      <!-- Add Record Modal -->
      <Modal v-model="showAddModal" title="Add New Record" size="md">
        <RecordForm
          :columns="columns"
          :loading="isSaving"
          @submit="handleAddRecord"
          @cancel="showAddModal = false"
        />
      </Modal>

      <!-- Edit Record Modal -->
      <Modal v-model="showEditModal" title="Edit Record" size="md">
        <RecordForm
          v-if="selectedRecord"
          :columns="columns"
          :initial-data="selectedRecord"
          :is-edit="true"
          :loading="isSaving"
          @submit="handleUpdateRecord"
          @cancel="showEditModal = false"
        />
      </Modal>

      <!-- Delete Confirmation Modal -->
      <Modal v-model="showDeleteModal" title="Delete Record" size="sm">
        <div class="text-center py-4">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <p class="text-gray-600">
            Are you sure you want to delete this record? This action cannot be undone.
          </p>
        </div>

        <template #footer>
          <div class="flex justify-center space-x-3">
            <button @click="showDeleteModal = false" class="btn-secondary" :disabled="isSaving">
              Cancel
            </button>
            <button @click="handleDeleteRecord" class="btn-danger" :disabled="isSaving">
              <span v-if="isSaving">Deleting...</span>
              <span v-else>Delete</span>
            </button>
          </div>
        </template>
      </Modal>
    </template>
  </div>
</template>
