import { default as CashTransactions } from './CashTransactions.vue';
export { CashTransactions };
export default CashTransactions;
export interface CashTransactionsProps {
    accountId: string;
    highlightPnL?: boolean;
    onRowClick?: (row: any) => void;
    showHeaderLink?: boolean;
    userId?: string | null;
}
