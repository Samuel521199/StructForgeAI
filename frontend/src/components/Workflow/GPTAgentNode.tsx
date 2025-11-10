/**
 * GPT Agent 节点组件
 * 支持 Memory 和 Tool 外接节点连接
 */
import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { RobotOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import './AIAgentNode.css'  // 复用 AIAgentNode 的样式
import type { NodeData } from './WorkflowNode'

interface GPTAgentNodeProps extends NodeProps<NodeData> {}

const GPTAgentNode = ({ data, selected }: GPTAgentNodeProps) => {
  // 验证必需配置：API Key 是必需的
  const hasApiKey = data.config?.api_key || false
  const hasError = data.status === 'failed' || !hasApiKey

  // 底部端口配置 - 2个连接点（Memory 和 Tool，都是可选的）
  const bottomPorts = [
    { id: 'memory', label: 'Memory', required: false, icon: '💾' },
    { id: 'tool', label: 'Tool', required: false, icon: '🔧' },
  ]

  return (
    <div className={`ai-agent-node ${selected ? 'selected' : ''} ${hasError ? 'error' : ''}`}>
      {/* 1. 左侧输入端口 - 正方形 (Input) */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="ai-agent-handle ai-agent-handle-square"
        title="Input - 数据输入"
        style={{
          left: -6,
          top: '50%',
          transform: 'translateY(-50%)',
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

        {/* 中间文本 */}
        <div className="ai-agent-label">
          {data.label || 'GPT Agent'}
        </div>

        {/* 状态指示 */}
        {data.config?.system_prompt && (
          <div className="ai-agent-status-badge" title="已配置系统提示词">
            ⚙️
          </div>
        )}
        {data.config?.api_key && (
          <div className="ai-agent-status-badge" title="已配置 API Key" style={{ right: data.config?.system_prompt ? '36px' : '12px' }}>
            🔑
          </div>
        )}
      </div>

      {/* 2. 右侧输出端口 - 圆形 (Output) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="ai-agent-handle ai-agent-handle-circle"
        title="Output - 数据输出"
        style={{
          right: -6,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          background: '#262626',
          border: '2px solid #fff',
          borderRadius: '50%',
        }}
      />

      {/* 底部端口组 - 2个连接点（Memory 和 Tool） */}
      <div className="ai-agent-bottom-ports">
        {bottomPorts.map((port, index) => {
          // 检查连接状态
          const isConnected = data.config?.[`${port.id}_connected`] || false
          const isRequired = port.required && !isConnected
          const position = index === 0 ? 'left' : 'right'  // 只有2个端口，左右分布

          return (
            <div key={port.id} className={`ai-agent-bottom-port-group ai-agent-port-${position}`}>
              {/* 底部端口 - 菱形 (Memory / Tool) */}
              <Handle
                type="target"
                position={Position.Bottom}
                id={port.id}
                className={`ai-agent-handle ai-agent-handle-diamond ${isRequired ? 'required' : ''} ${isConnected ? 'connected' : ''}`}
                title={`${port.label} - ${port.id === 'memory' ? '连接记忆节点' : '连接工具节点'}`}
                style={{
                  bottom: -6,
                  left: '50%',
                  marginLeft: -6,
                  width: 12,
                  height: 12,
                  background: isConnected ? '#52c41a' : '#d9d9d9',
                  border: '2px solid #fff',
                  borderRadius: 0,
                  transform: 'rotate(45deg)',
                  transformOrigin: 'center',
                }}
              />

              {/* 端口图标和标签 */}
              <div className="ai-agent-port-content">
                <span className="ai-agent-port-icon">{port.icon}</span>
                <span className="ai-agent-port-label">{port.label}</span>
                {port.required && (
                  <span className="ai-agent-port-required">*</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default memo(GPTAgentNode)

