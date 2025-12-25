<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useSheetsStore } from '@/stores/sheets'
import { useToastStore } from '@/stores/toast'
import { APP_CONFIG } from '@/config/google'

const sheetsStore = useSheetsStore()
const toastStore = useToastStore()

const isLoading = ref(true)
const selectedSheets = ref([])
const dateFilter = ref('all') // all, daily, weekly, monthly, yearly
const customStartDate = ref('')
const customEndDate = ref('')

const currency = APP_CONFIG.CURRENCY

onMounted(async () => {
  try {
    await sheetsStore.fetchSheets()
    // Select first sheet by default
    if (sheetsStore.sheets.length > 0) {
      selectedSheets.value = [sheetsStore.sheets[0].id]
    }
  } catch (error) {
    toastStore.error('Failed to load sheets')
  } finally {
    isLoading.value = false
  }
})

// Load data for selected sheets
const allData = ref([])
const loadingData = ref(false)

watch(selectedSheets, async () => {
  await loadSelectedSheetsData()
}, { deep: true })

async function loadSelectedSheetsData() {
  if (selectedSheets.value.length === 0) {
    allData.value = []
    return
  }

  loadingData.value = true
  const combinedData = []

  for (const sheetId of selectedSheets.value) {
    try {
      await sheetsStore.loadSheet(sheetId)
      const sheetName = sheetsStore.currentSheet?.name || 'Unknown'
      const data = sheetsStore.currentData.map(row => ({
        ...row,
        _sheetName: sheetName,
        _sheetId: sheetId
      }))
      combinedData.push(...data)
    } catch (error) {
      console.error('Failed to load sheet:', sheetId)
    }
  }

  allData.value = combinedData
  loadingData.value = false
}

// Filter data based on date
const filteredData = computed(() => {
  let data = allData.value
  
  if (dateFilter.value === 'all') return data
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  return data.filter(row => {
    const dateStr = row['Date']
    if (!dateStr) return false
    
    const rowDate = new Date(dateStr)
    if (isNaN(rowDate.getTime())) return false
    
    switch (dateFilter.value) {
      case 'daily':
        return rowDate >= today
      case 'weekly':
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        return rowDate >= weekAgo
      case 'monthly':
        const monthAgo = new Date(today)
        monthAgo.setMonth(monthAgo.getMonth() - 1)
        return rowDate >= monthAgo
      case 'yearly':
        const yearAgo = new Date(today)
        yearAgo.setFullYear(yearAgo.getFullYear() - 1)
        return rowDate >= yearAgo
      case 'custom':
        const start = customStartDate.value ? new Date(customStartDate.value) : new Date(0)
        const end = customEndDate.value ? new Date(customEndDate.value) : new Date()
        return rowDate >= start && rowDate <= end
      default:
        return true
    }
  })
})

// Calculate analytics
const analytics = computed(() => {
  const data = filteredData.value
  
  const totalEarning = data
    .filter(row => row['Type'] === 'Credit')
    .reduce((sum, row) => sum + (parseFloat(row['Amount']) || 0), 0)
  
  const totalExpenditure = data
    .filter(row => row['Type'] === 'Debit')
    .reduce((sum, row) => sum + (parseFloat(row['Amount']) || 0), 0)
  
  const netBalance = totalEarning - totalExpenditure
  
  // Group by date for chart
  const dailyData = {}
  data.forEach(row => {
    const date = row['Date']
    if (!date) return
    
    if (!dailyData[date]) {
      dailyData[date] = { earning: 0, expenditure: 0 }
    }
    
    const amount = parseFloat(row['Amount']) || 0
    if (row['Type'] === 'Credit') {
      dailyData[date].earning += amount
    } else {
      dailyData[date].expenditure += amount
    }
  })
  
  // Sort dates and get chart data
  const sortedDates = Object.keys(dailyData).sort()
  const chartLabels = sortedDates.slice(-30) // Last 30 entries
  const earningData = chartLabels.map(d => dailyData[d].earning)
  const expenditureData = chartLabels.map(d => dailyData[d].expenditure)
  
  // Calculate percentages for pie chart
  const total = totalEarning + totalExpenditure
  const earningPercent = total > 0 ? (totalEarning / total * 100).toFixed(1) : 0
  const expenditurePercent = total > 0 ? (totalExpenditure / total * 100).toFixed(1) : 0
  
  // Top categories/persons
  const personTotals = {}
  data.forEach(row => {
    const person = row['Person Name'] || 'Unknown'
    const amount = parseFloat(row['Amount']) || 0
    const type = row['Type']
    
    if (!personTotals[person]) {
      personTotals[person] = { earning: 0, expenditure: 0 }
    }
    
    if (type === 'Credit') {
      personTotals[person].earning += amount
    } else {
      personTotals[person].expenditure += amount
    }
  })
  
  const topEarners = Object.entries(personTotals)
    .map(([name, data]) => ({ name, amount: data.earning }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
  
  const topSpenders = Object.entries(personTotals)
    .map(([name, data]) => ({ name, amount: data.expenditure }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
  
  return {
    totalEarning,
    totalExpenditure,
    netBalance,
    earningPercent,
    expenditurePercent,
    chartLabels,
    earningData,
    expenditureData,
    topEarners,
    topSpenders,
    totalRecords: data.length
  }
})

function formatAmount(amount) {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toggleSheetSelection(sheetId) {
  const index = selectedSheets.value.indexOf(sheetId)
  if (index > -1) {
    selectedSheets.value.splice(index, 1)
  } else {
    selectedSheets.value.push(sheetId)
  }
}

function selectAllSheets() {
  selectedSheets.value = sheetsStore.sheets.map(s => s.id)
}

function clearSelection() {
  selectedSheets.value = []
}

// Simple bar chart using CSS
const maxChartValue = computed(() => {
  const allValues = [...analytics.value.earningData, ...analytics.value.expenditureData]
  return Math.max(...allValues, 1)
})

function getBarHeight(value) {
  return (value / maxChartValue.value * 100).toFixed(1)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl sm:text-2xl font-bold text-gray-800">Analytics</h1>
      <p class="text-sm text-gray-500">View your financial insights across multiple sheets</p>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <svg class="w-12 h-12 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>

    <template v-else>
      <!-- Filters Section -->
      <div class="card mb-6">
        <div class="flex flex-col lg:flex-row lg:items-center gap-4">
          <!-- Sheet Selection -->
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">Select Sheets</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="sheet in sheetsStore.sheets"
                :key="sheet.id"
                @click="toggleSheetSelection(sheet.id)"
                :class="[
                  'px-3 py-1.5 text-sm rounded-full border transition-colors',
                  selectedSheets.includes(sheet.id)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                ]"
              >
                {{ sheet.name.replace('Khata - ', '') }}
              </button>
              <button @click="selectAllSheets" class="px-3 py-1.5 text-sm text-primary-600 hover:underline">
                Select All
              </button>
              <button @click="clearSelection" class="px-3 py-1.5 text-sm text-gray-500 hover:underline">
                Clear
              </button>
            </div>
          </div>

          <!-- Date Filter -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
            <select v-model="dateFilter" class="form-select text-sm border-gray-300 rounded-lg">
              <option value="all">All Time</option>
              <option value="daily">Today</option>
              <option value="weekly">Last 7 Days</option>
              <option value="monthly">Last 30 Days</option>
              <option value="yearly">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <!-- Custom Date Range -->
          <div v-if="dateFilter === 'custom'" class="flex gap-2">
            <input
              v-model="customStartDate"
              type="date"
              class="form-input text-sm border-gray-300 rounded-lg"
              placeholder="Start Date"
            />
            <input
              v-model="customEndDate"
              type="date"
              class="form-input text-sm border-gray-300 rounded-lg"
              placeholder="End Date"
            />
          </div>
        </div>
      </div>

      <!-- Loading Data -->
      <div v-if="loadingData" class="flex items-center justify-center py-12">
        <svg class="w-8 h-8 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <span class="ml-2 text-gray-600">Loading data...</span>
      </div>

      <!-- Analytics Content -->
      <template v-else-if="selectedSheets.length > 0">
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
            <p class="text-green-100 text-sm uppercase tracking-wide">Total Earning</p>
            <p class="text-3xl font-bold mt-2">{{ currency }}{{ formatAmount(analytics.totalEarning) }}</p>
            <p class="text-green-200 text-sm mt-1">{{ analytics.earningPercent }}% of total</p>
          </div>
          
          <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-lg">
            <p class="text-red-100 text-sm uppercase tracking-wide">Total Expenditure</p>
            <p class="text-3xl font-bold mt-2">{{ currency }}{{ formatAmount(analytics.totalExpenditure) }}</p>
            <p class="text-red-200 text-sm mt-1">{{ analytics.expenditurePercent }}% of total</p>
          </div>
          
          <div :class="[
            'rounded-xl p-5 text-white shadow-lg',
            analytics.netBalance >= 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-orange-500 to-orange-600'
          ]">
            <p class="text-white/80 text-sm uppercase tracking-wide">Net Balance</p>
            <p class="text-3xl font-bold mt-2">
              {{ analytics.netBalance >= 0 ? '+' : '' }}{{ currency }}{{ formatAmount(analytics.netBalance) }}
            </p>
            <p class="text-white/70 text-sm mt-1">{{ analytics.totalRecords }} records analyzed</p>
          </div>
        </div>

        <!-- Charts Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Bar Chart -->
          <div class="card">
            <h3 class="card-header">Earning vs Expenditure Trend</h3>
            <div class="h-64 flex items-end justify-around gap-1 px-2">
              <div v-for="(label, idx) in analytics.chartLabels.slice(-15)" :key="label" class="flex flex-col items-center flex-1">
                <div class="flex gap-0.5 w-full justify-center h-48">
                  <div
                    class="w-2 sm:w-3 bg-green-500 rounded-t transition-all"
                    :style="{ height: getBarHeight(analytics.earningData[analytics.chartLabels.indexOf(label)]) + '%' }"
                    :title="'Earning: ' + currency + formatAmount(analytics.earningData[analytics.chartLabels.indexOf(label)])"
                  ></div>
                  <div
                    class="w-2 sm:w-3 bg-red-500 rounded-t transition-all"
                    :style="{ height: getBarHeight(analytics.expenditureData[analytics.chartLabels.indexOf(label)]) + '%' }"
                    :title="'Expenditure: ' + currency + formatAmount(analytics.expenditureData[analytics.chartLabels.indexOf(label)])"
                  ></div>
                </div>
                <span class="text-[8px] sm:text-xs text-gray-500 mt-1 rotate-45 origin-left whitespace-nowrap">
                  {{ label.slice(5) }}
                </span>
              </div>
            </div>
            <div class="flex justify-center gap-4 mt-4 text-sm">
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-green-500 rounded"></div>
                <span class="text-gray-600">Earning</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-3 h-3 bg-red-500 rounded"></div>
                <span class="text-gray-600">Expenditure</span>
              </div>
            </div>
          </div>

          <!-- Pie Chart (CSS based) -->
          <div class="card">
            <h3 class="card-header">Distribution</h3>
            <div class="flex items-center justify-center py-8">
              <div class="relative w-48 h-48">
                <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="#e5e7eb"
                    stroke-width="20"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="#22c55e"
                    stroke-width="20"
                    :stroke-dasharray="`${analytics.earningPercent * 2.51} 251`"
                    stroke-linecap="round"
                  />
                  <circle
                    cx="50" cy="50" r="40"
                    fill="none"
                    stroke="#ef4444"
                    stroke-width="20"
                    :stroke-dasharray="`${analytics.expenditurePercent * 2.51} 251`"
                    :stroke-dashoffset="`-${analytics.earningPercent * 2.51}`"
                    stroke-linecap="round"
                  />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                  <div class="text-center">
                    <p class="text-2xl font-bold text-gray-800">
                      {{ analytics.netBalance >= 0 ? '+' : '' }}{{ ((analytics.netBalance / (analytics.totalEarning || 1)) * 100).toFixed(0) }}%
                    </p>
                    <p class="text-xs text-gray-500">Net Margin</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="flex justify-center gap-6 text-sm">
              <div class="text-center">
                <div class="w-4 h-4 bg-green-500 rounded-full mx-auto mb-1"></div>
                <p class="font-medium text-gray-800">{{ analytics.earningPercent }}%</p>
                <p class="text-xs text-gray-500">Earning</p>
              </div>
              <div class="text-center">
                <div class="w-4 h-4 bg-red-500 rounded-full mx-auto mb-1"></div>
                <p class="font-medium text-gray-800">{{ analytics.expenditurePercent }}%</p>
                <p class="text-xs text-gray-500">Expenditure</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Top Lists -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Top Earners -->
          <div class="card">
            <h3 class="card-header">Top Earning Sources</h3>
            <div class="space-y-3">
              <div v-for="(item, idx) in analytics.topEarners" :key="item.name" class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                    {{ idx + 1 }}
                  </span>
                  <span class="text-gray-800">{{ item.name }}</span>
                </div>
                <span class="font-mono text-green-600 font-medium">{{ currency }}{{ formatAmount(item.amount) }}</span>
              </div>
              <p v-if="analytics.topEarners.length === 0" class="text-gray-400 text-center py-4">No data available</p>
            </div>
          </div>

          <!-- Top Spenders -->
          <div class="card">
            <h3 class="card-header">Top Expenditure Categories</h3>
            <div class="space-y-3">
              <div v-for="(item, idx) in analytics.topSpenders" :key="item.name" class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold flex items-center justify-center">
                    {{ idx + 1 }}
                  </span>
                  <span class="text-gray-800">{{ item.name }}</span>
                </div>
                <span class="font-mono text-red-600 font-medium">{{ currency }}{{ formatAmount(item.amount) }}</span>
              </div>
              <p v-if="analytics.topSpenders.length === 0" class="text-gray-400 text-center py-4">No data available</p>
            </div>
          </div>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else class="text-center py-20">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="text-lg font-medium text-gray-600 mb-2">Select sheets to view analytics</h3>
        <p class="text-gray-400">Choose one or more sheets from the filter above</p>
      </div>
    </template>
  </div>
</template>
