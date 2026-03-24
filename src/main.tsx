import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TimezoneProvider } from './hooks/useTimezone.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TimezoneProvider>
      <App />
    </TimezoneProvider>
  </StrictMode>,
)
