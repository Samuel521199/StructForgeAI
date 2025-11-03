import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Layout } from 'antd'
import AppHeader from './components/Layout/AppHeader'
import AppSider from './components/Layout/AppSider'
import FileManagement from './pages/FileManagement'
import SchemaAnalysis from './pages/SchemaAnalysis'
import Workflow from './pages/Workflow'
import Dashboard from './pages/Dashboard'
import './App.css'

const { Content } = Layout

function App() {
  return (
    <Router>
      <Layout style={{ minHeight: '100vh' }}>
        <AppHeader />
        <Layout>
          <AppSider />
          <Layout style={{ padding: '24px' }}>
            <Content
              style={{
                background: '#fff',
                padding: 24,
                margin: 0,
                minHeight: 280,
                borderRadius: 8,
              }}
            >
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/files" element={<FileManagement />} />
                <Route path="/schema" element={<SchemaAnalysis />} />
                <Route path="/workflow" element={<Workflow />} />
              </Routes>
            </Content>
          </Layout>
        </Layout>
      </Layout>
    </Router>
  )
}

export default App

