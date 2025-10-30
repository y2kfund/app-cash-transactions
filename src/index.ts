import CashTransactions from './CashTransactions.vue'

export { CashTransactions }
export default CashTransactions

// Props interface
export interface CashTransactionsProps {
  accountId: string
  highlightPnL?: boolean
  onRowClick?: (row: any) => void
  showHeaderLink?: boolean  // Whether to show the header as a router-link (for use in dashboard with routing)
  userId?: string | null    // Current user ID for access control
}