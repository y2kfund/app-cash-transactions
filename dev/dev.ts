import { createApp } from 'vue'
import CashTransaction from '../src/CashTransactions.vue'
import { createCore } from '@y2kfund/core'

async function initializeApp() {
  try {
    console.log('🚀 Initializing cash transaction development harness...')
    
    // Initialize core plugin first - fix parameter name
    const core = await createCore({
      supabaseUrl: import.meta.env.VITE_SUPA_URL,
      supabaseAnon: import.meta.env.VITE_SUPA_ANON  // This should be supabaseAnonKey, not supabaseKey
    })
    
    console.log('✅ Core plugin initialized')

    const props = (window as any).__DEMO_PROPS__ || {
      accountId: '1',
      highlightPnL: true
    }

    // Create and mount the app with app-core plugin
    createApp(CashTransaction, props)
      .use(core)  // This is crucial - provides Supabase client and TanStack Query
      .mount('#app')

    console.log('✅ Cash Transaction app initialized successfully with app-core')

  } catch (error) {
    console.error('Failed to initialize cash transaction app:', error)

    // Show error message in the DOM
    const app = document.getElementById('app')
    if (app) {
      app.innerHTML = `
        <div style="padding: 2rem; background: #f8d7da; color: #721c24; border-radius: 0.5rem; margin: 1rem;">
          <h2>Development Setup Error</h2>
          <p>Failed to initialize app-core: ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <div style="margin: 1rem 0;">
            <h3>Checklist:</h3>
            <ul style="text-align: left;">
              <li>✅ @y2kfund/core is built and linked</li>
              <li>❓ Is Supabase running? <code>npx supabase status --workdir ./supabase/data/developer</code></li>
              <li>❓ Does hf.cash_transactions table exist?</li>
              <li>❓ Are environment variables set in .env file?</li>
            </ul>
          </div>
          <div style="background: #f8f9fa; padding: 1rem; border-radius: 0.25rem; font-family: monospace; font-size: 0.875rem;">
            Required .env file:<br>
            VITE_SUPA_URL=https://sb.y2k.fund<br>
            VITE_SUPA_ANON=your_anon_key_here
          </div>
          <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #dc3545; color: white; border: none; border-radius: 0.25rem; cursor: pointer;">
            Retry
          </button>
        </div>
      `
    }
  }
}

initializeApp()