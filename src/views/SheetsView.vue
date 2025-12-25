<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSheetsStore } from '@/stores/sheets'
import { useToastStore } from '@/stores/toast'
import { DEFAULT_COLUMNS, SHEET_TEMPLATES } from '@/config/google'
import Modal from '@/components/Modal.vue'
import ColumnBuilder from '@/components/ColumnBuilder.vue'

const router = useRouter()
const sheetsStore = useSheetsStore()
const toastStore = useToastStore()

const isLoading = ref(true)
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const sheetToDelete = ref(null)
const newSheetName = ref('')
const isCreating = ref(false)
const isDeleting = ref(false)
const useCustomColumns = ref(false)
const selectedTemplate = ref('default')
const customColumns = ref([...DEFAULT_COLUMNS])

// Watch template selection to update columns preview
watch(selectedTemplate, (template) => {
  if (!useCustomColumns.value && SHEET_TEMPLATES[template]) {
    customColumns.value = [...SHEET_TEMPLATES[template].columns]
  }
})

onMounted(async () => {
  await loadSheets()
})

async function loadSheets() {
  isLoading.value = true
  try {
    await sheetsStore.fetchSheets()
  } catch (error) {
    toastStore.error('Failed to load sheets')
  } finally {
    isLoading.value = false
  }
}

async function createSheet() {
  if (!newSheetName.value.trim()) {
    toastStore.warning('Please enter a name for your Khata')
    return
  }

  let columnsToUse
  if (useCustomColumns.value) {
    columnsToUse = customColumns.value
  } else {
    columnsToUse = SHEET_TEMPLATES[selectedTemplate.value]?.columns || DEFAULT_COLUMNS
  }
  
  if (columnsToUse.length === 0) {
    toastStore.warning('Please add at least one column')
    return
  }

  isCreating.value = true
  try {
    const sheetId = await sheetsStore.createSheet(newSheetName.value.trim(), columnsToUse)
    toastStore.success('Khata created successfully!')
    showCreateModal.value = false
    newSheetName.value = ''
    useCustomColumns.value = false
    selectedTemplate.value = 'default'
    customColumns.value = [...DEFAULT_COLUMNS]
    router.push(`/sheet/${sheetId}`)
  } catch (error) {
    toastStore.error('Failed to create Khata')
  } finally {
    isCreating.value = false
  }
}

function openCreateModal() {
  newSheetName.value = ''
  useCustomColumns.value = false
  selectedTemplate.value = 'default'
  customColumns.value = [...DEFAULT_COLUMNS]
  showCreateModal.value = true
}

function openSheet(sheetId) {
  router.push(`/sheet/${sheetId}`)
}

function confirmDelete(sheet) {
  sheetToDelete.value = sheet
  showDeleteModal.value = true
}

async function deleteSheet() {
  if (!sheetToDelete.value) return

  isDeleting.value = true
  try {
    await sheetsStore.deleteSheet(sheetToDelete.value.id)
    toastStore.success('Khata deleted successfully')
    showDeleteModal.value = false
    sheetToDelete.value = null
  } catch (error) {
    toastStore.error('Failed to delete Khata')
  } finally {
    isDeleting.value = false
  }
}

async function duplicateSheet(sheet) {
  try {
    const backupName = `${sheet.name} - Backup ${new Date().toLocaleDateString()}`
    await sheetsStore.duplicateSheet(sheet.id, backupName)
    toastStore.success('Backup created successfully!')
  } catch (error) {
    toastStore.error('Failed to create backup')
  }
}

// Duplicate sheet with same structure (empty data)
async function duplicateSheetStructure(sheet) {
  try {
    // First load the sheet to get its column structure
    await sheetsStore.loadSheet(sheet.id)
    const columns = sheetsStore.currentSheet?.columns || DEFAULT_COLUMNS
    
    // Create new sheet with same columns
    const newName = sheet.name.replace('Khata - ', '') + ' (Copy)'
    const newSheetId = await sheetsStore.createSheet(newName, columns)
    
    toastStore.success('Sheet structure duplicated successfully!')
    router.push(`/sheet/${newSheetId}`)
  } catch (error) {
    toastStore.error('Failed to duplicate sheet structure')
  }
}

// Rename sheet
const showRenameModal = ref(false)
const sheetToRename = ref(null)
const newName = ref('')
const isRenaming = ref(false)

function openRenameModal(sheet) {
  sheetToRename.value = sheet
  newName.value = sheet.name.replace('Khata - ', '')
  showRenameModal.value = true
}

async function renameSheet() {
  if (!newName.value.trim() || !sheetToRename.value) return
  
  isRenaming.value = true
  try {
    await sheetsStore.renameSheet(sheetToRename.value.id, `Khata - ${newName.value.trim()}`)
    toastStore.success('Sheet renamed successfully!')
    showRenameModal.value = false
    sheetToRename.value = null
    newName.value = ''
  } catch (error) {
    toastStore.error('Failed to rename sheet')
  } finally {
    isRenaming.value = false
  }
}

function openInGoogleSheets(url) {
  window.open(url, '_blank')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">My Khatas</h1>
        <p class="text-gray-500">Manage all your Khata spreadsheets</p>
      </div>
      <button @click="openCreateModal" class="btn-primary flex items-center space-x-2">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>New Khata</span>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-4 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="text-gray-500">Loading your Khatas...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="sheetsStore.sheets.length === 0" class="text-center py-20">
      <div class="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-800 mb-2">No Khatas Found</h2>
      <p class="text-gray-500 mb-6">Create your first Khata to start managing your accounts</p>
      <button @click="openCreateModal" class="btn-primary">
        Create Your First Khata
      </button>
    </div>

    <!-- Sheets Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="sheet in sheetsStore.sheets"
        :key="sheet.id"
        class="card hover:shadow-lg transition-shadow"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center space-x-3">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-800 truncate">{{ sheet.name }}</h3>
              <p class="text-xs text-gray-500">Modified: {{ formatDate(sheet.modifiedTime) }}</p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t">
          <button
            @click="openSheet(sheet.id)"
            class="btn-primary text-sm py-1.5"
          >
            Open
          </button>
          
          <div class="flex items-center space-x-1">
            <button
              @click="openRenameModal(sheet)"
              class="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Rename Sheet"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="openInGoogleSheets(sheet.webViewLink)"
              class="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Open in Google Sheets"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                <path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/>
              </svg>
            </button>
            <button
              @click="duplicateSheetStructure(sheet)"
              class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Duplicate Structure (Empty)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </button>
            <button
              @click="duplicateSheet(sheet)"
              class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Create Backup (with data)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              @click="confirmDelete(sheet)"
              class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Modal v-model="showCreateModal" title="Create New Khata" size="lg">
      <div class="space-y-4">
        <div>
          <label class="label">Khata Name</label>
          <input
            v-model="newSheetName"
            type="text"
            class="input"
            placeholder="e.g., Business 2024, Personal Expenses"
          />
        </div>
        
        <!-- Column Type Toggle -->
        <div class="flex items-center space-x-4 flex-wrap gap-2">
          <label class="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              :value="false"
              v-model="useCustomColumns"
              class="w-4 h-4 text-primary-600"
            />
            <span class="text-sm text-gray-700">Use Template</span>
          </label>
          <label class="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              :value="true"
              v-model="useCustomColumns"
              class="w-4 h-4 text-primary-600"
            />
            <span class="text-sm text-gray-700">Custom Columns</span>
          </label>
        </div>

        <!-- Template Selection -->
        <div v-if="!useCustomColumns" class="space-y-3">
          <h4 class="text-sm font-medium text-gray-700">Choose Template:</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label 
              v-for="(template, key) in SHEET_TEMPLATES" 
              :key="key"
              class="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none transition-all"
              :class="selectedTemplate === key ? 'border-primary-500 ring-2 ring-primary-500' : 'border-gray-200 hover:border-gray-300'"
            >
              <input 
                type="radio" 
                :value="key" 
                v-model="selectedTemplate" 
                class="sr-only"
              />
              <div class="flex flex-col">
                <span class="block text-sm font-medium text-gray-900">{{ template.name }}</span>
                <span class="mt-1 text-xs text-gray-500">{{ template.description }}</span>
              </div>
              <svg 
                v-if="selectedTemplate === key" 
                class="h-5 w-5 text-primary-600 absolute top-2 right-2" 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
            </label>
          </div>
          
          <!-- Template Columns Preview -->
          <div class="bg-gray-50 rounded-lg p-4 mt-3">
            <h4 class="text-sm font-medium text-gray-700 mb-2">Columns in this template:</h4>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="col in SHEET_TEMPLATES[selectedTemplate]?.columns"
                :key="col.name"
                class="px-2 py-1 bg-white rounded text-xs text-gray-600 border"
              >
                {{ col.name }} ({{ col.type }})
              </span>
            </div>
          </div>
        </div>

        <!-- Custom Column Editor -->
        <div v-else>
          <h4 class="text-sm font-medium text-gray-700 mb-2">Define Your Columns:</h4>
          <ColumnBuilder v-model="customColumns" />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end space-x-3">
          <button @click="showCreateModal = false" class="btn-secondary" :disabled="isCreating">
            Cancel
          </button>
          <button @click="createSheet" class="btn-primary" :disabled="isCreating || !newSheetName.trim()">
            <span v-if="isCreating">Creating...</span>
            <span v-else>Create Khata</span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-model="showDeleteModal" title="Delete Khata" size="sm">
      <div class="text-center py-4">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p class="text-gray-600">
          Are you sure you want to delete <strong>{{ sheetToDelete?.name }}</strong>? This action cannot be undone.
        </p>
      </div>

      <template #footer>
        <div class="flex justify-center space-x-3">
          <button @click="showDeleteModal = false" class="btn-secondary" :disabled="isDeleting">
            Cancel
          </button>
          <button @click="deleteSheet" class="btn-danger" :disabled="isDeleting">
            <span v-if="isDeleting">Deleting...</span>
            <span v-else>Delete</span>
          </button>
        </div>
      </template>
    </Modal>

    <!-- Rename Modal -->
    <Modal v-model="showRenameModal" title="Rename Khata" size="sm">
      <div class="py-4">
        <div class="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <label class="block text-sm font-medium text-gray-700 mb-2">New Name</label>
        <input 
          v-model="newName" 
          type="text" 
          class="input w-full" 
          placeholder="Enter new name"
          @keyup.enter="renameSheet"
        />
      </div>

      <template #footer>
        <div class="flex justify-center space-x-3">
          <button @click="showRenameModal = false" class="btn-secondary" :disabled="isRenaming">
            Cancel
          </button>
          <button @click="renameSheet" class="btn-primary" :disabled="isRenaming || !newName.trim()">
            <span v-if="isRenaming">Renaming...</span>
            <span v-else>Rename</span>
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>
