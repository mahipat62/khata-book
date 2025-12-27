<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSheetsStore } from '@/stores/sheets'
import { useBackupStore } from '@/stores/backup'
import { useToastStore } from '@/stores/toast'
import { DEFAULT_COLUMNS, SHEET_TEMPLATES } from '@/config/google'
import Modal from '@/components/Modal.vue'
import ColumnBuilder from '@/components/ColumnBuilder.vue'
import ShareSheetModal from '@/components/ShareSheetModal.vue'

const router = useRouter()
const sheetsStore = useSheetsStore()
const backupStore = useBackupStore()
const toastStore = useToastStore()

const isLoading = ref(true)
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const showShareModal = ref(false)
const showAddFromDriveModal = ref(false)
const driveSheets = ref([])
const sheetToShare = ref(null)
const sheetToDelete = ref(null)
const newSheetName = ref('')
const isCreating = ref(false)
const isDeleting = ref(false)
const useCustomColumns = ref(false)
const selectedTemplate = ref('default')
const customColumns = ref([...DEFAULT_COLUMNS])
const activeTab = ref('all') // 'all', 'owned', 'shared'

// Filter sheets based on active tab
const filteredSheets = computed(() => {
  const allSheets = sheetsStore.sheets || []
  switch (activeTab.value) {
    case 'owned':
      return allSheets.filter(s => s.isOwner)
    case 'shared':
      return allSheets.filter(s => s.isShared || s.isLinked)
    default:
      return allSheets
  }
})

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

function openShareModal(sheet) {
  sheetToShare.value = sheet
  showShareModal.value = true
}

function handleShareSuccess(result) {
  if (result.success) {
    const accessText = result.role === 'writer' ? 'edit' : 'view'
    toastStore.success(`Sheet shared with ${result.email} (${accessText} access)`)
  }
}

// Add sheet from Google Drive
async function openAddFromDrive() {
  showAddFromDriveModal.value = true
  try {
    // Get all spreadsheets from Drive (owned + shared)
    driveSheets.value = await backupStore.listDriveSpreadsheets(true)
    // Filter out sheets already in our list
    const existingIds = new Set(sheetsStore.sheets.map(s => s.id))
    driveSheets.value = driveSheets.value.filter(s => !existingIds.has(s.id))
  } catch (error) {
    toastStore.error('Failed to load Drive sheets')
  }
}

async function addSheetFromDrive(sheet) {
  try {
    // Add to linked sheets
    sheetsStore.addLinkedSheet(sheet.id)
    // Refresh the sheets list
    await sheetsStore.fetchSheets()
    toastStore.success(`"${sheet.name}" added to your Khatas!`)
    showAddFromDriveModal.value = false
  } catch (error) {
    toastStore.error('Failed to add sheet')
  }
}

function unlinkSheet(sheet, event) {
  event?.stopPropagation()
  if (!confirm(`Remove "${sheet.name}" from your Khatas? (This won't delete the original sheet)`)) return
  
  sheetsStore.removeLinkedSheet(sheet.id)
  // Remove from local list
  const idx = sheetsStore.sheets.findIndex(s => s.id === sheet.id)
  if (idx !== -1) {
    sheetsStore.sheets.splice(idx, 1)
  }
  toastStore.success('Sheet removed from your list')
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
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">My Khatas</h1>
        <p class="text-gray-500">Manage all your Khata spreadsheets</p>
      </div>
      <div class="flex items-center space-x-2">
        <button @click="openAddFromDrive" class="btn-secondary flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span class="hidden sm:inline">Add from Drive</span>
        </button>
        <button @click="openCreateModal" class="btn-primary flex items-center space-x-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>New Khata</span>
        </button>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex items-center space-x-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
      <button 
        @click="activeTab = 'all'"
        :class="['px-4 py-2 rounded-md text-sm font-medium transition-colors', 
                 activeTab === 'all' ? 'bg-white shadow text-primary-700' : 'text-gray-600 hover:text-gray-800']"
      >
        All ({{ sheetsStore.sheets.length }})
      </button>
      <button 
        @click="activeTab = 'owned'"
        :class="['px-4 py-2 rounded-md text-sm font-medium transition-colors', 
                 activeTab === 'owned' ? 'bg-white shadow text-primary-700' : 'text-gray-600 hover:text-gray-800']"
      >
        My Sheets ({{ sheetsStore.sheets.filter(s => s.isOwner).length }})
      </button>
      <button 
        @click="activeTab = 'shared'"
        :class="['px-4 py-2 rounded-md text-sm font-medium transition-colors', 
                 activeTab === 'shared' ? 'bg-white shadow text-primary-700' : 'text-gray-600 hover:text-gray-800']"
      >
        Shared ({{ sheetsStore.sheets.filter(s => s.isShared || s.isLinked).length }})
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
    <div v-else-if="filteredSheets.length === 0" class="text-center py-20">
      <div class="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg class="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-gray-800 mb-2">
        {{ activeTab === 'shared' ? 'No Shared Sheets' : 'No Khatas Found' }}
      </h2>
      <p class="text-gray-500 mb-6">
        {{ activeTab === 'shared' 
           ? 'Sheets shared with you will appear here' 
           : 'Create your first Khata to start managing your accounts' }}
      </p>
      <div class="flex justify-center space-x-3">
        <button v-if="activeTab !== 'shared'" @click="openCreateModal" class="btn-primary">
          Create New Khata
        </button>
        <button @click="openAddFromDrive" class="btn-secondary">
          Add from Drive
        </button>
      </div>
    </div>

    <!-- Sheets Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="sheet in filteredSheets"
        :key="sheet.id"
        class="card hover:shadow-lg transition-shadow relative"
      >
        <!-- Shared/Linked Badge -->
        <div v-if="sheet.isShared || sheet.isLinked" class="absolute -top-2 -right-2">
          <span 
            v-if="sheet.isShared && !sheet.isLinked"
            class="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full shadow"
            :title="sheet.sharedBy ? `Shared by ${sheet.sharedBy}` : 'Shared with you'"
          >
            {{ sheet.canEdit ? '✏️ Shared' : '👁️ View Only' }}
          </span>
          <span 
            v-else-if="sheet.isLinked"
            class="px-2 py-1 bg-purple-500 text-white text-xs font-medium rounded-full shadow"
            title="Linked from Drive"
          >
            🔗 Linked
          </span>
        </div>

        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center space-x-3">
            <div 
              class="w-12 h-12 rounded-xl flex items-center justify-center"
              :class="sheet.isShared ? 'bg-blue-100' : sheet.isLinked ? 'bg-purple-100' : 'bg-green-100'"
            >
              <svg 
                class="w-6 h-6" 
                :class="sheet.isShared ? 'text-blue-600' : sheet.isLinked ? 'text-purple-600' : 'text-green-600'"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="font-semibold text-gray-800 truncate">{{ sheet.name }}</h3>
              <p class="text-xs text-gray-500">
                Modified: {{ formatDate(sheet.modifiedTime) }}
                <span v-if="sheet.sharedBy" class="block text-blue-600">by {{ sheet.sharedBy }}</span>
              </p>
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
            <!-- Share button (only for owned sheets) -->
            <button
              v-if="sheet.isOwner"
              @click="openShareModal(sheet)"
              class="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Share Sheet"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <!-- Rename button (only for owned sheets) -->
            <button
              v-if="sheet.isOwner"
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
              v-if="sheet.isOwner"
              @click="duplicateSheetStructure(sheet)"
              class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Duplicate Structure (Empty)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </button>
            <button
              v-if="sheet.isOwner"
              @click="duplicateSheet(sheet)"
              class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Create Backup (with data)"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <!-- Delete for owned, Unlink for linked/shared -->
            <button
              v-if="sheet.isOwner"
              @click="confirmDelete(sheet)"
              class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              v-if="sheet.isLinked"
              @click="unlinkSheet(sheet, $event)"
              class="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              title="Remove from list"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
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

    <!-- Share Sheet Modal -->
    <ShareSheetModal 
      :show="showShareModal"
      :sheetId="sheetToShare?.id"
      :sheetName="sheetToShare?.name"
      @close="showShareModal = false; sheetToShare = null"
      @share="handleShareSuccess"
    />

    <!-- Add from Drive Modal -->
    <div v-if="showAddFromDriveModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between p-4 border-b">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">Add Sheet from Google Drive</h3>
            <p class="text-xs text-gray-500 mt-1">Select any spreadsheet to add to your Khatas</p>
          </div>
          <button @click="showAddFromDriveModal = false" class="p-2 hover:bg-gray-100 rounded-lg">
            <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="backupStore.isLoading" class="flex items-center justify-center py-12">
            <svg class="w-8 h-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="ml-2 text-gray-600">Loading sheets...</span>
          </div>

          <div v-else-if="driveSheets.length === 0" class="text-center py-12 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>All available sheets are already in your Khatas!</p>
          </div>

          <div v-else class="space-y-2">
            <div 
              v-for="sheet in driveSheets" 
              :key="sheet.id"
              class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center space-x-3 flex-1 min-w-0">
                <div 
                  class="w-10 h-10 rounded-lg flex items-center justify-center"
                  :class="sheet.isOwner ? 'bg-green-100' : 'bg-blue-100'"
                >
                  <svg 
                    class="w-5 h-5" 
                    :class="sheet.isOwner ? 'text-green-600' : 'text-blue-600'"
                    viewBox="0 0 24 24" fill="currentColor"
                  >
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                    <path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-2">
                    <p class="font-medium text-gray-800 truncate">{{ sheet.name }}</p>
                    <span 
                      class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      :class="{
                        'bg-green-100 text-green-700': sheet.permission === 'owner',
                        'bg-blue-100 text-blue-700': sheet.permission === 'editor',
                        'bg-gray-100 text-gray-600': sheet.permission === 'viewer'
                      }"
                    >
                      {{ sheet.permission === 'owner' ? 'My Sheet' : 
                         sheet.permission === 'editor' ? '✏️ Can Edit' : '👁️ View Only' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500">
                    Modified: {{ new Date(sheet.modifiedTime).toLocaleDateString() }}
                    <span v-if="sheet.sharedBy" class="ml-1">• from {{ sheet.sharedBy }}</span>
                  </p>
                </div>
              </div>
              <button 
                @click="addSheetFromDrive(sheet)"
                class="btn-primary text-sm px-3 py-1.5 flex-shrink-0"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div class="p-4 border-t bg-gray-50">
          <p class="text-xs text-gray-500 text-center">
            💡 Tip: Sheets shared with you will appear here. You can view or edit based on permissions.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
