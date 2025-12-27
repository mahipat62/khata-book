<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSheetsStore } from '@/stores/sheets'
import { useToastStore } from '@/stores/toast'
import { useBackupStore } from '@/stores/backup'
import { APP_CONFIG, GOOGLE_CONFIG } from '@/config/google'
import FieldMappingModal from '@/components/FieldMappingModal.vue'

const authStore = useAuthStore()
const sheetsStore = useSheetsStore()
const toastStore = useToastStore()
const backupStore = useBackupStore()

const showApiInfo = ref(false)
const showImportModal = ref(false)
const showDriveImportModal = ref(false)
const showFieldMappingModal = ref(false)
const driveSheets = ref([])
const selectedSheetForMapping = ref(null)
const importFileInput = ref(null)
const isBackingUp = ref(false)
const isRestoring = ref(false)
const backupStatus = ref(null)
const showSharedSheetsOnly = ref(false)

// Auto backup settings
const autoBackupEnabled = computed({
  get: () => backupStore.autoBackupSettings.enabled,
  set: (val) => backupStore.updateAutoBackupSettings({ enabled: val })
})

const autoBackupFrequency = computed({
  get: () => backupStore.autoBackupSettings.frequency,
  set: (val) => backupStore.updateAutoBackupSettings({ frequency: val })
})

const lastAutoBackup = computed(() => {
  const date = backupStore.autoBackupSettings.lastAutoBackup
  if (!date) return 'Never'
  return new Date(date).toLocaleString()
})

const nextBackupText = computed(() => {
  if (!backupStore.autoBackupSettings.enabled) return 'Auto backup disabled'
  const next = backupStore.nextBackupDate
  if (!next) return 'On next visit'
  return next.toLocaleString()
})

onMounted(async () => {
  // Load auto backup settings
  backupStore.loadAutoBackupSettings()
  
  // Check backup status on mount
  try {
    backupStatus.value = await backupStore.checkBackupStatus()
  } catch (error) {
    console.error('Failed to check backup status:', error)
  }
})

async function handleReAuth() {
  try {
    authStore.signIn()
    toastStore.info('Re-authenticating...')
  } catch (error) {
    toastStore.error('Failed to re-authenticate')
  }
}

async function clearCache() {
  try {
    // Only clear session storage and sheets state, NOT auth data
    sessionStorage.clear()
    sheetsStore.clearState()
    toastStore.success('Cache cleared successfully (login preserved)')
  } catch (error) {
    toastStore.error('Failed to clear cache')
  }
}

// Full logout and clear all data
async function clearAllData() {
  if (!confirm('This will sign you out and clear all local data. Your Google Drive backup will NOT be affected. Continue?')) {
    return
  }
  try {
    sessionStorage.clear()
    localStorage.clear()
    sheetsStore.clearState()
    authStore.signOut()
    toastStore.success('All local data cleared')
    window.location.reload()
  } catch (error) {
    toastStore.error('Failed to clear data')
  }
}

// Backup to Google Drive
async function backupToGoogleDrive() {
  isBackingUp.value = true
  try {
    const data = {
      sheets: sheetsStore.sheets,
      currentSheet: sheetsStore.currentSheet,
      user: authStore.user
    }
    await backupStore.saveToGoogleDrive(data)
    backupStatus.value = await backupStore.checkBackupStatus()
    toastStore.success('Backup saved to Google Drive successfully!')
  } catch (error) {
    toastStore.error('Failed to backup to Google Drive: ' + error.message)
  } finally {
    isBackingUp.value = false
  }
}

// Restore from Google Drive
async function restoreFromGoogleDrive() {
  isRestoring.value = true
  try {
    const backup = await backupStore.loadFromGoogleDrive()
    if (backup && backup.data) {
      // Restore sheets data
      if (backup.data.sheets) {
        sheetsStore.sheets = backup.data.sheets
      }
      toastStore.success('Data restored from Google Drive successfully!')
    } else {
      toastStore.info('No backup found in Google Drive')
    }
  } catch (error) {
    toastStore.error('Failed to restore from Google Drive: ' + error.message)
  } finally {
    isRestoring.value = false
  }
}

// Export database to JSON
function exportDatabase() {
  try {
    const data = {
      sheets: sheetsStore.sheets,
      currentSheet: sheetsStore.currentSheet,
      currentData: sheetsStore.currentData
    }
    const filename = `dhanvika_backup_${new Date().toISOString().split('T')[0]}.json`
    backupStore.exportToJsonFile(data, filename)
    toastStore.success('Database exported successfully!')
  } catch (error) {
    toastStore.error('Failed to export database')
  }
}

// Import database from JSON
function triggerImport() {
  importFileInput.value?.click()
}

async function handleFileImport(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    const importedData = await backupStore.importFromJsonFile(file)
    if (importedData && importedData.data) {
      // Restore data
      if (importedData.data.sheets) {
        sheetsStore.sheets = importedData.data.sheets
      }
      if (importedData.data.currentSheet) {
        sheetsStore.currentSheet = importedData.data.currentSheet
      }
      if (importedData.data.currentData) {
        sheetsStore.currentData = importedData.data.currentData
      }
      toastStore.success('Database imported successfully!')
    } else {
      toastStore.error('Invalid backup file format')
    }
  } catch (error) {
    toastStore.error('Failed to import: ' + error.message)
  }
  
  // Reset file input
  event.target.value = ''
}

// Import sheet from Google Drive
async function openDriveImport() {
  showDriveImportModal.value = true
  try {
    driveSheets.value = await backupStore.listDriveSpreadsheets(true) // Include shared sheets
  } catch (error) {
    toastStore.error('Failed to list Google Drive sheets')
  }
}

// Filter sheets based on ownership
const filteredDriveSheets = computed(() => {
  if (showSharedSheetsOnly.value) {
    return driveSheets.value.filter(s => !s.isOwner)
  }
  return driveSheets.value
})

// Open field mapping for a sheet
async function openFieldMapping(sheet) {
  try {
    const sheetData = await backupStore.importSheetFromDrive(sheet.id, sheet.permission)
    selectedSheetForMapping.value = sheetData
    showFieldMappingModal.value = true
  } catch (error) {
    toastStore.error('Failed to load sheet for mapping: ' + error.message)
  }
}

// Handle field mapping confirmation
async function handleFieldMappingConfirm(mappingConfig) {
  try {
    if (mappingConfig.mode === 'copy') {
      // Create a new sheet with mapped data
      await createMappedSheet(mappingConfig)
    } else {
      // Link to original sheet
      await linkOriginalSheet(mappingConfig)
    }
    showFieldMappingModal.value = false
    showDriveImportModal.value = false
    selectedSheetForMapping.value = null
  } catch (error) {
    toastStore.error('Failed to import sheet: ' + error.message)
  }
}

// Create new sheet with mapped columns
async function createMappedSheet(config) {
  const { sheetName, mappings, sourceColumns, originalId } = config
  const originalData = selectedSheetForMapping.value
  
  // Build new columns based on mappings
  const standardFieldLabels = {
    date: 'Date',
    party: 'Party Name',
    description: 'Description',
    credit: 'Credit',
    debit: 'Debit',
    status: 'Status',
    notes: 'Notes'
  }
  
  // Create columns for mapped fields
  const newColumns = []
  const columnMapping = {} // sourceColumn -> newColumnName
  
  Object.entries(mappings).forEach(([sourceCol, fieldKey]) => {
    const label = standardFieldLabels[fieldKey] || sourceCol
    const colType = sourceColumns.find(c => c.name === sourceCol)?.type || 'text'
    newColumns.push({
      name: label,
      type: colType,
      required: fieldKey === 'date'
    })
    columnMapping[sourceCol] = label
  })
  
  // Add unmapped columns at the end
  sourceColumns.forEach(col => {
    if (!mappings[col.name]) {
      newColumns.push({
        name: col.name,
        type: col.type,
        required: false
      })
      columnMapping[col.name] = col.name
    }
  })
  
  // Transform data
  const transformedData = originalData.data.map(row => {
    const newRow = { _rowIndex: row._rowIndex }
    Object.entries(columnMapping).forEach(([src, dest]) => {
      newRow[dest] = row[src] || ''
    })
    return newRow
  })
  
  // Create new sheet
  const newSheet = await sheetsStore.createSheet(sheetName, newColumns)
  
  // Add data to the new sheet
  if (transformedData.length > 0 && newSheet?.id) {
    await addDataToSheet(newSheet.id, transformedData, newColumns)
  }
  
  toastStore.success(`Sheet "${sheetName}" created with ${transformedData.length} records!`)
}

// Add data to a sheet in batches
async function addDataToSheet(sheetId, data, columns) {
  const headers = columns.map(c => c.name)
  const values = data.map(row => headers.map(h => row[h] || ''))
  
  // Update values (skip header row - row 1, start from row 2)
  if (values.length > 0) {
    await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Sheet1!A2:${String.fromCharCode(65 + headers.length - 1)}${values.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      resource: { values }
    })
  }
}

// Link to original sheet (view only or edit)
async function linkOriginalSheet(config) {
  const originalData = selectedSheetForMapping.value
  
  // Add to sheets list
  const existing = sheetsStore.sheets.find(s => s.id === originalData.id)
  if (!existing) {
    sheetsStore.sheets.push({
      id: originalData.id,
      name: originalData.name,
      webViewLink: originalData.url,
      modifiedTime: new Date().toISOString(),
      isLinked: true,
      canEdit: originalData.canEdit,
      permission: originalData.permission,
      fieldMappings: config.mappings
    })
  }
  
  toastStore.success(`Sheet "${originalData.name}" linked successfully! (${originalData.permission})`)
}

// Legacy function for quick import without mapping
async function importFromDriveSheet(sheetId) {
  try {
    const sheetData = await backupStore.importSheetFromDrive(sheetId)
    if (sheetData) {
      // Add to sheets list if not already there
      const existing = sheetsStore.sheets.find(s => s.id === sheetId)
      if (!existing) {
        sheetsStore.sheets.push({
          id: sheetData.id,
          name: sheetData.name,
          webViewLink: sheetData.url,
          modifiedTime: new Date().toISOString()
        })
      }
      toastStore.success(`Sheet "${sheetData.name}" imported successfully!`)
      showDriveImportModal.value = false
    }
  } catch (error) {
    toastStore.error('Failed to import sheet: ' + error.message)
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8">
    <h1 class="text-2xl font-bold text-gray-800 mb-8">Settings</h1>

    <!-- Account Section -->
    <div class="card mb-6">
      <h2 class="card-header">Account</h2>
      
      <div class="flex items-center space-x-4 mb-6">
        <img
          v-if="authStore.user?.picture"
          :src="authStore.user.picture"
          :alt="authStore.user.name"
          class="w-16 h-16 rounded-full"
        />
        <div v-else class="w-16 h-16 bg-primary-200 rounded-full flex items-center justify-center">
          <span class="text-2xl text-primary-700 font-bold">{{ authStore.user?.name?.[0] || 'U' }}</span>
        </div>
        <div>
          <p class="text-lg font-semibold text-gray-800">{{ authStore.user?.name }}</p>
          <p class="text-gray-500">{{ authStore.user?.email }}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <button @click="handleReAuth" class="btn-secondary">
          Re-authenticate
        </button>
        <button @click="clearCache" class="btn-secondary">
          Clear Cache
        </button>
        <button @click="clearAllData" class="btn-secondary text-red-600 hover:bg-red-50">
          Clear All Data & Logout
        </button>
      </div>
      
      <p class="mt-3 text-xs text-gray-500">
        ✓ Your login is now persistent - you won't need to sign in every time!
      </p>
    </div>

    <!-- Data Backup Section (Google Drive) -->
    <div class="card mb-6">
      <h2 class="card-header">☁️ Cloud Backup (Google Drive)</h2>
      
      <p class="text-sm text-gray-600 mb-4">
        Save your app data to Google Drive so you never lose it, even if you clear cache or switch devices.
      </p>

      <div v-if="backupStatus?.exists" class="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span class="text-sm text-green-800">
            Last backup: {{ new Date(backupStatus.lastModified).toLocaleString() }}
          </span>
        </div>
      </div>

      <div v-else class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span class="text-sm text-yellow-800">No backup found. Create one now!</span>
        </div>
      </div>

      <div class="flex flex-wrap gap-3">
        <button 
          @click="backupToGoogleDrive" 
          :disabled="isBackingUp"
          class="btn-primary flex items-center space-x-2"
        >
          <svg v-if="isBackingUp" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span>{{ isBackingUp ? 'Backing up...' : 'Backup to Drive' }}</span>
        </button>
        
        <button 
          @click="restoreFromGoogleDrive" 
          :disabled="isRestoring || !backupStatus?.exists"
          class="btn-secondary flex items-center space-x-2"
        >
          <svg v-if="isRestoring" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          <span>{{ isRestoring ? 'Restoring...' : 'Restore from Drive' }}</span>
        </button>
      </div>

      <!-- Auto Backup Settings -->
      <div class="mt-6 pt-4 border-t border-gray-200">
        <h3 class="text-sm font-semibold text-gray-700 mb-3">🔄 Auto Backup</h3>
        
        <div class="space-y-4">
          <!-- Enable/Disable Toggle -->
          <div class="flex items-center justify-between">
            <div>
              <label class="text-sm text-gray-700">Enable Auto Backup</label>
              <p class="text-xs text-gray-500">Automatically backup when you visit the app</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                v-model="autoBackupEnabled"
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <!-- Frequency Selection -->
          <div v-if="autoBackupEnabled" class="flex items-center justify-between">
            <label class="text-sm text-gray-700">Backup Frequency</label>
            <select 
              v-model="autoBackupFrequency"
              class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <!-- Status Info -->
          <div v-if="autoBackupEnabled" class="bg-gray-50 rounded-lg p-3 text-sm">
            <div class="flex justify-between text-gray-600">
              <span>Last auto backup:</span>
              <span class="font-medium">{{ lastAutoBackup }}</span>
            </div>
            <div class="flex justify-between text-gray-600 mt-1">
              <span>Next scheduled:</span>
              <span class="font-medium text-primary-600">{{ nextBackupText }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Import/Export Section -->
    <div class="card mb-6">
      <h2 class="card-header">📁 Import & Export</h2>
      
      <p class="text-sm text-gray-600 mb-4">
        Export your data as JSON file for backup, or import data from a file or Google Drive sheet.
      </p>

      <input 
        ref="importFileInput" 
        type="file" 
        accept=".json"
        @change="handleFileImport"
        class="hidden"
      />

      <div class="grid sm:grid-cols-3 gap-3">
        <button @click="exportDatabase" class="btn-secondary flex items-center justify-center space-x-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Export JSON</span>
        </button>
        
        <button @click="triggerImport" class="btn-secondary flex items-center justify-center space-x-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span>Import JSON</span>
        </button>

        <button @click="openDriveImport" class="btn-secondary flex items-center justify-center space-x-2">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Import from Drive</span>
        </button>
      </div>
    </div>

    <!-- App Info Section -->
    <div class="card mb-6">
      <h2 class="card-header">About</h2>
      
      <div class="space-y-3">
        <div class="flex justify-between py-2 border-b">
          <span class="text-gray-600">App Name</span>
          <span class="font-medium text-gray-800">{{ APP_CONFIG.APP_NAME }}</span>
        </div>
        <div class="flex justify-between py-2 border-b">
          <span class="text-gray-600">Version</span>
          <span class="font-medium text-gray-800">{{ APP_CONFIG.VERSION }}</span>
        </div>
        <div class="flex justify-between py-2 border-b">
          <span class="text-gray-600">Currency</span>
          <span class="font-medium text-gray-800">{{ APP_CONFIG.CURRENCY }} (INR)</span>
        </div>
        <div class="flex justify-between py-2">
          <span class="text-gray-600">Data Storage</span>
          <span class="font-medium text-gray-800">Google Sheets</span>
        </div>
      </div>
    </div>

    <!-- API Configuration Section -->
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="card-header mb-0">API Configuration</h2>
        <button
          @click="showApiInfo = !showApiInfo"
          class="text-sm text-primary-600 hover:text-primary-700"
        >
          {{ showApiInfo ? 'Hide' : 'Show' }} Details
        </button>
      </div>

      <div v-if="showApiInfo" class="space-y-4">
        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm text-gray-600 mb-2">Client ID (truncated):</p>
          <code class="text-xs bg-gray-200 px-2 py-1 rounded">
            {{ GOOGLE_CONFIG.CLIENT_ID.substring(0, 30) }}...
          </code>
        </div>

        <div class="bg-gray-50 rounded-lg p-4">
          <p class="text-sm text-gray-600 mb-2">OAuth Scopes:</p>
          <ul class="text-xs space-y-1">
            <li v-for="scope in GOOGLE_CONFIG.SCOPES.split(' ')" :key="scope" class="text-gray-700">
              • {{ scope.split('/').pop() }}
            </li>
          </ul>
        </div>
      </div>

      <div v-else class="text-sm text-gray-500">
        Click "Show Details" to view API configuration.
      </div>
    </div>

    <!-- Help Section -->
    <div class="card">
      <h2 class="card-header">Help & Resources</h2>
      
      <div class="space-y-3">
        <a
          href="https://github.com"
          target="_blank"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span class="text-gray-700">View on GitHub</span>
          </div>
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <a
          href="https://console.cloud.google.com"
          target="_blank"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            </svg>
            <span class="text-gray-700">Google Cloud Console</span>
          </div>
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        <a
          href="https://docs.google.com/spreadsheets"
          target="_blank"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div class="flex items-center space-x-3">
            <svg class="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
              <path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/>
            </svg>
            <span class="text-gray-700">Google Sheets</span>
          </div>
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>

    <!-- Copyright Footer -->
    <div class="text-center text-sm text-gray-500 mt-8 pb-8">
      <p>{{ APP_CONFIG.COPYRIGHT }}</p>
      <p class="text-xs mt-1">Developed by {{ APP_CONFIG.DEVELOPER }}</p>
    </div>

    <!-- Drive Import Modal -->
    <div v-if="showDriveImportModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between p-4 border-b">
          <div>
            <h3 class="text-lg font-semibold text-gray-800">Import Sheet from Google Drive</h3>
            <p class="text-xs text-gray-500 mt-1">Import your own sheets or shared sheets from others</p>
          </div>
          <button @click="showDriveImportModal = false" class="p-2 hover:bg-gray-100 rounded-lg">
            <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Filter Options -->
        <div class="px-4 py-3 border-b bg-gray-50">
          <div class="flex items-center space-x-4">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                v-model="showSharedSheetsOnly"
                class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span class="text-sm text-gray-700">Show shared with me only</span>
            </label>
            <span class="text-xs text-gray-500">
              {{ filteredDriveSheets.length }} of {{ driveSheets.length }} sheets
            </span>
          </div>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4">
          <div v-if="backupStore.isLoading" class="flex items-center justify-center py-12">
            <svg class="w-8 h-8 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="ml-2 text-gray-600">Loading sheets...</span>
          </div>

          <div v-else-if="filteredDriveSheets.length === 0" class="text-center py-12 text-gray-500">
            <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p v-if="showSharedSheetsOnly">No shared spreadsheets found</p>
            <p v-else>No spreadsheets found in your Google Drive</p>
          </div>

          <div v-else class="space-y-2">
            <div 
              v-for="sheet in filteredDriveSheets" 
              :key="sheet.id"
              class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-center space-x-3 flex-1 min-w-0">
                <svg class="w-8 h-8 text-green-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
                  <path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/>
                </svg>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-2">
                    <p class="font-medium text-gray-800 truncate">{{ sheet.name }}</p>
                    <!-- Permission Badge -->
                    <span 
                      class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                      :class="{
                        'bg-green-100 text-green-700': sheet.permission === 'owner',
                        'bg-blue-100 text-blue-700': sheet.permission === 'editor',
                        'bg-yellow-100 text-yellow-700': sheet.permission === 'commenter',
                        'bg-gray-100 text-gray-600': sheet.permission === 'viewer'
                      }"
                    >
                      {{ sheet.permission === 'owner' ? '👑 Owner' : 
                         sheet.permission === 'editor' ? '✏️ Edit' : 
                         sheet.permission === 'commenter' ? '💬 Comment' : '👁️ View' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500">
                    Modified: {{ new Date(sheet.modifiedTime).toLocaleDateString() }}
                    <span v-if="sheet.sharedBy" class="ml-2">• Shared by {{ sheet.sharedBy }}</span>
                  </p>
                </div>
              </div>
              <div class="flex items-center space-x-2 flex-shrink-0">
                <button 
                  @click="openFieldMapping(sheet)"
                  class="btn-secondary text-sm px-3 py-1.5"
                  title="Map fields before importing"
                >
                  Map Fields
                </button>
                <button 
                  @click="importFromDriveSheet(sheet.id)"
                  class="btn-primary text-sm px-3 py-1.5"
                  title="Quick import without mapping"
                >
                  Quick Import
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Field Mapping Modal -->
    <FieldMappingModal 
      :show="showFieldMappingModal"
      :sheetData="selectedSheetForMapping"
      @close="showFieldMappingModal = false; selectedSheetForMapping = null"
      @confirm="handleFieldMappingConfirm"
    />
  </div>
</template>
