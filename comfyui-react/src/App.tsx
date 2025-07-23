import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import GeneratePage from '@/pages/GeneratePage'
import HistoryPage from '@/pages/HistoryPage'
import ModelsPage from '@/pages/ModelsPage'
import SettingsPage from '@/pages/SettingsPage'
import QueuePage from '@/pages/QueuePage'
import { ROUTES } from '@/constants/routes'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<GeneratePage />} />
          <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
          <Route path={ROUTES.MODELS} element={<ModelsPage />} />
          <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
          <Route path={ROUTES.QUEUE} element={<QueuePage />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
