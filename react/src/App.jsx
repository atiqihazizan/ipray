import { DataProvider } from './contexts/DataContext'
import TimeDriver from './components/TimeDriver'
import AppContent from './components/AppContent'

function App() {
  return (
    <DataProvider>
      <TimeDriver />
      <AppContent />
    </DataProvider>
  )
}

export default App
