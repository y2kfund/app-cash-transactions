import { CashTransaction } from '@y2kfund/core/cashTransactions';
import { CashTransactionsProps } from './index';
declare const _default: import('vue').DefineComponent<CashTransactionsProps, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "row-click": (row: CashTransaction) => any;
    minimize: () => any;
}, string, import('vue').PublicProps, Readonly<CashTransactionsProps> & Readonly<{
    "onRow-click"?: ((row: CashTransaction) => any) | undefined;
    onMinimize?: (() => any) | undefined;
}>, {
    accountId: string;
    showHeaderLink: boolean;
    userId: string | null;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {
    cashTransactionsColumnsBtnRef: HTMLButtonElement;
    cashTransactionsColumnsPopupRef: HTMLDivElement;
    tableDiv: HTMLDivElement;
}, HTMLDivElement>;
export default _default;
