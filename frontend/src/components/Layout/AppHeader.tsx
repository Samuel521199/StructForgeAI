import { Layout, Typography, Space } from 'antd'
import { RobotOutlined } from '@ant-design/icons'

const { Header } = Layout
const { Title } = Typography

const AppHeader = () => {
  return (
    <Header
      style={{
        background: '#001529',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Space>
        <RobotOutlined style={{ fontSize: 24, color: '#1890ff' }} />
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          StructForge AI
        </Title>
      </Space>
    </Header>
  )
}

export default AppHeader

