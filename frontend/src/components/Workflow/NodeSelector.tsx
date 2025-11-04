import { Modal, List, Typography, Space } from 'antd'
import {
  FileTextOutlined,
  ApiOutlined,
  CommentOutlined,
  ToolOutlined,
  ExportOutlined,
} from '@ant-design/icons'
import type { NodeType } from './WorkflowNode'

const { Text } = Typography

interface NodeSelectorProps {
  open: boolean
  onSelect: (nodeType: NodeType) => void
  onCancel: () => void
}

const nodeOptions: Array<{ type: NodeType; label: string; description: string; icon: JSX.Element; color: string }> = [
  {
    type: 'parse_file',
    label: '解析文件',
    description: '读取并解析配置文件',
    icon: <FileTextOutlined />,
    color: '#1890ff',
  },
  {
    type: 'analyze_schema',
    label: '分析Schema',
    description: '深度分析数据结构',
    icon: <ApiOutlined />,
    color: '#52c41a',
  },
  {
    type: 'process_natural_language',
    label: '自然语言处理',
    description: '理解自然语言指令',
    icon: <CommentOutlined />,
    color: '#722ed1',
  },
  {
    type: 'apply_operations',
    label: '应用操作',
    description: '执行数据修改操作',
    icon: <ToolOutlined />,
    color: '#fa8c16',
  },
  {
    type: 'export_file',
    label: '导出文件',
    description: '导出处理后的数据',
    icon: <ExportOutlined />,
    color: '#eb2f96',
  },
]

const NodeSelector = ({ open, onSelect, onCancel }: NodeSelectorProps) => {
  return (
    <Modal
      title="选择节点类型"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={500}
    >
      <List
        dataSource={nodeOptions}
        renderItem={(item) => (
          <List.Item
            style={{
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '4px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f5f5f5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            onClick={() => {
              onSelect(item.type)
              onCancel()
            }}
          >
            <Space>
              <div style={{ color: item.color, fontSize: 24 }}>
                {item.icon}
              </div>
              <div>
                <Text strong>{item.label}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.description}
                </Text>
              </div>
            </Space>
          </List.Item>
        )}
      />
    </Modal>
  )
}

export default NodeSelector

