import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AvailabilityPage from './pages/AvailabilityPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/availability" element={<AvailabilityPage />} />
    </Routes>
  )
}
