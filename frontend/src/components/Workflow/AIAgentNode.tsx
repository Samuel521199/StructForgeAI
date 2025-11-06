import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { RobotOutlined, PlusOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import './AIAgentNode.css'
import type { NodeData } from './WorkflowNode'

interface AIAgentNodeProps extends NodeProps<NodeData> {}

const AIAgentNode = ({ data, selected }: AIAgentNodeProps) => {
  const validation = data.config
    ? (data.config.chat_model || data.config.memory || data.config.tool ? true : false)
    : false
  const hasError = data.status === 'failed' || !validation

  // 底部端口配置
  const bottomPorts = [
    { id: 'chat_model', label: 'Chat Model*', required: true },
    { id: 'memory', label: 'Memory', required: false },
    { id: 'tool', label: 'Tool', required: false },
  ]

  return (
    <div className={`ai-agent-node ${selected ? 'selected' : ''} ${hasError ? 'error' : ''}`}>
      {/* 左侧输入端口 - 正方形 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="ai-agent-handle ai-agent-handle-square"
        style={{
          left: -6,
          width: 12,
          height: 12,
          background: '#262626',
          border: '2px solid #fff',
          borderRadius: 2,
        }}
      />

      {/* 主节点容器 - 横向延长的矩形 */}
      <div className="ai-agent-node-body">
        {/* 错误指示器 - 右上角 */}
        {hasError && (
          <div className="ai-agent-error-indicator" title="配置错误或执行失败">
            <ExclamationCircleOutlined />
          </div>
        )}

        {/* 左侧图标 */}
        <div className="ai-agent-icon">
          <RobotOutlined />
        </div>

        {/* 右侧文本 */}
        <div className="ai-agent-label">
          {data.label || 'AI Agent'}
        </div>
      </div>

      {/* 右侧输出端口 - 圆形 */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="ai-agent-handle ai-agent-handle-circle"
        style={{
          right: -6,
          width: 12,
          height: 12,
          background: '#262626',
          border: '2px solid #fff',
          borderRadius: '50%',
        }}
      />

      {/* 底部端口组 */}
      <div className="ai-agent-bottom-ports">
        {bottomPorts.map((port) => {
          const isConnected = data.config?.[port.id] !== undefined
          const isRequired = port.required && !isConnected

          return (
            <div key={port.id} className="ai-agent-bottom-port-group">
              {/* 菱形端口 */}
              <Handle
                type="target"
                position={Position.Bottom}
                id={port.id}
                className={`ai-agent-handle ai-agent-handle-diamond ${isRequired ? 'required' : ''}`}
                style={{
                  bottom: -6,
                  left: '50%',
                  marginLeft: -6,
                  width: 12,
                  height: 12,
                  background: isConnected ? '#262626' : '#d9d9d9',
                  border: '2px solid #fff',
                  borderRadius: 0,
                  transform: 'rotate(45deg)',
                  transformOrigin: 'center',
                }}
              />

              {/* 端口标签 */}
              <div className="ai-agent-port-label">{port.label}</div>

              {/* 添加按钮 */}
              <button
                className="ai-agent-add-button"
                onClick={(e) => {
                  e.stopPropagation()
                  // TODO: 打开配置对话框
                  console.log(`Add ${port.id}`)
                }}
                title={`添加 ${port.label}`}
              >
                <PlusOutlined />
              </button>
            </div>
          )
        })}
      </div>

      {/* 右侧输出端口旁边的 "+" 按钮 */}
      <button
        className="ai-agent-add-output-button"
        onClick={(e) => {
          e.stopPropagation()
          // TODO: 添加输出连接
          console.log('Add output connection')
        }}
        title="添加输出连接"
      >
        <PlusOutlined />
      </button>
    </div>
  )
}

export default memo(AIAgentNode)

