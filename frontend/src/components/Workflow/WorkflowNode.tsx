import { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import {
  FileTextOutlined,
  ApiOutlined,
  CommentOutlined,
  ToolOutlined,
  ExportOutlined,
  ThunderboltOutlined,
  EditOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  SettingOutlined,
  BulbOutlined,
  FileSyncOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import './WorkflowNode.css'

export type NodeType =
  | 'parse_file'
  | 'analyze_schema'
  | 'process_natural_language'
  | 'apply_operations'
  | 'export_file'
  | 'edit_data'
  | 'filter_data'
  | 'validate_data'
  | 'analyze_xml_structure'
  | 'generate_editor_config'
  | 'smart_edit'
  | 'generate_workflow'
  | 'ai_agent'
  | 'gpt_agent'
  | 'gemini_agent'
  | 'chatgpt'
  | 'gemini'
  | 'deepseek'
  | 'memory'

interface NodeData {
  label: string
  type: NodeType
  description?: string
  config?: Record<string, any>
  status?: 'pending' | 'running' | 'completed' | 'failed'
}

// 节点配置验证函数
const validateNodeConfig = (type: NodeType, config?: Record<string, any>): { isValid: boolean; missingFields: string[] } => {
  if (!config) {
    config = {}
  }
  
  const missingFields: string[] = []
  
  switch (type) {
    case 'parse_file':
      if (!config.file_path || config.file_path.trim() === '') {
        missingFields.push('file_path')
      }
      break
    case 'export_file':
      if (!config.output_path || config.output_path.trim() === '') {
        missingFields.push('output_path')
      }
      break
    case 'process_natural_language':
      if (!config.instruction || config.instruction.trim() === '') {
        missingFields.push('instruction')
      }
      break
    case 'edit_data':
      if (!config.operation || !['create', 'update', 'delete'].includes(config.operation)) {
        missingFields.push('operation')
      }
      if (!config.path || config.path.trim() === '') {
        missingFields.push('path')
      }
      break
    case 'filter_data':
      if (!config.filter_condition || Object.keys(config.filter_condition).length === 0) {
        missingFields.push('filter_condition')
      }
      break
    case 'validate_data':
      // validate_data 通常不需要强制配置
      break
    case 'analyze_xml_structure':
      // analyze_xml_structure 从上游节点获取数据
      break
    case 'generate_editor_config':
      if (!config.xml_structure || Object.keys(config.xml_structure).length === 0) {
        missingFields.push('xml_structure')
      }
      break
    case 'smart_edit':
      if (!config.instruction || config.instruction.trim() === '') {
        missingFields.push('instruction')
      }
      break
    case 'generate_workflow':
      // generate_workflow 从上游节点获取数据
      break
    case 'gpt_agent':
    case 'gemini_agent':
      if (!config.api_key || config.api_key.trim() === '') {
        missingFields.push('api_key')
      }
      if (!config.api_url || config.api_url.trim() === '') {
        missingFields.push('api_url')
      }
      break
    case 'chatgpt':
    case 'gemini':
    case 'deepseek':
      if (!config.api_key || config.api_key.trim() === '') {
        missingFields.push('api_key')
      }
      if (!config.api_url || config.api_url.trim() === '') {
        missingFields.push('api_url')
      }
      if (!config.request_body || config.request_body.trim() === '') {
        missingFields.push('request_body')
      }
      break
    case 'memory':
      if (!config.operation) {
        missingFields.push('operation')
      }
      if (!config.memory_type) {
        missingFields.push('memory_type')
      }
      if (config.operation === 'store' && !config.key) {
        missingFields.push('key')
      }
      break
    // analyze_schema 和 apply_operations 通常不需要强制配置
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  }
}

// 获取节点显示的重要信息
const getNodeDisplayInfo = (type: NodeType, config?: Record<string, any>): string | null => {
  if (!config) return null
  
  switch (type) {
    case 'parse_file':
      return config.file_path ? `文件: ${config.file_path.split('/').pop()}` : null
    case 'export_file':
      return config.output_path ? `输出: ${config.output_path.split('/').pop()}` : null
    case 'process_natural_language':
      return config.instruction ? config.instruction.substring(0, 30) + (config.instruction.length > 30 ? '...' : '') : null
    case 'analyze_schema':
      return config.use_ai ? 'AI分析' : '规则分析'
    case 'edit_data':
      return config.operation ? `${config.operation} @ ${config.path}` : null
    case 'filter_data':
      return config.filter_condition ? `过滤条件: ${Object.keys(config.filter_condition).join(', ')}` : null
    case 'validate_data':
      return config.required_fields ? `验证字段: ${config.required_fields.length}` : null
    case 'analyze_xml_structure':
      return 'AI结构分析'
    case 'generate_editor_config':
      return config.editor_type ? `生成${config.editor_type}编辑器` : null
    case 'smart_edit':
      return config.instruction ? config.instruction.substring(0, 20) + '...' : null
    case 'generate_workflow':
      return config.workflow_type ? `生成${config.workflow_type}工作流` : null
    case 'gpt_agent':
      return config.model ? `GPT Agent (${config.model})` : 'GPT Agent'
    case 'gemini_agent':
      return config.model ? `Gemini Agent (${config.model})` : 'Gemini Agent'
    case 'chatgpt':
      return config.model ? `ChatGPT (${config.model})` : 'ChatGPT'
    case 'gemini':
      return config.model ? `Gemini (${config.model})` : 'Gemini'
    case 'deepseek':
      return config.model ? `DeepSeek (${config.model})` : 'DeepSeek'
    case 'memory':
      return config.operation ? `Memory (${config.operation})` : 'Memory'
    default:
      return null
  }
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
  edit_data: {
    icon: <EditOutlined />,
    color: '#13c2c2',
  },
  filter_data: {
    icon: <FilterOutlined />,
    color: '#2f54eb',
  },
  validate_data: {
    icon: <CheckCircleOutlined />,
    color: '#faad14',
  },
  analyze_xml_structure: {
    icon: <RobotOutlined />,
    color: '#722ed1',
  },
  generate_editor_config: {
    icon: <SettingOutlined />,
    color: '#13c2c2',
  },
  smart_edit: {
    icon: <BulbOutlined />,
    color: '#eb2f96',
  },
  generate_workflow: {
    icon: <FileSyncOutlined />,
    color: '#52c41a',
  },
  ai_agent: {
    icon: <RobotOutlined />,
    color: '#722ed1',
  },
  gpt_agent: {
    icon: <RobotOutlined />,
    color: '#10a37f',
  },
  gemini_agent: {
    icon: <RobotOutlined />,
    color: '#4285f4',
  },
  chatgpt: {
    icon: <ApiOutlined />,
    color: '#10a37f',
  },
  gemini: {
    icon: <ApiOutlined />,
    color: '#4285f4',
  },
  deepseek: {
    icon: <ApiOutlined />,
    color: '#1890ff',
  },
  memory: {
    icon: <DatabaseOutlined />,
    color: '#52c41a',
  },
}

const WorkflowNode = ({ data, selected }: NodeProps<NodeData>) => {
  // AI Agent 节点使用特殊组件
  if (data.type === 'ai_agent') {
    return null // 将在 WorkflowCanvas 中使用 AIAgentNode
  }

  const config = nodeConfig[data.type]
  
  // 安全检查：如果节点类型未配置，使用默认配置
  if (!config) {
    console.warn(`节点类型 ${data.type} 未在 nodeConfig 中配置，使用默认配置`)
    return (
      <div className={`workflow-node ${selected ? 'selected' : ''}`}>
        <div style={{ padding: '16px', textAlign: 'center', color: '#8c8c8c' }}>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
            {data.label || data.type}
          </div>
          <div style={{ fontSize: 12 }}>
            未配置的节点类型
          </div>
        </div>
      </div>
    )
  }
  
  const validation = validateNodeConfig(data.type, data.config)
  const displayInfo = getNodeDisplayInfo(data.type, data.config)
  const isTrigger = data.type === 'parse_file'
  
  const statusColors = {
    pending: '#d9d9d9',
    running: '#1890ff',
    completed: '#52c41a',
    failed: '#ff4d4f',
  }
  
  // 节点状态：未配置、已配置、执行中
  const nodeState = data.status ? 'executing' : (validation.isValid ? 'configured' : 'unconfigured')

  return (
    <div className={`workflow-node ${selected ? 'selected' : ''} ${nodeState}`}>
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="workflow-handle"
          style={{
            background: nodeState === 'unconfigured' ? '#ffccc7' : '#d9d9d9',
            width: 8,
            height: 8,
            border: 'none',
            opacity: nodeState === 'unconfigured' ? 0.5 : 1,
          }}
        />
      )}
      
      <div
        className="workflow-node-card"
        style={{
          width: 160,
          minHeight: 140,
          background: nodeState === 'unconfigured' ? '#fafafa' : '#fff',
          border: `1px solid ${selected ? config.color : (nodeState === 'unconfigured' ? '#ffccc7' : '#d9d9d9')}`,
          borderRadius: 8,
          padding: '16px 12px',
          boxShadow: selected ? `0 0 0 2px ${config.color}20` : '0 1px 4px rgba(0,0,0,0.08)',
          transition: 'all 0.2s',
          opacity: nodeState === 'unconfigured' ? 0.7 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* 触发节点标记 */}
        {isTrigger && (
          <div
            style={{
              position: 'absolute',
              left: -4,
              top: 8,
            }}
          >
            <ThunderboltOutlined
              style={{
                color: '#ff4d4f',
                fontSize: 12,
              }}
            />
          </div>
        )}
        
        {/* 未配置警告 */}
        {nodeState === 'unconfigured' && (
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#ff4d4f',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 'bold',
            }}
            title="需要配置"
          >
            !
          </div>
        )}
        
        {/* 大图标 - 居中显示 */}
        <div
          className="workflow-node-icon"
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            background: nodeState === 'unconfigured' ? `${config.color}10` : `${config.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: config.color,
            fontSize: 24,
            marginBottom: 12,
            flexShrink: 0,
          }}
        >
          {config.icon}
        </div>
        
        {/* 节点标签 */}
        <div
          style={{
            fontWeight: 500,
            fontSize: 13,
            color: nodeState === 'unconfigured' ? '#8c8c8c' : '#262626',
            lineHeight: 1.4,
            marginBottom: 8,
            width: '100%',
          }}
        >
          {data.label}
        </div>
        
        {/* 显示重要信息或描述 */}
        {displayInfo ? (
          <div
            style={{
              fontSize: 11,
              color: '#8c8c8c',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
              padding: '4px 8px',
              background: '#f5f5f5',
              borderRadius: 4,
              marginTop: 'auto',
            }}
            title={displayInfo}
          >
            {displayInfo}
          </div>
        ) : data.description ? (
          <div
            style={{
              fontSize: 11,
              color: '#8c8c8c',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
            }}
            title={data.description}
          >
            {data.description}
          </div>
        ) : null}
        
        {/* 执行状态 */}
        {data.status && (
          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusColors[data.status],
              }}
            />
            <span style={{ fontSize: 11, color: '#8c8c8c' }}>
              {data.status}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="workflow-handle"
        style={{
          background: nodeState === 'unconfigured' ? '#ffccc7' : '#d9d9d9',
          width: 8,
          height: 8,
          border: 'none',
          opacity: nodeState === 'unconfigured' ? 0.5 : 1,
        }}
      />
    </div>
  )
}

export default memo(WorkflowNode)

