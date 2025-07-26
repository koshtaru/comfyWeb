import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import GeneratePage from '@/pages/GeneratePage'
import HistoryPage from '@/pages/HistoryPage'
import ModelsPage from '@/pages/ModelsPage'
import PresetsPage from '@/pages/PresetsPage'
import SettingsPage from '@/pages/SettingsPage'
import QueuePage from '@/pages/QueuePage'
import WebSocketTestPage from '@/pages/WebSocketTestPage'
import { ROUTES } from '@/constants/routes'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<GeneratePage />} />
        <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
        <Route path={ROUTES.MODELS} element={<ModelsPage />} />
        <Route path={ROUTES.PRESETS} element={<PresetsPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        <Route path={ROUTES.QUEUE} element={<QueuePage />} />
        <Route path={ROUTES.WEBSOCKET_TEST} element={<WebSocketTestPage />} />
      </Route>
    </Routes>
  )
}

export default App
