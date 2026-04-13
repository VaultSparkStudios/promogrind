import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { registerSW } from './sw-register.js'
import { initAnalytics, Sentry } from './analytics.js'

registerSW()
initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div style={{padding:32,color:'#e2e8f0',fontFamily:'monospace'}}>Something went wrong. Refresh to try again.</div>}>
      <BrowserRouter basename={import.meta.env.VITE_APP_BASE_PATH || '/'}>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
