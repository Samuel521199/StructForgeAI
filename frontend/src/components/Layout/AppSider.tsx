import { Layout, Menu } from 'antd'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  DashboardOutlined,
  FileOutlined,
  ApiOutlined,
  DeploymentUnitOutlined,
} from '@ant-design/icons'

const { Sider } = Layout

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/files',
    icon: <FileOutlined />,
    label: '文件管理',
  },
  {
    key: '/schema',
    icon: <ApiOutlined />,
    label: 'Schema分析',
  },
  {
    key: '/workflow',
    icon: <DeploymentUnitOutlined />,
    label: '工作流',
  },
]

const AppSider = () => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Sider width={200} style={{ background: '#fff' }}>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ height: '100%', borderRight: 0 }}
      />
    </Sider>
  )
}

export default AppSider

