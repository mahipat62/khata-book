import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GOOGLE_CONFIG, DEFAULT_COLUMNS } from '@/config/google'

// Local storage key for linked external sheets
const LINKED_SHEETS_KEY = 'dhanvika_linked_sheets'

export const useSheetsStore = defineStore('sheets', () => {
  // State
  const sheets = ref([])
  const currentSheet = ref(null)
  const currentData = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const syncStatus = ref('idle') // idle, syncing, synced, error
  const linkedSheetIds = ref([]) // IDs of externally linked sheets

  // Load linked sheet IDs from localStorage
  function loadLinkedSheets() {
    try {
      const saved = localStorage.getItem(LINKED_SHEETS_KEY)
      if (saved) {
        linkedSheetIds.value = JSON.parse(saved)
      }
    } catch (err) {
      console.error('Failed to load linked sheets:', err)
    }
  }

  // Save linked sheet IDs to localStorage
  function saveLinkedSheets() {
    try {
      localStorage.setItem(LINKED_SHEETS_KEY, JSON.stringify(linkedSheetIds.value))
    } catch (err) {
      console.error('Failed to save linked sheets:', err)
    }
  }

  // Add a sheet to linked list
  function addLinkedSheet(sheetId) {
    if (!linkedSheetIds.value.includes(sheetId)) {
      linkedSheetIds.value.push(sheetId)
      saveLinkedSheets()
    }
  }

  // Remove a sheet from linked list
  function removeLinkedSheet(sheetId) {
    linkedSheetIds.value = linkedSheetIds.value.filter(id => id !== sheetId)
    saveLinkedSheets()
  }

  // Computed
  const sheetCount = computed(() => sheets.value.length)

  // Get all Khata spreadsheets from Drive (including shared ones)
  async function fetchSheets() {
    isLoading.value = true
    error.value = null

    try {
      // Load linked sheets first
      loadLinkedSheets()

      // Query 1: Get all sheets with "Khata" in name (owned + shared)
      const khataResponse = await gapi.client.drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and name contains 'Khata'",
        fields: 'files(id, name, createdTime, modifiedTime, webViewLink, owners, capabilities, shared)',
        orderBy: 'modifiedTime desc',
        pageSize: 100
      })

      // Query 2: Get sheets shared with me (that might not have "Khata" in name)
      const sharedResponse = await gapi.client.drive.files.list({
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and sharedWithMe=true",
        fields: 'files(id, name, createdTime, modifiedTime, webViewLink, owners, capabilities, shared, sharingUser)',
        orderBy: 'modifiedTime desc',
        pageSize: 50
      })

      // Query 3: Get any specifically linked sheets by ID
      let linkedSheetsData = []
      if (linkedSheetIds.value.length > 0) {
        const linkedPromises = linkedSheetIds.value.map(async (id) => {
          try {
            const res = await gapi.client.drive.files.get({
              fileId: id,
              fields: 'id, name, createdTime, modifiedTime, webViewLink, owners, capabilities, shared'
            })
            return res.result
          } catch (err) {
            console.warn(`Could not fetch linked sheet ${id}:`, err)
            return null
          }
        })
        linkedSheetsData = (await Promise.all(linkedPromises)).filter(Boolean)
      }

      // Combine and deduplicate
      const allFiles = [
        ...(khataResponse.result.files || []),
        ...(sharedResponse.result.files || []),
        ...linkedSheetsData
      ]

      // Deduplicate by ID and enhance with metadata
      const uniqueSheets = new Map()
      allFiles.forEach(file => {
        if (!uniqueSheets.has(file.id)) {
          const isOwner = file.owners?.some(o => o.me) || false
          const isLinked = linkedSheetIds.value.includes(file.id)
          
          uniqueSheets.set(file.id, {
            ...file,
            isOwner,
            isShared: !isOwner,
            isLinked,
            canEdit: file.capabilities?.canEdit || isOwner,
            sharedBy: file.sharingUser?.displayName || null
          })
        }
      })

      sheets.value = Array.from(uniqueSheets.values())
        .sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime))
    } catch (err) {
      error.value = err.message || 'Failed to fetch sheets'
      console.error('Fetch sheets error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Create a new Khata spreadsheet
  async function createSheet(name, columns = DEFAULT_COLUMNS) {
    isLoading.value = true
    error.value = null

    try {
      // Create spreadsheet with two sheets: Records and _Settings (hidden)
      const response = await gapi.client.sheets.spreadsheets.create({
        properties: {
          title: `Khata - ${name}`
        },
        sheets: [
          {
            properties: {
              title: 'Records',
              gridProperties: {
                frozenRowCount: 1
              }
            }
          },
          {
            properties: {
              title: '_Settings',
              hidden: true
            }
          }
        ]
      })

      const spreadsheetId = response.result.spreadsheetId
      // Get the actual sheet ID from the response
      const sheetId = response.result.sheets[0].properties.sheetId

      // Add header row
      const headerValues = columns.map(col => col.name)
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Records!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [headerValues]
        }
      })

      // Format header row
      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.4, blue: 0.9 },
                    textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)'
              }
            },
            {
              updateSheetProperties: {
                properties: {
                  sheetId: sheetId,
                  gridProperties: { frozenRowCount: 1 }
                },
                fields: 'gridProperties.frozenRowCount'
              }
            }
          ]
        }
      })

      // Save column configuration to _Settings sheet
      await saveColumnConfig(spreadsheetId, columns)

      // Refresh sheets list
      await fetchSheets()

      return spreadsheetId
    } catch (err) {
      error.value = err.message || 'Failed to create sheet'
      console.error('Create sheet error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Save column configuration to the hidden _Settings sheet
  async function saveColumnConfig(spreadsheetId, columns) {
    try {
      const configData = JSON.stringify(columns)
      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: '_Settings!A1',
        valueInputOption: 'RAW',
        resource: {
          values: [['COLUMN_CONFIG', configData]]
        }
      })
    } catch (err) {
      console.error('Failed to save column config:', err)
    }
  }

  // Get column configuration from the sheet's header row
  async function getColumnConfig(spreadsheetId) {
    try {
      // First, try to read from _Settings sheet
      try {
        const settingsResponse = await gapi.client.sheets.spreadsheets.values.get({
          spreadsheetId,
          range: '_Settings!A1:B1'
        })
        
        const settingsData = settingsResponse.result.values?.[0]
        if (settingsData && settingsData[0] === 'COLUMN_CONFIG' && settingsData[1]) {
          const savedColumns = JSON.parse(settingsData[1])
          if (Array.isArray(savedColumns) && savedColumns.length > 0) {
            return savedColumns
          }
        }
      } catch (settingsErr) {
        // _Settings sheet might not exist for older sheets, continue with inference
        console.log('No _Settings sheet found, inferring columns from headers')
      }

      // Read the header row to get column names
      const headerResponse = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Records!1:1'
      })

      const headers = headerResponse.result.values?.[0] || []
      
      if (headers.length === 0) {
        return DEFAULT_COLUMNS
      }

      // Try to match headers to default columns for type inference
      const columns = headers.map(header => {
        // Check if this header matches any default column
        const defaultCol = DEFAULT_COLUMNS.find(col => 
          col.name.toLowerCase() === header.toLowerCase()
        )
        
        if (defaultCol) {
          return { ...defaultCol, name: header }
        }

        // Infer type from common patterns
        const headerLower = header.toLowerCase()
        let type = 'text'
        
        if (headerLower.includes('date') || headerLower.includes('time')) {
          type = 'date'
        } else if (headerLower.includes('amount') || headerLower.includes('price') || 
                   headerLower.includes('cost') || headerLower.includes('total') ||
                   headerLower.includes('rate') || headerLower.includes('quantity') ||
                   headerLower.includes('number')) {
          type = 'number'
        } else if (headerLower.includes('paid') || headerLower.includes('active') || 
                   headerLower.includes('completed') || headerLower.includes('done') ||
                   headerLower.includes('received') || headerLower.includes('pending') ||
                   headerLower.includes('status') || headerLower === 'is' || 
                   headerLower.startsWith('is_')) {
          type = 'boolean'
        }

        return {
          name: header,
          type,
          required: false
        }
      })

      return columns
    } catch (err) {
      console.error('Failed to get column config:', err)
      return DEFAULT_COLUMNS
    }
  }

  // Load sheet data
  async function loadSheet(spreadsheetId) {
    isLoading.value = true
    syncStatus.value = 'syncing'
    error.value = null

    try {
      // Get spreadsheet metadata
      const metaResponse = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false
      })

      currentSheet.value = {
        id: spreadsheetId,
        name: metaResponse.result.properties.title,
        url: metaResponse.result.spreadsheetUrl
      }

      // Get column config
      const columns = await getColumnConfig(spreadsheetId)
      currentSheet.value.columns = columns

      // Get all data
      const dataResponse = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Records!A:Z'
      })

      const values = dataResponse.result.values || []
      
      if (values.length > 1) {
        const headers = values[0]
        currentData.value = values.slice(1).map((row, index) => {
          const record = { _rowIndex: index + 2 } // +2 because of 0-index and header row
          headers.forEach((header, i) => {
            record[header] = row[i] || ''
          })
          return record
        })
      } else {
        currentData.value = []
      }

      syncStatus.value = 'synced'
    } catch (err) {
      error.value = err.message || 'Failed to load sheet'
      syncStatus.value = 'error'
      console.error('Load sheet error:', err)
    } finally {
      isLoading.value = false
    }
  }

  // Add a new record
  async function addRecord(spreadsheetId, record) {
    syncStatus.value = 'syncing'

    try {
      const columns = currentSheet.value?.columns || DEFAULT_COLUMNS
      const values = columns.map(col => record[col.name] || '')

      await gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Records!A:Z',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values: [values]
        }
      })

      // Refresh data
      await loadSheet(spreadsheetId)
      syncStatus.value = 'synced'
    } catch (err) {
      error.value = err.message || 'Failed to add record'
      syncStatus.value = 'error'
      console.error('Add record error:', err)
      throw err
    }
  }

  // Update a record
  async function updateRecord(spreadsheetId, rowIndex, record) {
    syncStatus.value = 'syncing'

    try {
      const columns = currentSheet.value?.columns || DEFAULT_COLUMNS
      const values = columns.map(col => record[col.name] || '')

      await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Records!A${rowIndex}:${String.fromCharCode(64 + columns.length)}${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [values]
        }
      })

      // Refresh data
      await loadSheet(spreadsheetId)
      syncStatus.value = 'synced'
    } catch (err) {
      error.value = err.message || 'Failed to update record'
      syncStatus.value = 'error'
      console.error('Update record error:', err)
      throw err
    }
  }

  // Delete a record
  async function deleteRecord(spreadsheetId, rowIndex) {
    syncStatus.value = 'syncing'

    try {
      // Get sheet ID
      const metaResponse = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false
      })

      const sheetId = metaResponse.result.sheets.find(s => s.properties.title === 'Records')?.properties.sheetId || 0

      await gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex
              }
            }
          }]
        }
      })

      // Refresh data
      await loadSheet(spreadsheetId)
      syncStatus.value = 'synced'
    } catch (err) {
      error.value = err.message || 'Failed to delete record'
      syncStatus.value = 'error'
      console.error('Delete record error:', err)
      throw err
    }
  }

  // Delete a sheet
  async function deleteSheet(spreadsheetId) {
    isLoading.value = true

    try {
      await gapi.client.drive.files.delete({
        fileId: spreadsheetId
      })

      await fetchSheets()
    } catch (err) {
      error.value = err.message || 'Failed to delete sheet'
      console.error('Delete sheet error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Rename sheet
  async function renameSheet(spreadsheetId, newName) {
    isLoading.value = true

    try {
      await gapi.client.drive.files.update({
        fileId: spreadsheetId,
        resource: {
          name: newName
        }
      })

      await fetchSheets()
    } catch (err) {
      error.value = err.message || 'Failed to rename sheet'
      console.error('Rename sheet error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Duplicate sheet (backup)
  async function duplicateSheet(spreadsheetId, newName) {
    isLoading.value = true

    try {
      const response = await gapi.client.drive.files.copy({
        fileId: spreadsheetId,
        resource: {
          name: newName || `Backup - ${new Date().toISOString()}`
        }
      })

      await fetchSheets()
      return response.result.id
    } catch (err) {
      error.value = err.message || 'Failed to duplicate sheet'
      console.error('Duplicate sheet error:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Clear state
  function clearState() {
    sheets.value = []
    currentSheet.value = null
    currentData.value = []
    error.value = null
    syncStatus.value = 'idle'
  }

  return {
    // State
    sheets,
    currentSheet,
    currentData,
    isLoading,
    error,
    syncStatus,
    linkedSheetIds,
    // Computed
    sheetCount,
    // Actions
    fetchSheets,
    createSheet,
    loadSheet,
    addRecord,
    updateRecord,
    deleteRecord,
    deleteSheet,
    renameSheet,
    duplicateSheet,
    getColumnConfig,
    addLinkedSheet,
    removeLinkedSheet,
    clearState
  }
})
