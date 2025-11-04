import { useState } from 'react'
import { Space, Switch, Button, Dropdown, Typography } from 'antd'
import {
  ShareAltOutlined,
  SaveOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  StarOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import './WorkflowHeader.css'

const { Text } = Typography

interface WorkflowHeaderProps {
  workflowName: string
  isActive: boolean
  onActiveChange: (active: boolean) => void
  onSave?: () => void
  onShare?: () => void
}

const WorkflowHeader = ({
  workflowName,
  isActive,
  onActiveChange,
  onSave,
  onShare,
}: WorkflowHeaderProps) => {
  const [saved, setSaved] = useState(false)

  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'duplicate',
      label: '复制工作流',
    },
    {
      key: 'delete',
      label: '删除工作流',
      danger: true,
    },
    {
      key: 'export',
      label: '导出工作流',
    },
  ]

  const handleSave = () => {
    setSaved(true)
    onSave?.()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="workflow-header">
      <div className="workflow-header-left">
        <Space size={16}>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {workflowName}
            </Text>
            <Button type="link" size="small" style={{ marginLeft: 8 }}>
              + 添加标签
            </Button>
          </div>
        </Space>
        <div className="workflow-header-tabs">
          <span className="tab active">编辑器</span>
          <span className="tab">执行记录</span>
          <span className="tab">评估</span>
        </div>
      </div>

      <div className="workflow-header-right">
        <Space size={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Switch
              checked={isActive}
              onChange={onActiveChange}
              checkedChildren="激活"
              unCheckedChildren="未激活"
            />
          </div>

          <Button
            type="text"
            icon={<ShareAltOutlined />}
            onClick={onShare}
          >
            分享
          </Button>

          <Button
            type="text"
            icon={<SaveOutlined />}
            onClick={handleSave}
            className={saved ? 'saved' : ''}
          >
            {saved ? '已保存' : '保存'}
          </Button>

          <Button type="text" icon={<ClockCircleOutlined />} title="历史版本" />

          <Button
            type="text"
            icon={<StarOutlined />}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span style={{ fontSize: 12 }}>0</span>
          </Button>

          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      </div>
    </div>
  )
}

export default WorkflowHeader

