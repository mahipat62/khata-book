<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  sheetData: {
    type: Object,
    default: () => ({
      name: '',
      columns: [],
      data: [],
      permission: 'viewer',
      canEdit: false
    })
  }
})

const emit = defineEmits(['close', 'confirm'])

// Standard fields that we expect in Dhanvika
const standardFields = [
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'party', label: 'Party Name', type: 'text', required: false },
  { key: 'description', label: 'Description', type: 'text', required: false },
  { key: 'credit', label: 'Credit (Money In)', type: 'number', required: false },
  { key: 'debit', label: 'Debit (Money Out)', type: 'number', required: false },
  { key: 'status', label: 'Status/Paid', type: 'boolean', required: false },
  { key: 'notes', label: 'Notes/Remarks', type: 'text', required: false }
]

// Field mappings - source column to standard field
const mappings = ref({})

// Initialize mappings based on suggested mappings from imported columns
watch(() => props.sheetData.columns, (columns) => {
  if (columns && columns.length > 0) {
    const newMappings = {}
    columns.forEach(col => {
      if (col.suggestedMapping) {
        newMappings[col.name] = col.suggestedMapping
      }
    })
    mappings.value = newMappings
  }
}, { immediate: true })

// New sheet name
const newSheetName = ref('')

watch(() => props.sheetData.name, (name) => {
  newSheetName.value = name ? `${name} (Imported)` : ''
}, { immediate: true })

// Import mode - 'view' (read-only link) or 'copy' (create new sheet)
const importMode = ref('copy')

// Preview data (first 5 rows)
const previewData = computed(() => {
  return props.sheetData.data?.slice(0, 5) || []
})

// Get mapped column for a standard field
function getMappedColumn(standardFieldKey) {
  return Object.entries(mappings.value)
    .find(([col, field]) => field === standardFieldKey)?.[0] || null
}

// Set mapping for a source column
function setMapping(sourceColumn, standardFieldKey) {
  // Remove existing mapping to this standard field
  Object.keys(mappings.value).forEach(col => {
    if (mappings.value[col] === standardFieldKey) {
      delete mappings.value[col]
    }
  })
  
  if (standardFieldKey) {
    mappings.value[sourceColumn] = standardFieldKey
  } else {
    delete mappings.value[sourceColumn]
  }
}

// Get available standard fields (not yet mapped)
function getAvailableFields(currentSourceColumn) {
  const usedFields = new Set(Object.values(mappings.value))
  // Always include the current mapping
  if (mappings.value[currentSourceColumn]) {
    usedFields.delete(mappings.value[currentSourceColumn])
  }
  return standardFields.filter(f => !usedFields.has(f.key))
}

// Validation
const isValid = computed(() => {
  // At least date or some meaningful column should be mapped
  const hasSomeMappings = Object.keys(mappings.value).length > 0
  const hasName = newSheetName.value.trim().length > 0
  return hasSomeMappings && hasName
})

// Confirm import
function confirmImport() {
  emit('confirm', {
    sheetName: newSheetName.value,
    mode: importMode.value,
    mappings: { ...mappings.value },
    sourceColumns: props.sheetData.columns,
    originalId: props.sheetData.id
  })
}

function close() {
  emit('close')
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b">
        <div>
          <h3 class="text-lg font-semibold text-gray-800">Import & Map Fields</h3>
          <p class="text-sm text-gray-500 mt-1">Map columns from "{{ sheetData.name }}" to Dhanvika fields</p>
        </div>
        <button @click="close" class="p-2 hover:bg-gray-100 rounded-lg">
          <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-6">
        <!-- Permission Badge -->
        <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
          <div class="flex items-center space-x-3">
            <span class="text-sm text-gray-600">Access Level:</span>
            <span 
              :class="{
                'bg-green-100 text-green-700': sheetData.permission === 'owner',
                'bg-blue-100 text-blue-700': sheetData.permission === 'editor',
                'bg-yellow-100 text-yellow-700': sheetData.permission === 'commenter',
                'bg-gray-100 text-gray-600': sheetData.permission === 'viewer'
              }"
              class="px-2 py-1 rounded-full text-xs font-medium"
            >
              {{ sheetData.permission === 'owner' ? '👑 Owner' : 
                 sheetData.permission === 'editor' ? '✏️ Editor' : 
                 sheetData.permission === 'commenter' ? '💬 Commenter' : '👁️ Viewer' }}
            </span>
          </div>
          <div class="text-sm text-gray-500">
            {{ sheetData.recordCount || 0 }} records found
          </div>
        </div>

        <!-- Import Mode -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700">Import Mode</label>
          <div class="flex flex-col sm:flex-row gap-3">
            <label 
              class="flex-1 flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors"
              :class="importMode === 'copy' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
            >
              <input type="radio" v-model="importMode" value="copy" class="mt-0.5" />
              <div>
                <div class="font-medium text-gray-800">Create Copy</div>
                <div class="text-sm text-gray-500">Create a new sheet in your account with the mapped data</div>
              </div>
            </label>
            <label 
              class="flex-1 flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors"
              :class="importMode === 'link' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'"
              :title="!sheetData.canEdit ? 'View only - cannot edit shared sheet' : ''"
            >
              <input type="radio" v-model="importMode" value="link" class="mt-0.5" />
              <div>
                <div class="font-medium text-gray-800 flex items-center">
                  Link to Original
                  <span v-if="!sheetData.canEdit" class="ml-2 text-xs text-yellow-600">(Read Only)</span>
                </div>
                <div class="text-sm text-gray-500">
                  Use the original sheet directly 
                  <span v-if="!sheetData.canEdit">(view only)</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- New Sheet Name (for copy mode) -->
        <div v-if="importMode === 'copy'" class="space-y-2">
          <label class="block text-sm font-medium text-gray-700">New Sheet Name</label>
          <input 
            type="text" 
            v-model="newSheetName"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter name for the new sheet"
          />
        </div>

        <!-- Field Mapping -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700">Column Mapping</label>
          <p class="text-sm text-gray-500">Map source columns to Dhanvika standard fields</p>
          
          <div class="border rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="text-left px-4 py-2 font-medium text-gray-600">Source Column</th>
                  <th class="text-left px-4 py-2 font-medium text-gray-600">Type</th>
                  <th class="text-left px-4 py-2 font-medium text-gray-600">Map To</th>
                  <th class="text-left px-4 py-2 font-medium text-gray-600">Sample</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="col in sheetData.columns" :key="col.name" class="hover:bg-gray-50">
                  <td class="px-4 py-3">
                    <span class="font-medium text-gray-800">{{ col.name }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <span 
                      class="px-2 py-0.5 rounded text-xs"
                      :class="{
                        'bg-blue-100 text-blue-700': col.type === 'text',
                        'bg-green-100 text-green-700': col.type === 'number',
                        'bg-purple-100 text-purple-700': col.type === 'date',
                        'bg-orange-100 text-orange-700': col.type === 'boolean'
                      }"
                    >
                      {{ col.type }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <select 
                      :value="mappings[col.name] || ''"
                      @change="setMapping(col.name, $event.target.value)"
                      class="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">— Skip —</option>
                      <option 
                        v-for="field in getAvailableFields(col.name)" 
                        :key="field.key" 
                        :value="field.key"
                        :selected="mappings[col.name] === field.key"
                      >
                        {{ field.label }}
                      </option>
                      <!-- Show current mapping even if "used" -->
                      <option 
                        v-if="mappings[col.name] && !getAvailableFields(col.name).find(f => f.key === mappings[col.name])"
                        :value="mappings[col.name]"
                        selected
                      >
                        {{ standardFields.find(f => f.key === mappings[col.name])?.label }}
                      </option>
                    </select>
                  </td>
                  <td class="px-4 py-3 text-gray-500 truncate max-w-[150px]">
                    {{ previewData[0]?.[col.name] || '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Data Preview -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700">Data Preview (First 5 rows)</label>
          <div class="border rounded-lg overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th 
                    v-for="col in sheetData.columns" 
                    :key="col.name"
                    class="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap"
                  >
                    {{ col.name }}
                    <span v-if="mappings[col.name]" class="text-primary-600 text-xs ml-1">
                      → {{ standardFields.find(f => f.key === mappings[col.name])?.label }}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="(row, idx) in previewData" :key="idx" class="hover:bg-gray-50">
                  <td 
                    v-for="col in sheetData.columns" 
                    :key="col.name"
                    class="px-3 py-2 text-gray-700 whitespace-nowrap"
                  >
                    {{ row[col.name] || '—' }}
                  </td>
                </tr>
                <tr v-if="previewData.length === 0">
                  <td :colspan="sheetData.columns.length" class="px-3 py-4 text-center text-gray-500">
                    No data to preview
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-between p-4 border-t bg-gray-50">
        <div class="text-sm text-gray-500">
          <span v-if="Object.keys(mappings).length === 0" class="text-yellow-600">
            ⚠️ No fields mapped yet
          </span>
          <span v-else class="text-green-600">
            ✓ {{ Object.keys(mappings).length }} field(s) mapped
          </span>
        </div>
        <div class="flex items-center space-x-3">
          <button 
            @click="close"
            class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            @click="confirmImport"
            :disabled="!isValid"
            class="btn-primary"
            :class="{ 'opacity-50 cursor-not-allowed': !isValid }"
          >
            {{ importMode === 'copy' ? 'Create Sheet' : 'Link Sheet' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
