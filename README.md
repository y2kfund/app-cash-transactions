# Cash Transactions App

A Vue.js application for managing and visualizing cash transactions data. This app provides a tabular interface to view, filter, and analyze cash transaction records with real-time data integration.

## Features

- **Interactive Data Table**: Powered by Tabulator for efficient data display and manipulation
- **Real-time Filtering**: Filter transactions by account, date, amount, and other criteria
- **URL-based State Management**: Persist filters and settings in the URL for shareable views
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Event-driven Architecture**: Integrated with event bus for cross-component communication
- **TypeScript Support**: Fully typed for better development experience
- **Modular Architecture**: Built as a reusable library component

## Tech Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Table Library**: Tabulator Tables
- **Date Handling**: Luxon
- **Styling**: Scoped CSS with modern design
- **Type Safety**: TypeScript
- **Backend Integration**: Supabase queries via custom composables

## Installation

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/y2kfund/app-cash-transactions.git
   cd app-cash-transactions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. For development:
   ```bash
   npm run dev
   ```

4. For building the library:
   ```bash
   npm run build:lib
   ```

## Usage

### As a Standalone App

Run the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### As a Library Component

After building the library, import the component in your Vue app:

```typescript
import { CashTransactions } from '@y2kfund/cash-transactions'
```

### URL Parameters

The app supports URL-based filtering:

- `all_cts_clientId`: Filter by client/account ID
- `cash_transactions_app_name`: Custom app name

Example: `http://localhost:5173/?all_cts_clientId=Client+6`

## Project Structure

```
src/
├── CashTransactions.vue    # Main component
├── index.ts               # Library exports
├── types/                 # TypeScript type definitions
└── composables/           # Vue composables for data fetching
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:lib` - Build as library
- `npm run preview` - Preview production build

### Key Components

- **Data Fetching**: Uses `useCashTransactionsQuery` composable for Supabase integration
- **Table Management**: Tabulator instance with custom sorters and formatters
- **State Management**: Reactive refs for filters and UI state
- **Event Handling**: Event bus for cross-app communication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the Y2K Fund ecosystem. See the main repository for licensing information.