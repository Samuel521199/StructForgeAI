import { memo } from 'react'
import { Handle, Position, NodeProps } from 'react-flow-renderer'
import { Card } from 'antd'
import {
  FileTextOutlined,
  ApiOutlined,
  CommentOutlined,
  ToolOutlined,
  ExportOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import './WorkflowNode.css'

export type NodeType =
  | 'parse_file'
  | 'analyze_schema'
  | 'process_natural_language'
  | 'apply_operations'
  | 'export_file'

interface NodeData {
  label: string
  type: NodeType
  description?: string
  config?: Record<string, any>
  status?: 'pending' | 'running' | 'completed' | 'failed'
}

const nodeConfig: Record<NodeType, { icon: JSX.Element; color: string }> = {
  parse_file: {
    icon: <FileTextOutlined />,
    color: '#1890ff',
  },
  analyze_schema: {
    icon: <ApiOutlined />,
    color: '#52c41a',
  },
  process_natural_language: {
    icon: <CommentOutlined />,
    color: '#722ed1',
  },
  apply_operations: {
    icon: <ToolOutlined />,
    color: '#fa8c16',
  },
  export_file: {
    icon: <ExportOutlined />,
    color: '#eb2f96',
  },
}

const WorkflowNode = ({ data, selected }: NodeProps<NodeData>) => {
  const config = nodeConfig[data.type]
  const statusColors = {
    pending: '#d9d9d9',
    running: '#1890ff',
    completed: '#52c41a',
    failed: '#ff4d4f',
  }

  return (
    <div className={`workflow-node ${selected ? 'selected' : ''}`}>
      {data.type !== 'parse_file' && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            background: config.color,
            width: 12,
            height: 12,
            border: '2px solid #fff',
          }}
        />
      )}
      
      <Card
        size="small"
        style={{
          width: 200,
          borderColor: selected ? config.color : undefined,
          borderWidth: selected ? 2 : 1,
        }}
        bodyStyle={{ padding: '12px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              color: config.color,
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {config.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: '#262626',
              }}
            >
              {data.label}
            </div>
            {data.description && (
              <div
                style={{
                  fontSize: 11,
                  color: '#8c8c8c',
                  marginTop: 4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {data.description}
              </div>
            )}
          </div>
          {data.type === 'parse_file' && (
            <div
              style={{
                position: 'absolute',
                left: -6,
                top: 12,
                width: 0,
                height: 0,
              }}
            >
              <ThunderboltOutlined
                style={{
                  color: '#ff4d4f',
                  fontSize: 12,
                  position: 'absolute',
                  left: -10,
                }}
              />
            </div>
          )}
        </div>
        
        {data.status && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: statusColors[data.status],
              }}
            />
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>
              {data.status}
            </span>
          </div>
        )}
      </Card>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: config.color,
          width: 12,
          height: 12,
          border: '2px solid #fff',
        }}
      />
    </div>
  )
}

export default memo(WorkflowNode)

