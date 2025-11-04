import { Button, Space } from 'antd'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  CompressOutlined,
  FullscreenOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import './WorkflowToolbar.css'

interface WorkflowToolbarProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  onAddNode: () => void
}

const WorkflowToolbar = ({
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onAddNode,
}: WorkflowToolbarProps) => {
  return (
    <div className="workflow-toolbar">
      <Space direction="vertical" size={8}>
        <Button
          type="text"
          icon={<ZoomInOutlined />}
          onClick={onZoomIn}
          title="放大"
        />
        <Button
          type="text"
          icon={<ZoomOutOutlined />}
          onClick={onZoomOut}
          title="缩小"
        />
        <Button
          type="text"
          icon={<CompressOutlined />}
          onClick={onZoomFit}
          title="适应画布"
        />
        <Button
          type="text"
          icon={<FullscreenOutlined />}
          title="全屏"
        />
        <div style={{ height: 1, background: '#e8e8e8', margin: '8px 0' }} />
        <Button
          type="text"
          icon={<PlusOutlined />}
          onClick={onAddNode}
          title="添加节点"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
          }}
        />
      </Space>
    </div>
  )
}

export default WorkflowToolbar

