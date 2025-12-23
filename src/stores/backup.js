import { defineStore } from 'pinia'
import { ref } from 'vue'
import { GOOGLE_CONFIG } from '@/config/google'

export const useBackupStore = defineStore('backup', () => {
  // State
  const isLoading = ref(false)
  const error = ref(null)
  const lastBackup = ref(null)
  const backupFileId = ref(null)

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

  // List all spreadsheets from Google Drive (for import)
  async function listDriveSpreadsheets() {
    isLoading.value = true
    error.value = null

    try {
      const response = await gapi.client.drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: 'files(id, name, createdTime, modifiedTime, webViewLink)',
        orderBy: 'modifiedTime desc',
        pageSize: 50
      })

      return response.result.files || []
    } catch (err) {
      error.value = err.message || 'Failed to list spreadsheets'
      console.error('List spreadsheets error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Import sheet from Google Drive by ID
  async function importSheetFromDrive(spreadsheetId) {
    isLoading.value = true
    error.value = null

    try {
      // Get spreadsheet metadata
      const metaResponse = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false
      })

      const sheetName = metaResponse.result.properties.title

      // Get first sheet data
      const firstSheetTitle = metaResponse.result.sheets[0]?.properties.title || 'Sheet1'
      
      const dataResponse = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${firstSheetTitle}!A:Z`
      })

      const values = dataResponse.result.values || []
      
      if (values.length === 0) {
        return { name: sheetName, columns: [], data: [] }
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
        
        if (headerLower.includes('date') || headerLower.includes('time')) {
          type = 'date'
        } else if (headerLower.includes('amount') || headerLower.includes('price') || 
                   headerLower.includes('cost') || headerLower.includes('total') ||
                   headerLower.includes('number') || headerLower.includes('quantity')) {
          type = 'number'
        } else if (headerLower.includes('paid') || headerLower.includes('active') || 
                   headerLower.includes('completed') || headerLower.includes('done')) {
          type = 'boolean'
        }

        return { name: header, type, required: false }
      })

      return {
        id: spreadsheetId,
        name: sheetName,
        columns,
        data,
        url: metaResponse.result.spreadsheetUrl
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
    // Actions
    saveToGoogleDrive,
    loadFromGoogleDrive,
    exportToJsonFile,
    importFromJsonFile,
    listDriveSpreadsheets,
    importSheetFromDrive,
    checkBackupStatus,
    getOrCreateAppFolder
  }
})
