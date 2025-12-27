import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GOOGLE_CONFIG } from '@/config/google'

// Auto backup settings storage key
const AUTO_BACKUP_KEY = 'dhanvika_auto_backup_settings'

export const useBackupStore = defineStore('backup', () => {
  // State
  const isLoading = ref(false)
  const error = ref(null)
  const lastBackup = ref(null)
  const backupFileId = ref(null)
  
  // Auto backup state
  const autoBackupSettings = ref({
    enabled: false,
    frequency: 'weekly', // 'daily', 'weekly', 'monthly'
    lastAutoBackup: null
  })

  // Load auto backup settings from localStorage
  function loadAutoBackupSettings() {
    try {
      const saved = localStorage.getItem(AUTO_BACKUP_KEY)
      if (saved) {
        autoBackupSettings.value = JSON.parse(saved)
      }
    } catch (err) {
      console.error('Failed to load auto backup settings:', err)
    }
  }

  // Save auto backup settings to localStorage
  function saveAutoBackupSettings() {
    try {
      localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(autoBackupSettings.value))
    } catch (err) {
      console.error('Failed to save auto backup settings:', err)
    }
  }

  // Update auto backup settings
  function updateAutoBackupSettings(settings) {
    autoBackupSettings.value = { ...autoBackupSettings.value, ...settings }
    saveAutoBackupSettings()
  }

  // Check if auto backup is needed based on frequency
  function isAutoBackupNeeded() {
    if (!autoBackupSettings.value.enabled) return false
    
    const lastBackupTime = autoBackupSettings.value.lastAutoBackup
    if (!lastBackupTime) return true
    
    const now = new Date()
    const lastBackupDate = new Date(lastBackupTime)
    const diffMs = now - lastBackupDate
    const diffDays = diffMs / (1000 * 60 * 60 * 24)
    
    switch (autoBackupSettings.value.frequency) {
      case 'daily':
        return diffDays >= 1
      case 'weekly':
        return diffDays >= 7
      case 'monthly':
        return diffDays >= 30
      default:
        return false
    }
  }

  // Perform auto backup if needed (called on app mount)
  async function performAutoBackupIfNeeded(data) {
    loadAutoBackupSettings()
    
    if (!isAutoBackupNeeded()) {
      console.log('Auto backup not needed yet')
      return { performed: false, reason: 'not_due' }
    }
    
    try {
      console.log('Performing scheduled auto backup...')
      await saveToGoogleDrive(data)
      autoBackupSettings.value.lastAutoBackup = new Date().toISOString()
      saveAutoBackupSettings()
      console.log('Auto backup completed successfully')
      return { performed: true, success: true }
    } catch (err) {
      console.error('Auto backup failed:', err)
      return { performed: true, success: false, error: err.message }
    }
  }

  // Get next backup date based on frequency
  const nextBackupDate = computed(() => {
    if (!autoBackupSettings.value.enabled || !autoBackupSettings.value.lastAutoBackup) {
      return null
    }
    
    const lastBackupDate = new Date(autoBackupSettings.value.lastAutoBackup)
    const nextDate = new Date(lastBackupDate)
    
    switch (autoBackupSettings.value.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1)
        break
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7)
        break
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1)
        break
    }
    
    return nextDate
  })

  // Get or create app data folder in Google Drive
  async function getOrCreateAppFolder() {
    try {
      // Search for existing folder
      const response = await gapi.client.drive.files.list({
        q: `name='${GOOGLE_CONFIG.APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive'
      })

      if (response.result.files && response.result.files.length > 0) {
        return response.result.files[0].id
      }

      // Create folder if not exists
      const createResponse = await gapi.client.drive.files.create({
        resource: {
          name: GOOGLE_CONFIG.APP_FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      })

      return createResponse.result.id
    } catch (err) {
      console.error('Failed to get/create app folder:', err)
      throw err
    }
  }

  // Find backup file in app folder
  async function findBackupFile(folderId) {
    try {
      const response = await gapi.client.drive.files.list({
        q: `name='${GOOGLE_CONFIG.BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, modifiedTime)',
        spaces: 'drive'
      })

      if (response.result.files && response.result.files.length > 0) {
        const file = response.result.files[0]
        backupFileId.value = file.id
        lastBackup.value = file.modifiedTime
        return file
      }

      return null
    } catch (err) {
      console.error('Failed to find backup file:', err)
      throw err
    }
  }

  // Save data to Google Drive
  async function saveToGoogleDrive(data) {
    isLoading.value = true
    error.value = null

    try {
      const folderId = await getOrCreateAppFolder()
      const existingFile = await findBackupFile(folderId)

      const metadata = {
        name: GOOGLE_CONFIG.BACKUP_FILE_NAME,
        mimeType: 'application/json'
      }

      if (!existingFile) {
        metadata.parents = [folderId]
      }

      const jsonContent = JSON.stringify({
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        appName: 'Dhanvika Vyavasāya',
        data: data
      }, null, 2)

      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('file', new Blob([jsonContent], { type: 'application/json' }))

      const token = gapi.client.getToken().access_token
      const url = existingFile
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

      const response = await fetch(url, {
        method: existingFile ? 'PATCH' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: form
      })

      if (!response.ok) {
        throw new Error('Failed to save backup to Google Drive')
      }

      const result = await response.json()
      backupFileId.value = result.id
      lastBackup.value = new Date().toISOString()

      return result
    } catch (err) {
      error.value = err.message || 'Failed to save backup'
      console.error('Save to Google Drive error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Load data from Google Drive
  async function loadFromGoogleDrive() {
    isLoading.value = true
    error.value = null

    try {
      const folderId = await getOrCreateAppFolder()
      const existingFile = await findBackupFile(folderId)

      if (!existingFile) {
        return null
      }

      const token = gapi.client.getToken().access_token
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to load backup from Google Drive')
      }

      const data = await response.json()
      lastBackup.value = existingFile.modifiedTime

      return data
    } catch (err) {
      error.value = err.message || 'Failed to load backup'
      console.error('Load from Google Drive error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Export database to JSON file (download)
  function exportToJsonFile(data, filename = 'dhanvika_export.json') {
    const jsonContent = JSON.stringify({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      appName: 'Dhanvika Vyavasāya',
      data: data
    }, null, 2)

    const blob = new Blob([jsonContent], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Import database from JSON file
  async function importFromJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          resolve(data)
        } catch (err) {
          reject(new Error('Invalid JSON file'))
        }
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  // List all spreadsheets from Google Drive (for import) - includes shared sheets
  async function listDriveSpreadsheets(includeShared = true) {
    isLoading.value = true
    error.value = null

    try {
      // Query for spreadsheets - owned OR shared with me
      const query = includeShared
        ? "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
        : "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and 'me' in owners"
      
      const response = await gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, createdTime, modifiedTime, webViewLink, owners, permissions, capabilities, shared, sharingUser)',
        orderBy: 'modifiedTime desc',
        pageSize: 100
      })

      const files = response.result.files || []
      
      // Get current user email for ownership check
      const userResponse = await gapi.client.oauth2?.userinfo?.get() || null
      const currentUserEmail = userResponse?.result?.email?.toLowerCase() || ''
      
      // Enhance each file with permission info
      const enhancedFiles = files.map(file => {
        const isOwner = file.owners?.some(o => o.me) || false
        
        // Determine permission level
        let permission = 'viewer'
        if (isOwner) {
          permission = 'owner'
        } else if (file.capabilities?.canEdit) {
          permission = 'editor'
        } else if (file.capabilities?.canComment) {
          permission = 'commenter'
        }
        
        return {
          ...file,
          isOwner,
          permission,
          sharedBy: file.sharingUser?.displayName || null
        }
      })

      return enhancedFiles
    } catch (err) {
      error.value = err.message || 'Failed to list spreadsheets'
      console.error('List spreadsheets error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Import sheet from Google Drive by ID (with permission info for field mapping)
  async function importSheetFromDrive(spreadsheetId, sheetPermission = 'owner') {
    isLoading.value = true
    error.value = null

    try {
      // Get spreadsheet metadata
      const metaResponse = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false
      })

      const sheetName = metaResponse.result.properties.title

      // Get all sheet tabs
      const sheetTabs = metaResponse.result.sheets?.map(s => ({
        title: s.properties.title,
        sheetId: s.properties.sheetId,
        index: s.properties.index
      })) || []

      // Get first sheet data (excluding _Settings if exists)
      const firstDataSheet = sheetTabs.find(s => s.title !== '_Settings') || sheetTabs[0]
      const firstSheetTitle = firstDataSheet?.title || 'Sheet1'
      
      const dataResponse = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${firstSheetTitle}!A:Z`
      })

      const values = dataResponse.result.values || []
      
      if (values.length === 0) {
        return { 
          name: sheetName, 
          columns: [], 
          data: [],
          permission: sheetPermission,
          canEdit: sheetPermission === 'owner' || sheetPermission === 'editor',
          sheetTabs
        }
      }

      const headers = values[0]
      const data = values.slice(1).map((row, index) => {
        const record = { _rowIndex: index + 2 }
        headers.forEach((header, i) => {
          record[header] = row[i] || ''
        })
        return record
      })

      // Infer column types
      const columns = headers.map(header => {
        const headerLower = header.toLowerCase()
        let type = 'text'
        let suggestedMapping = null
        
        // Date detection
        if (headerLower.includes('date') || headerLower.includes('time') || 
            headerLower === 'created' || headerLower === 'updated') {
          type = 'date'
          suggestedMapping = 'date'
        } 
        // Amount/Number detection
        else if (headerLower.includes('amount') || headerLower.includes('price') || 
                 headerLower.includes('cost') || headerLower.includes('total') ||
                 headerLower.includes('number') || headerLower.includes('quantity') ||
                 headerLower.includes('credit') || headerLower.includes('debit')) {
          type = 'number'
          if (headerLower.includes('credit')) suggestedMapping = 'credit'
          else if (headerLower.includes('debit')) suggestedMapping = 'debit'
          else suggestedMapping = 'amount'
        } 
        // Boolean detection
        else if (headerLower.includes('paid') || headerLower.includes('active') || 
                 headerLower.includes('completed') || headerLower.includes('done') ||
                 headerLower.includes('status') || headerLower.includes('received')) {
          type = 'boolean'
          suggestedMapping = 'status'
        }
        // Name/Description detection
        else if (headerLower.includes('name') || headerLower.includes('party') ||
                 headerLower.includes('customer') || headerLower.includes('vendor')) {
          suggestedMapping = 'party'
        }
        else if (headerLower.includes('description') || headerLower.includes('detail') ||
                 headerLower.includes('remark') || headerLower.includes('note')) {
          suggestedMapping = 'description'
        }

        return { 
          name: header, 
          type, 
          required: false,
          suggestedMapping
        }
      })

      return {
        id: spreadsheetId,
        name: sheetName,
        columns,
        data,
        url: metaResponse.result.spreadsheetUrl,
        permission: sheetPermission,
        canEdit: sheetPermission === 'owner' || sheetPermission === 'editor',
        sheetTabs,
        recordCount: data.length
      }
    } catch (err) {
      error.value = err.message || 'Failed to import sheet'
      console.error('Import sheet error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Check backup status
  async function checkBackupStatus() {
    try {
      const folderId = await getOrCreateAppFolder()
      const file = await findBackupFile(folderId)
      return file ? { exists: true, lastModified: file.modifiedTime } : { exists: false }
    } catch (err) {
      return { exists: false, error: err.message }
    }
  }

  return {
    // State
    isLoading,
    error,
    lastBackup,
    backupFileId,
    autoBackupSettings,
    nextBackupDate,
    // Actions
    saveToGoogleDrive,
    loadFromGoogleDrive,
    exportToJsonFile,
    importFromJsonFile,
    listDriveSpreadsheets,
    importSheetFromDrive,
    checkBackupStatus,
    getOrCreateAppFolder,
    // Auto backup
    loadAutoBackupSettings,
    updateAutoBackupSettings,
    isAutoBackupNeeded,
    performAutoBackupIfNeeded
  }
})
