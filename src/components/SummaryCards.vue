<script setup>
import { computed } from 'vue'
import { APP_CONFIG } from '@/config/google'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  columns: {
    type: Array,
    default: () => []
  }
})

const currency = APP_CONFIG.CURRENCY

// Find amount and paid columns
const amountColumn = computed(() => {
  return props.columns.find(c => c.name.toLowerCase().includes('amount'))?.name || 'Amount'
})

const paidColumn = computed(() => {
  return props.columns.find(c => c.type === 'boolean')?.name || 'Paid'
})

const typeColumn = computed(() => {
  return props.columns.find(c => c.name.toLowerCase().includes('type'))?.name || 'Type'
})

// Calculate summaries
const totalRecords = computed(() => props.data.length)

const totalAmount = computed(() => {
  return props.data.reduce((sum, row) => {
    const amount = parseFloat(row[amountColumn.value]) || 0
    return sum + amount
  }, 0)
})

const totalCredit = computed(() => {
  return props.data
    .filter(row => row[typeColumn.value] === 'Credit')
    .reduce((sum, row) => {
      const amount = parseFloat(row[amountColumn.value]) || 0
      return sum + amount
    }, 0)
})

const totalDebit = computed(() => {
  return props.data
    .filter(row => row[typeColumn.value] === 'Debit')
    .reduce((sum, row) => {
      const amount = parseFloat(row[amountColumn.value]) || 0
      return sum + amount
    }, 0)
})

const paidAmount = computed(() => {
  return props.data
    .filter(row => row[paidColumn.value] === 'Yes' || row[paidColumn.value] === true || row[paidColumn.value] === 'TRUE')
    .reduce((sum, row) => {
      const amount = parseFloat(row[amountColumn.value]) || 0
      return sum + amount
    }, 0)
})

const unpaidAmount = computed(() => {
  return props.data
    .filter(row => row[paidColumn.value] === 'No' || row[paidColumn.value] === false || row[paidColumn.value] === 'FALSE' || !row[paidColumn.value])
    .reduce((sum, row) => {
      const amount = parseFloat(row[amountColumn.value]) || 0
      return sum + amount
    }, 0)
})

const paidCount = computed(() => {
  return props.data.filter(row => row[paidColumn.value] === 'Yes' || row[paidColumn.value] === true || row[paidColumn.value] === 'TRUE').length
})

const unpaidCount = computed(() => {
  return props.data.filter(row => row[paidColumn.value] === 'No' || row[paidColumn.value] === false || row[paidColumn.value] === 'FALSE' || !row[paidColumn.value]).length
})

const balance = computed(() => totalCredit.value - totalDebit.value)

function formatAmount(amount) {
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
    <!-- Total Records -->
    <div class="bg-white rounded-lg shadow-sm border p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide">Total Records</p>
          <p class="text-2xl font-bold text-gray-800">{{ totalRecords }}</p>
        </div>
        <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Total Credit -->
    <div class="bg-white rounded-lg shadow-sm border p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide">Total Credit</p>
          <p class="text-2xl font-bold text-green-600">{{ currency }}{{ formatAmount(totalCredit) }}</p>
        </div>
        <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Total Debit -->
    <div class="bg-white rounded-lg shadow-sm border p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide">Total Debit</p>
          <p class="text-2xl font-bold text-red-600">{{ currency }}{{ formatAmount(totalDebit) }}</p>
        </div>
        <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Balance -->
    <div class="bg-white rounded-lg shadow-sm border p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide">Balance</p>
          <p :class="['text-2xl font-bold', balance >= 0 ? 'text-green-600' : 'text-red-600']">
            {{ currency }}{{ formatAmount(Math.abs(balance)) }}
            <span class="text-sm">{{ balance >= 0 ? '(+)' : '(-)' }}</span>
          </p>
        </div>
        <div :class="['w-10 h-10 rounded-lg flex items-center justify-center', balance >= 0 ? 'bg-green-100' : 'bg-red-100']">
          <svg :class="['w-5 h-5', balance >= 0 ? 'text-green-600' : 'text-red-600']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Paid -->
    <div class="bg-white rounded-lg shadow-sm border p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide">Paid ({{ paidCount }})</p>
          <p class="text-2xl font-bold text-emerald-600">{{ currency }}{{ formatAmount(paidAmount) }}</p>
        </div>
        <div class="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
    </div>

    <!-- Unpaid -->
    <div class="bg-white rounded-lg shadow-sm border p-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500 uppercase tracking-wide">Unpaid ({{ unpaidCount }})</p>
          <p class="text-2xl font-bold text-orange-600">{{ currency }}{{ formatAmount(unpaidAmount) }}</p>
        </div>
        <div class="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
          <svg class="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
