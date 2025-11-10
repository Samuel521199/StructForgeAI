import { useState, useMemo } from 'react'
import { Modal, Input, Collapse, List, Typography, Space, Empty } from 'antd'
import {
  FileTextOutlined,
  ApiOutlined,
  CommentOutlined,
  ToolOutlined,
  ExportOutlined,
  EditOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  SettingOutlined,
  BulbOutlined,
  FileSyncOutlined,
  SearchOutlined,
  FolderOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import type { NodeType } from './WorkflowNode'

const { Text } = Typography
const { Search } = Input
const { Panel } = Collapse

interface NodeSelectorProps {
  open: boolean
  onSelect: (nodeType: NodeType) => void
  onCancel: () => void
}

interface NodeOption {
  type: NodeType
  label: string
  description: string
  icon: JSX.Element
  color: string
  category: string
  subCategory: string
}

const nodeOptions: NodeOption[] = [
  // 文件操作类
  {
    type: 'parse_file',
    label: '解析文件',
    description: '读取并解析配置文件（XML、JSON、YAML、CSV、Excel等）',
    icon: <FileTextOutlined />,
    color: '#1890ff',
    category: '文件操作',
    subCategory: '文件读取',
  },
  {
    type: 'export_file',
    label: '导出文件',
    description: '导出处理后的数据到文件',
    icon: <ExportOutlined />,
    color: '#eb2f96',
    category: '文件操作',
    subCategory: '文件输出',
  },
  // 数据分析类
  {
    type: 'analyze_schema',
    label: '分析Schema',
    description: '深度分析数据结构',
    icon: <ApiOutlined />,
    color: '#52c41a',
    category: '数据分析',
    subCategory: '结构分析',
  },
  {
    type: 'analyze_xml_structure',
    label: 'AI分析XML结构',
    description: '使用AI分析XML文件的完整结构、字段类型、枚举值、数值范围等',
    icon: <RobotOutlined />,
    color: '#722ed1',
    category: '数据分析',
    subCategory: 'AI分析',
  },
  // 数据处理类
  {
    type: 'edit_data',
    label: '编辑数据',
    description: '创建、修改或删除数据条目（支持批量操作）',
    icon: <EditOutlined />,
    color: '#13c2c2',
    category: '数据处理',
    subCategory: '数据编辑',
  },
  {
    type: 'filter_data',
    label: '过滤数据',
    description: '根据条件过滤数据',
    icon: <FilterOutlined />,
    color: '#2f54eb',
    category: '数据处理',
    subCategory: '数据筛选',
  },
  {
    type: 'validate_data',
    label: '验证数据',
    description: '验证数据格式和完整性',
    icon: <CheckCircleOutlined />,
    color: '#faad14',
    category: '数据处理',
    subCategory: '数据验证',
  },
  // AI智能类
  {
    type: 'generate_editor_config',
    label: '生成编辑器配置',
    description: '根据XML结构生成编辑器配置（表单字段、验证规则、布局等）',
    icon: <SettingOutlined />,
    color: '#13c2c2',
    category: 'AI智能',
    subCategory: '配置生成',
  },
  {
    type: 'smart_edit',
    label: '智能编辑',
    description: '基于AI理解的自然语言编辑',
    icon: <BulbOutlined />,
    color: '#eb2f96',
    category: 'AI智能',
    subCategory: '智能操作',
  },
  {
    type: 'generate_workflow',
    label: '生成工作流',
    description: '根据分析结果自动生成工作流',
    icon: <FileSyncOutlined />,
    color: '#52c41a',
    category: 'AI智能',
    subCategory: '工作流生成',
  },
  // 传统处理类
  {
    type: 'process_natural_language',
    label: '自然语言处理',
    description: '理解自然语言指令',
    icon: <CommentOutlined />,
    color: '#722ed1',
    category: '传统处理',
    subCategory: '语言处理',
  },
  {
    type: 'apply_operations',
    label: '应用操作',
    description: '执行数据修改操作',
    icon: <ToolOutlined />,
    color: '#fa8c16',
    category: '传统处理',
    subCategory: '操作执行',
  },
  // AI Agent 节点（特殊节点）
  {
    type: 'ai_agent',
    label: 'AI Agent',
    description: '智能AI代理节点，支持多输入输出和工具集成',
    icon: <RobotOutlined />,
    color: '#722ed1',
    category: 'AI智能',
    subCategory: '智能代理',
  },
  // GPT Agent 节点（合并 AIAgent 和 ChatModel）
  {
    type: 'gpt_agent',
    label: 'GPT Agent',
    description: '强大的 GPT Agent 节点，合并 AIAgent 和 ChatModel 功能，支持 ChatGPT Responses API 完整特性（文字、图片、文件、MCP服务、多Agent协作）',
    icon: <RobotOutlined />,
    color: '#10a37f',
    category: 'AI智能',
    subCategory: 'GPT代理',
  },
  // Gemini Agent 节点
  {
    type: 'gemini_agent',
    label: 'Gemini Agent',
    description: '强大的 Gemini Agent 节点，支持 Google Gemini API 完整特性（文字、图片、系统提示词、数据处理、缓存机制）',
    icon: <RobotOutlined />,
    color: '#4285f4',
    category: 'AI智能',
    subCategory: 'Gemini代理',
  },
  // ChatGPT 节点
  {
    type: 'chatgpt',
    label: 'ChatGPT',
    description: 'OpenAI 的 ChatGPT 模型，功能强大，支持多种模型版本',
    icon: <ApiOutlined />,
    color: '#10a37f',
    category: 'Chat模型',
    subCategory: 'OpenAI',
  },
  // Gemini 节点
  {
    type: 'gemini',
    label: 'Gemini',
    description: 'Google 的 Gemini 模型，免费额度较高，性能优秀',
    icon: <ApiOutlined />,
    color: '#4285f4',
    category: 'Chat模型',
    subCategory: 'Google',
  },
  // DeepSeek 节点
  {
    type: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek 是国产AI模型，性价比高，支持长上下文',
    icon: <ApiOutlined />,
    color: '#1890ff',
    category: 'Chat模型',
    subCategory: 'DeepSeek',
  },
  // Memory 节点
  {
    type: 'memory',
    label: 'Memory',
    description: '工作流记忆节点，存储和检索上下文信息、历史结果',
    icon: <DatabaseOutlined />,
    color: '#52c41a',
    category: 'AI智能',
    subCategory: '记忆管理',
  },
]

// 分类图标映射
const categoryIcons: Record<string, JSX.Element> = {
  文件操作: <FolderOutlined />,
  数据分析: <DatabaseOutlined />,
  数据处理: <ThunderboltOutlined />,
  AI智能: <ExperimentOutlined />,
  Chat模型: <ApiOutlined />,
  传统处理: <ToolOutlined />,
}

const NodeSelector = ({ open, onSelect, onCancel }: NodeSelectorProps) => {
  const [searchText, setSearchText] = useState('')
  const [activeKeys, setActiveKeys] = useState<string[]>([])

  // 过滤节点
  const filteredNodes = useMemo(() => {
    if (!searchText.trim()) {
      return nodeOptions
    }
    const lowerSearch = searchText.toLowerCase()
    return nodeOptions.filter(
      (node) =>
        node.label.toLowerCase().includes(lowerSearch) ||
        node.description.toLowerCase().includes(lowerSearch) ||
        node.category.toLowerCase().includes(lowerSearch) ||
        node.subCategory.toLowerCase().includes(lowerSearch) ||
        node.type.toLowerCase().includes(lowerSearch)
    )
  }, [searchText])

  // 按分类组织节点
  const categorizedNodes = useMemo(() => {
    const categories: Record<string, Record<string, NodeOption[]>> = {}
    
    filteredNodes.forEach((node) => {
      if (!categories[node.category]) {
        categories[node.category] = {}
      }
      if (!categories[node.category][node.subCategory]) {
        categories[node.category][node.subCategory] = []
      }
      categories[node.category][node.subCategory].push(node)
    })

    return categories
  }, [filteredNodes])

  // 初始化时展开所有分类
  const defaultActiveKeys = useMemo(() => {
    return Object.keys(categorizedNodes)
  }, [categorizedNodes])

  const handleSelect = (nodeType: NodeType) => {
    onSelect(nodeType)
    onCancel()
    // 重置搜索和展开状态
    setSearchText('')
    setActiveKeys([])
  }

  const handleCancel = () => {
    onCancel()
    // 重置搜索和展开状态
    setSearchText('')
    setActiveKeys([])
  }

  return (
    <Modal
      title="选择节点类型"
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={700}
      style={{ top: 20 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Search
          placeholder="搜索节点名称、描述或类型..."
          allowClear
          size="large"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {Object.keys(categorizedNodes).length === 0 ? (
        <Empty description="未找到匹配的节点" style={{ margin: '40px 0' }} />
      ) : (
        <Collapse
          activeKey={activeKeys.length > 0 ? activeKeys : defaultActiveKeys}
          onChange={setActiveKeys}
          style={{ maxHeight: '60vh', overflowY: 'auto' }}
        >
          {Object.entries(categorizedNodes).map(([category, subCategories]) => (
            <Panel
              key={category}
              header={
                <Space>
                  <span style={{ color: '#1890ff' }}>{categoryIcons[category]}</span>
                  <Text strong>{category}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ({Object.values(subCategories).flat().length} 个节点)
                  </Text>
                </Space>
              }
            >
              {Object.entries(subCategories).map(([subCategory, nodes]) => (
                <div key={subCategory} style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    {subCategory}
                  </Text>
                  <List
                    dataSource={nodes}
                    renderItem={(item) => (
                      <List.Item
                        style={{
                          cursor: 'pointer',
                          padding: '12px',
                          borderRadius: '4px',
                          marginTop: 8,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f5f5f5'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent'
                        }}
                        onClick={() => handleSelect(item.type)}
                      >
                        <Space>
                          <div style={{ color: item.color, fontSize: 24 }}>
                            {item.icon}
                          </div>
                          <div style={{ flex: 1 }}>
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
                </div>
              ))}
            </Panel>
          ))}
        </Collapse>
      )}
    </Modal>
  )
}

export default NodeSelector

