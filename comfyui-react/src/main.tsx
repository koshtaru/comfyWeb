// import { StrictMode } from 'react' // Disabled to fix navigation issues
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { WebSocketProvider } from '@/contexts/WebSocketContext'

createRoot(document.getElementById('root')!).render(
  <Router>
    <WebSocketProvider 
      config={{ 
        debug: false,
        autoReconnect: false
      }}
      autoConnect={false}
      showToastNotifications={true}
    >
      <App />
    </WebSocketProvider>
  </Router>
)
