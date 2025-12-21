<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSheetsStore } from '@/stores/sheets'
import { useToastStore } from '@/stores/toast'
import { APP_CONFIG } from '@/config/google'
import SummaryCards from '@/components/SummaryCards.vue'

const router = useRouter()
const sheetsStore = useSheetsStore()
const toastStore = useToastStore()

const isLoading = ref(true)
const recentData = ref([])
const allColumns = ref([])

const currency = APP_CONFIG.CURRENCY

onMounted(async () => {
  try {
    await sheetsStore.fetchSheets()
    
    // Load data from the most recent sheet for dashboard
    if (sheetsStore.sheets.length > 0) {
      const recentSheet = sheetsStore.sheets[0]
      await sheetsStore.loadSheet(recentSheet.id)
      recentData.value = sheetsStore.currentData.slice(0, 10)
      allColumns.value = sheetsStore.currentSheet?.columns || []
    }
  } catch (error) {
    toastStore.error('Failed to load dashboard data')
  } finally {
    isLoading.value = false
  }
})

const stats = computed(() => ({
  totalSheets: sheetsStore.sheets.length,
  totalRecords: sheetsStore.currentData.length,
}))

function goToSheet(sheetId) {
  router.push(`/sheet/${sheetId}`)
}

function goToSheets() {
  router.push('/sheets')
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-800">Dashboard</h1>
      <p class="text-gray-500">Welcome to your Khata Book</p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <svg class="w-12 h-12 mx-auto mb-4 text-primary-600 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        <p class="text-gray-500">Loading dashboard...</p>
      </div>
    </div>

    <template v-else>
      <!-- Empty State -->
      <div v-if="sheetsStore.sheets.length === 0" class="text-center py-20">
        <div class="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-gray-800 mb-2">No Khata Sheets Yet</h2>
        <p class="text-gray-500 mb-6">Create your first Khata to start tracking your transactions</p>
        <button @click="goToSheets" class="btn-primary">
          Create Your First Khata
        </button>
      </div>

      <!-- Dashboard Content -->
      <template v-else>
        <!-- Summary Cards -->
        <SummaryCards 
          v-if="sheetsStore.currentData.length > 0"
          :data="sheetsStore.currentData" 
          :columns="allColumns"
          class="mb-8"
        />

        <!-- Quick Stats -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">Total Khatas</p>
                <p class="text-3xl font-bold text-gray-800">{{ stats.totalSheets }}</p>
              </div>
              <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">Current Sheet Records</p>
                <p class="text-3xl font-bold text-gray-800">{{ stats.totalRecords }}</p>
              </div>
              <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div class="card cursor-pointer hover:shadow-lg transition-shadow" @click="goToSheets">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">Quick Action</p>
                <p class="text-lg font-semibold text-primary-600">View All Khatas →</p>
              </div>
              <div class="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                <svg class="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Sheets -->
        <div class="card mb-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="card-header mb-0">Your Khatas</h2>
            <button @click="goToSheets" class="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          
          <div class="space-y-3">
            <div
              v-for="sheet in sheetsStore.sheets.slice(0, 5)"
              :key="sheet.id"
              @click="goToSheet(sheet.id)"
              class="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p class="font-medium text-gray-800">{{ sheet.name }}</p>
                  <p class="text-xs text-gray-500">Modified: {{ formatDate(sheet.modifiedTime) }}</p>
                </div>
              </div>
              <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Recent Records -->
        <div v-if="recentData.length > 0" class="card">
          <h2 class="card-header">Recent Records</h2>
          
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b">
                  <th class="text-left py-2 px-3 text-xs text-gray-500 uppercase">Date</th>
                  <th class="text-left py-2 px-3 text-xs text-gray-500 uppercase">Person</th>
                  <th class="text-left py-2 px-3 text-xs text-gray-500 uppercase">Amount</th>
                  <th class="text-left py-2 px-3 text-xs text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in recentData" :key="idx" class="border-b last:border-0">
                  <td class="py-3 px-3 text-sm">{{ formatDate(row['Date']) }}</td>
                  <td class="py-3 px-3 text-sm">{{ row['Person Name'] || '-' }}</td>
                  <td class="py-3 px-3 text-sm font-mono">{{ currency }}{{ parseFloat(row['Amount'] || 0).toLocaleString('en-IN') }}</td>
                  <td class="py-3 px-3">
                    <span
                      :class="[
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        (row['Paid'] === 'Yes' || row['Paid'] === 'TRUE') 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      ]"
                    >
                      {{ (row['Paid'] === 'Yes' || row['Paid'] === 'TRUE') ? 'Paid' : 'Unpaid' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
