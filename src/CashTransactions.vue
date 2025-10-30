<script setup lang="ts">
import { onBeforeUnmount, onMounted, computed, ref, watch, nextTick, inject } from 'vue'
import { DateTime } from 'luxon'
;(window as any).luxon = { DateTime }
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import { useCashTransactionsQuery, type CashTransaction } from '@y2kfund/core/cashTransactions'
import type { CashTransactionsProps } from './index'

const props = withDefaults(defineProps<CashTransactionsProps>(), {
  accountId: '1',
  showHeaderLink: false,
  userId: null
})

const emit = defineEmits<{ 
  'row-click': [row: CashTransaction]
  'minimize': []
}>()

const eventBus = inject<any>('eventBus')
const accountFilter = ref<string | null>(null)

// Active filters
type ActiveFilter = { field: 'symbol' | 'legal_entity' | 'assetCategory' | 'quantity'; value: string }
const activeFilters = ref<ActiveFilter[]>([])

// Update filters to work with table
function updateFilters() {
  if (!tabulator || !isTabulatorReady.value) return

  try {
    tabulator.clearFilter(true)

    tabulator.setFilter((data: any) => {
      if (!data) return false

      // Account filter
      if (accountFilter.value) {
        const accountVal = typeof data.legal_entity === 'object' && data.legal_entity !== null
          ? (data.legal_entity.name || data.legal_entity.id)
          : data.legal_entity
        if (accountVal !== accountFilter.value) return false
      }

      return true
    })

    syncActiveFiltersFromTable()
    nextTick(() => {
      if (tabulator) tabulator.redraw()
    })
  } catch (error) {
    console.warn('Error in updateFilters:', error)
  }
}

function syncActiveFiltersFromTable() {
  const next: ActiveFilter[] = []
  if (accountFilter.value) {
    next.push({ field: 'legal_entity', value: accountFilter.value })
  }
  activeFilters.value = next
  
}

// Toast system
const toasts = ref<{ id: number; type: string; title: string; message?: string }[]>([])
let toastIdCounter = 0
function showToast(type: string, title: string, message?: string) {
  const id = toastIdCounter++
  toasts.value.push({ id, type, title, message })
  setTimeout(() => removeToast(id), 5000)
}
function removeToast(id: number) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) toasts.value.splice(index, 1)
}

// Query cash transactions data
const q = useCashTransactionsQuery(props.accountId, props.userId)

// Tabulator instance
const tableDiv = ref<HTMLDivElement | null>(null)
let tabulator: Tabulator | null = null
const isTabulatorReady = ref(false)
const isTableInitialized = ref(false)

// App name dialog
const appName = ref('Cash Transactions')
const showAppNameDialog = ref(false)
const appNameInput = ref('')
function openAppNameDialog() {
  appNameInput.value = appName.value
  showAppNameDialog.value = true
}
function saveAppName() {
  appName.value = appNameInput.value.trim() || 'Cash Transactions'
  showAppNameDialog.value = false
}

// Generic context menu for columns showing fetched_at timestamp
function createFetchedAtContextMenu() {
  return [
    {
      label: (component: any) => {
        const rowData = component.getData()
        return formatTimestampWithTimezone(rowData.fetched_at)
      },
      action: () => {},
      disabled: true
    },
    {
      separator: true
    },
    {
      label: '📋 Copy timestamp to clipboard',
      action: (e: any, component: any) => {
        const rowData = component.getData()
        const fetchedAt = rowData.fetched_at
        
        if (fetchedAt) {
          navigator.clipboard.writeText(fetchedAt)
            .then(() => {
              showToast('success', 'Copied!', 'Timestamp copied to clipboard')
            })
            .catch((err) => {
              console.error('Failed to copy:', err)
              showToast('error', 'Copy Failed', 'Could not copy timestamp')
            })
        } else {
          showToast('warning', 'No Data', 'No timestamp available to copy')
        }
      }
    }
  ]
}

// Generic timezone formatting function
function formatTimestampWithTimezone(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return '⏱️ Last Updated: Not available'
  }
  
  try {
    const date = new Date(timestamp)
    
    // Detect user's timezone
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    
    // Map common timezones to their abbreviations with DST support
    const timezoneMap: { [key: string]: string } = {
      'Asia/Kolkata': 'IST',
      'Asia/Calcutta': 'IST',
      'America/New_York': date.getMonth() >= 2 && date.getMonth() < 10 ? 'EDT' : 'EST',
      'America/Los_Angeles': date.getMonth() >= 2 && date.getMonth() < 10 ? 'PDT' : 'PST',
      'America/Chicago': date.getMonth() >= 2 && date.getMonth() < 10 ? 'CDT' : 'CST',
      'America/Denver': date.getMonth() >= 2 && date.getMonth() < 10 ? 'MDT' : 'MST',
      'Europe/London': date.getMonth() >= 2 && date.getMonth() < 9 ? 'BST' : 'GMT',
      'Europe/Paris': date.getMonth() >= 2 && date.getMonth() < 9 ? 'CEST' : 'CET',
      'Australia/Sydney': date.getMonth() >= 9 || date.getMonth() < 3 ? 'AEDT' : 'AEST',
    }
    
    // Get the timezone abbreviation
    const timezoneName = timezoneMap[userTimeZone] || userTimeZone
    
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: userTimeZone
    })
    
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: userTimeZone
    })
    
    return `⏱️ Last Updated: ${formattedDate} at ${formattedTime} ${timezoneName}`
  } catch (error) {
    return `⏱️ Last Updated: ${timestamp}`
  }
}

function clearFilter(field: 'legal_entity' | 'symbol' | 'assetCategory' | 'quantity') {
  if (field === 'legal_entity') {
    accountFilter.value = null
    const url = new URL(window.location.href)
    url.searchParams.delete('all_cts_clientId')
    window.history.replaceState({}, '', url.toString())
    // Emit event to other components
    if (eventBus) {
      eventBus.emit('account-filter-changed', {
        accountId: null,
        source: 'cash-transactions'
      })
    }
  }
  updateFilters()
}

function clearAllFilters() {
  accountFilter.value = null
  const url = new URL(window.location.href)
  url.searchParams.delete('all_cts_clientId')
  url.searchParams.delete('all_cts_fi')
  url.searchParams.delete('all_cts_asset')
  url.searchParams.delete('all_cts_qty')
  window.history.replaceState({}, '', url.toString())
  if (eventBus) {
    eventBus.emit('account-filter-changed', { accountId: null, source: 'cash-transactions' })
  }
  updateFilters()
}

// Columns config
const allCashTransactionsColumnOptions = [
  { field: 'legal_entity', label: 'Account' },
  { field: 'dateTime', label: 'Date' },
  { field: 'settleDate', label: 'Settle Date' },
  { field: 'amount', label: 'Amount' },
  { field: 'description', label: 'Description' },
  { field: 'clientReference', label: 'Client Reference' },
  { field: 'type', label: 'Type' }
]
const cashTransactionsVisibleCols = ref(allCashTransactionsColumnOptions.map(c => c.field))

const columns = computed(() => [
  {
    title: 'Account',
    field: 'legal_entity',
    minWidth: 120,
    frozen: true,
    sorter: 'string',
    formatter: (cell: any) => {
      const value = cell.getValue()
      if (typeof value === 'object' && value !== null) {
        return value.name || value.id || ''
      }
      return value ? `<span style="font-weight: 500;">${value}</span>` : '<span style="color: #6c757d; font-style: italic;">N/A</span>'
    },
    cellClick: (e: any, cell: any) => {
      const value = cell.getValue()
      const accountName = typeof value === 'object' && value !== null ? (value.name || value.id) : value
      handleCellFilterClick('legal_entity', accountName)
    },
    contextMenu: createFetchedAtContextMenu()
  },
  {
    title: 'Date',
    field: 'dateTime',
    minWidth: 120,
    sorter: (a: any, b: any, aRow: any, bRow: any, column: any, dir: any, sorterParams: any) => {
      const getDate = (val: any) => {
        if (!val) return ''
        return String(val).split(';')[0].trim()
      }
      const dateA = getDate(a)
      const dateB = getDate(b)
      const ta = parseCashTransactionDate(dateA) || 0
      const tb = parseCashTransactionDate(dateB) || 0
      return ta - tb
    },
    formatter: (cell: any) => {
      let val = cell.getValue()
      if (!val) return ''
      // Extract date part before ';'
      val = String(val).split(';')[0].trim()
      // parse dd/mm/yyyy or d/m/yyyy -> format "Mon DD, YYYY" (e.g. "Jul 21, 2025")
      const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(val)
      let dt: Date
      if (m) {
        const day = Number(m[1])
        const month = Number(m[2]) - 1
        let year = Number(m[3])
        if (year < 100) year += 2000
        dt = new Date(year, month, day)
      } else {
        dt = new Date(val)
        if (isNaN(dt.getTime())) return String(val)
      }
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    },
    contextMenu: createFetchedAtContextMenu()
  },
  {
    title: 'Settle Date',
    field: 'settleDate',
    minWidth: 120,
    sorter: (a: any, b: any, aRow: any, bRow: any, column: any, dir: any, sorterParams: any) => {
      const ta = parseCashTransactionDate(a) || 0
      const tb = parseCashTransactionDate(b) || 0
      return ta - tb
    },
    formatter: (cell: any) => {
      const val = cell.getValue()
      if (!val) return ''
      const dt = parseCashTransactionDate(val)
      if (!dt) return val
      return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  },
  {
    title: 'Amount',
    field: 'amount',
    minWidth: 120,
    hozAlign: 'right',
    sorter: 'number',
    // ensure Tabulator sees a numeric value (DB stores text)
    mutator: (value: any) => {
      const n = parseFloat(value)
      return isNaN(n) ? 0 : n
    },
    formatter: (cell: any) => {
      // cell.getValue() will now be a number thanks to mutator
      return `<span style="font-weight: 600;">${formatCurrency(parseFloat(cell.getValue()) || 0)}</span>`
    },
    bottomCalc: 'sum',
    bottomCalcFormatter: (cell: any) => formatCurrency(cell.getValue() || 0),
    contextMenu: createFetchedAtContextMenu()
  },
  {
    title: 'Description',
    field: 'description',
    minWidth: 200,
    sorter: 'string'
  },
  {
    title: 'Client Reference',
    field: 'clientReference',
    minWidth: 120,
    sorter: 'string'
  },
  {
    title: 'Type',
    field: 'type',
    minWidth: 80,
    sorter: 'string'
  }
].filter(col => cashTransactionsVisibleCols.value.includes(col.field)))

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}
function parseCashTransactionDate(val: any): number | null {
  if (!val) return null
  const s = String(val).trim()
  const m = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{2,4})$/.exec(s)
  if (m) {
    let day = Number(m[1])
    let month = Number(m[2]) - 1
    let year = Number(m[3])
    if (year < 100) year += 2000
    const dt = new Date(year, month, day)
    return isNaN(dt.getTime()) ? null : dt.getTime()
  }
  const dt = new Date(s)
  return isNaN(dt.getTime()) ? null : dt.getTime()
}
function handleCellFilterClick(field: 'legal_entity', value: string) {
  if (field === 'legal_entity') {
    // Toggle account filter
    if (accountFilter.value === value) {
      accountFilter.value = null
      const url = new URL(window.location.href)
      url.searchParams.delete('all_cts_clientId')
      window.history.replaceState({}, '', url.toString())
      // Emit event to other components
      if (eventBus) {
        eventBus.emit('account-filter-changed', {
          accountId: null,
          source: 'cash-transactions'
        })
      }
    } else {
      accountFilter.value = value
      const url = new URL(window.location.href)
      url.searchParams.set('all_cts_clientId', value)
      window.history.replaceState({}, '', url.toString())
      // Emit event to other components
      if (eventBus) {
        eventBus.emit('account-filter-changed', {
          accountId: value,
          source: 'cash-transactions'
        })
      }
    }
    updateFilters()
  }
}

// Popup state for columns
const showCashTransactionsColumnsPopup = ref(false)
const cashTransactionsColumnsBtnRef = ref<HTMLElement | null>(null)
const cashTransactionsColumnsPopupRef = ref<HTMLElement | null>(null)
function toggleCashTransactionsColumnsPopup() {
  showCashTransactionsColumnsPopup.value = !showCashTransactionsColumnsPopup.value
}
function closeCashTransactionsColumnsPopup() {
  showCashTransactionsColumnsPopup.value = false
}

// Tabulator initialization
function initializeTabulator() {
  if (!tableDiv.value) return
  if (tabulator) {
    try { tabulator.destroy() } catch (error) {}
    tabulator = null
  }
  isTabulatorReady.value = false
  tabulator = new Tabulator(tableDiv.value, {
    data: q.data.value || [],
    columns: columns.value,
    layout: 'fitColumns',
    placeholder: 'No cash transactions available',
    virtualDom: false,
    rowClick: (e: any, row: any) => {
      const data = row.getData()
      emit('row-click', data)
    }
  })
  tabulator.on('tableBuilt', function() {
    isTabulatorReady.value = true
    updateFilters()
  })
}

function parseAppNameFromUrl(): string {
  const url = new URL(window.location.href)
  return url.searchParams.get('cash_transactions_app_name') || 'Cash Transactions'
}

// URL synchronization for filters
function parseFiltersFromUrl(): { legal_entity?: string; symbol?: string[]; asset?: string; quantity?: number } {
  const url = new URL(window.location.href)
  const account = url.searchParams.get('all_cts_clientId') || undefined
  const symbolParam = url.searchParams.get('all_cts_fi') || undefined
  const symbol = symbolParam ? symbolParam.split(',').filter(Boolean) : undefined
  const asset = url.searchParams.get('all_cts_asset') || undefined
  const qtyParam = url.searchParams.get('all_cts_qty') || undefined
  const quantity = qtyParam ? Number(qtyParam) : undefined
  return { legal_entity: account, symbol, asset, quantity }
}

function handleExternalAccountFilter(payload: { accountId: string | null, source: string }) {
  console.log('📍 [Cash Transactions] Received account filter:', payload)
  if (payload.source === 'cash-transactions') return

  // Apply or clear the filter
  accountFilter.value = payload.accountId
  const url = new URL(window.location.href)
  if (payload.accountId) {
    url.searchParams.set('all_cts_clientId', payload.accountId)
  } else {
    url.searchParams.delete('all_cts_clientId')
  }
  window.history.replaceState({}, '', url.toString())
  updateFilters()
}
function onMinimize() {
  emit('minimize')
}

watch([() => q.isSuccess.value, tableDiv, cashTransactionsVisibleCols], async ([isSuccess, divRef]) => {
  if (isSuccess && divRef && !isTableInitialized.value) {
    await nextTick()
    initializeTabulator()
    isTableInitialized.value = true
  } else if (isSuccess && divRef && isTableInitialized.value) {
    await nextTick()
    initializeTabulator()
  }
}, { immediate: true })

watch(() => q.data.value, async (newData) => {
  if (!tabulator || !newData) return
  try {
    tabulator.replaceData(newData)
    updateFilters()
  } catch (error) {
    console.warn('Error updating table data:', error)
  }
}, { deep: true })

onMounted(async () => {
  appName.value = parseAppNameFromUrl()
  // Initialize filters from URL
  const filters = parseFiltersFromUrl()
  if (filters.legal_entity) accountFilter.value = filters.legal_entity

  // Try to initialize if data is already loaded
  if (q.isSuccess.value && tableDiv.value && !isTableInitialized.value) {
    await nextTick()
    initializeTabulator()
    isTableInitialized.value = true
  }

  updateFilters()

  if (eventBus) {
    eventBus.on('account-filter-changed', handleExternalAccountFilter)
  }
})

onBeforeUnmount(() => {
  if (tabulator) {
    try { tabulator.destroy() } catch (error) {}
    tabulator = null
  }
  q._cleanup?.()
})
</script>

<template>
  <div class="cash-transactions-card">
    <!-- Toast notifications -->
    <div class="toast-container">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        :class="['toast', `toast-${toast.type}`]"
      >
        <strong>{{ toast.title }}</strong>
        <span v-if="toast.message">{{ toast.message }}</span>
        <button @click="removeToast(toast.id)" class="toast-close">×</button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="q.isLoading.value" class="loading">
      <div class="loading-spinner"></div>
      Loading cash transactions...
    </div>
    
    <!-- Error state -->
    <div v-else-if="q.isError.value" class="error">
      <h3>Error loading cash transactions</h3>
      <p>{{ q.error.value }}</p>
    </div>
    
    <!-- Success state with Tabulator -->
    <div v-else-if="q.isSuccess.value" class="cash-transactions-container">
      <div class="cash-transactions-header">
        <h2>
          <router-link v-if="showHeaderLink" to="/cash-transactions">{{ appName }}</router-link>
          <span v-else>{{ appName }}</span>
          <button
            class="appname-rename-btn"
            @click="openAppNameDialog"
            title="Rename app"
            style="width:auto;padding: 2px 7px; font-size: 13px; background: none; border: none; color: #888; cursor: pointer;"
          >✎</button>
        </h2>
        <div class="cash-transactions-tools">
          <button
            ref="cashTransactionsColumnsBtnRef"
            class="columns-btn"
            aria-label="Column settings"
            @click.stop="toggleCashTransactionsColumnsPopup"
            title="Column Settings"
          >
            <svg class="icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.21-.37-.3-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.03-.22-.22-.39-.44-.39h-3.84c-.22 0-.41.16-.44.39l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.09-.47 0-.59.22l-1.92 3.32c-.12.21-.07.47.12.61l2.03 1.58c.04.31.06.63.06.94s-.02.63-.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.21.37.3.59.22l2.39.96c.5.38 1.03.7 1.62.94l.36 2.54c.03.22.22.39.44.39h3.84c.22 0 .41-.16.44-.39l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.09.47 0 .59-.22l1.92-3.32c.12-.21.07-.47-.12-.61l-2.03-1.58ZM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5Z"/>
            </svg>
          </button>
          <button 
            v-if="showHeaderLink"
            @click="onMinimize"
            class="minimize-button"
            title="Close"
          >
            X
          </button>
          <div v-if="showCashTransactionsColumnsPopup" ref="cashTransactionsColumnsPopupRef" class="columns-dropdown" @click.stop>
            <div class="columns-header">
              <span class="columns-title">Columns</span>
            </div>
            <div class="columns-content">
              <label v-for="opt in allCashTransactionsColumnOptions" :key="opt.field" class="column-option">
                <input 
                  type="checkbox" 
                  :value="opt.field" 
                  v-model="cashTransactionsVisibleCols"
                  class="column-checkbox"
                />
                <span class="column-label">{{ opt.label }}</span>
              </label>
            </div>
            <div class="columns-footer">
              <button 
                class="btn-link" 
                @click="cashTransactionsVisibleCols = allCashTransactionsColumnOptions.map(c => c.field)"
              >
                Show All
              </button>
              <button class="btn-done" @click="closeCashTransactionsColumnsPopup">Done</button>
            </div>
          </div>
        </div>
      </div>

      <!--- Filters --->
      <div v-if="activeFilters.length" class="filters-bar">
        <span class="filters-label">Filtered by:</span>
        <div class="filters-tags">
          <span v-for="f in activeFilters" :key="`${f.field}-${f.value}`" class="filter-tag">
            <strong>{{ f.field === 'legal_entity' ? 'Account' : f.field === 'symbol' ? 'Symbol' : f.field === 'assetCategory' ? 'Asset Class' : f.field === 'quantity' ? 'Quantity' : 'Unknown' }}:</strong> {{ f.value }}
            <button class="tag-clear" @click="clearFilter(f.field)">✕</button>
          </span>
          <button class="btn-clear-all" @click="clearAllFilters">Clear all</button>
        </div>
      </div>
      <div ref="tableDiv" class="cash-transactions-grid"></div>
    </div>

    <div v-if="showAppNameDialog" class="rename-dialog-backdrop">
      <div class="rename-dialog">
        <h3>Rename App</h3>
        <input v-model="appNameInput" placeholder="App name" />
        <div class="dialog-actions">
          <button @click="saveAppName">Save</button>
          <button @click="showAppNameDialog = false">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@import 'tabulator-tables/dist/css/tabulator_modern.min.css';
</style>

<style scoped>
.cash-transactions-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 24px;
  margin: 24px 0;
  display: flex;
  flex-direction: column;
}
.cash-transactions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.cash-transactions-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #495057;
}
.cash-transactions-grid {
  margin-top: 8px;
  min-height: 400px;
}
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-width: 300px;
  max-width: 500px;
}
.toast-success {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}
.toast-error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}
.toast-warning {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}
.toast-info {
  background-color: #d1ecf1;
  border: 1px solid #bee5eb;
  color: #0c5460;
}
.toast strong {
  font-weight: 500;
}
.toast span {
  flex: 1;
  font-size: 14px;
}
.toast-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  margin-left: auto;
}
.toast-close:hover {
  color: #dc3545;
}

/* Tabulator theme overrides */
:deep(.tabulator) {
  font-size: 0.875rem;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  overflow: hidden;
}

:deep(.tabulator-header) {
  background-color: #f8f9fa !important;
  border-bottom: 2px solid #dee2e6 !important;
  padding-left: 0;
}

:deep(.tabulator-col) {
  border-right: 1px solid #dee2e6 !important;
  font-weight: 600;
}

:deep(.tabulator-col-title) {
  color: #495057;
}

:deep(.tabulator-row) {
  border-bottom: 1px solid #f1f3f5;
}

:deep(.tabulator-row:hover) {
  background-color: #f8f9fa !important;
}

:deep(.tabulator-row.tabulator-selected) {
  background-color: #e3f2fd !important;
}

:deep(.tabulator-cell) {
  border-right: 1px solid #dee2e6 !important;
  padding: 4px 8px;
}

/* Bottom calc row (totals) */
:deep(.tabulator-row.tabulator-calcs) {
  background-color: #f1f3f5 !important;
  font-weight: 600;
  border-top: 2px solid #dee2e6 !important;
}

:deep(.tabulator-row.tabulator-calcs .tabulator-cell) {
  background-color: #f1f3f5 !important;
}

/* Pagination */
:deep(.tabulator-footer) {
  background-color: #f8f9fa;
  border-top: 1px solid #dee2e6;
}

:deep(.tabulator-page) {
  border: 1px solid #dee2e6;
  border-radius: 0.25rem;
  background: white;
  margin: 0 0.125rem;
}

:deep(.tabulator-page.active) {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

:deep(.tabulator-page:hover:not(.disabled)) {
  background: #e9ecef;
}
.columns-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #fff;
  color: #495057;
  cursor: pointer;
  font-size: 1.125rem;
  transition: all 0.2s;
}
.columns-btn:hover {
  background: #f9f9fa;
  border-color: #adb5bd;
  transform: scale(1.05);
}
.columns-dropdown {
  position: absolute;
  right: 32px;
  top: calc(7% + 8px);
  width: 260px;
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  z-index: 1000;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
.columns-header {
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
  background-color: #fafafa;
}
.columns-title {
  font-weight: 600;
  color: #333;
  font-size: 13px;
}
.columns-content {
  padding: 4px 0;
  max-height: 300px;
  overflow-y: auto;
}
.column-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  margin: 0;
  font-size: 13px;
}
.column-option:hover {
  background-color: #f8f9fa;
}
.column-checkbox {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  border: 1px solid #ccc;
  margin: 0;
  cursor: pointer;
  accent-color: #007bff;
}
.column-checkbox:checked {
  background-color: #007bff;
  border-color: #007bff;
}
.column-label {
  color: #333;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  line-height: 1.2;
}
.columns-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid #f0f0f0;
  background-color: #fafafa;
}
.btn-link {
  background: none;
  border: none;
  color: #6c757d;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
  transition: color 0.15s ease;
}
.btn-link:hover {
  color: #495057;
  text-decoration: underline;
}
.btn-done {
  background: #007bff;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 3px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.btn-done:hover {
  background: #0056b3;
}
.btn-done:active {
  background: #004085;
}
.filter-btn {
    background: none;
    cursor: pointer;
    transition: background .15s;
    border-radius: 4px;
    width: auto;
    vertical-align: middle;
    display: inline-flex;
    border: 1px solid #dee2e6;
    padding: 6px 6px;
}
.filter-btn:hover {
  background: #f1f3f5;
}
.universal-filter-bar button {
    width: auto;
    padding: 5px 7px;
    font-size: 0.9rem;
}
.universal-filter-bar input, .universal-filter-bar select {
    width: auto;
    padding: 4px 5px;
}
.universal-filter-bar label {
    margin-bottom: 0;
}
/* Rename Account Dialog Styles */
.rename-dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.rename-dialog {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 400px;
  max-width: 90%;
}

.rename-dialog h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.rename-dialog input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 16px;
  color: #374151;
  margin-bottom: 1rem;
}

.rename-dialog .dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.rename-dialog button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.rename-dialog button:hover {
  background: #f3f4f6;
}

.rename-dialog button:active {
  background: #e5e7eb;
}

.rename-dialog button:first-child {
  background: #007bff;
  color: white;
}

.rename-dialog button:first-child:hover {
  background: #0056b3;
}

.rename-dialog button:first-child:active {
  background: #004085;
}
.rename-dialog-backdrop {
  position: fixed !important;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  z-index: 99999 !important;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rename-dialog {
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  z-index: 100000 !important;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}
.filters-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}
.filters-label {
  font-size: 0.875rem;
  color: #495057;
  font-weight: 600;
}
.filters-tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: #f1f3f5;
  color: #495057;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid #e9ecef;
  font-size: 0.8125rem;
}
.filter-tag .tag-clear {
  appearance: none;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6c757d;
}
.btn-clear-all {
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid #dee2e6;
  background: #fff;
  color: #6c757d;
  cursor: pointer;
  font-size: 0.8125rem;
}
.minimize-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid #dee2e6;
  background: #fff;
  color: #495057;
  cursor: pointer;
  font-size: 1.125rem;
  transition: all 0.2s;
}

.minimize-button:hover {
  background: #f9f9fa;
  border-color: #adb5bd;
  transform: scale(1.05);
}

.minimize-button:active {
  transform: scale(0.95);
}
</style>
