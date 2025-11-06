/**
 * 节点配置组件注册表
 * 统一管理所有节点类型的配置组件
 */
import React from 'react'
import type { NodeType } from '../WorkflowNode'
import type { FormInstance } from 'antd'
import { ParseFileConfig } from './ParseFileConfig'
import { EditDataConfig } from './EditDataConfig'
import { FilterDataConfig } from './FilterDataConfig'
import { ValidateDataConfig } from './ValidateDataConfig'
import { AnalyzeXMLStructureConfig } from './AnalyzeXMLStructureConfig'
import { GenerateEditorConfigConfig } from './GenerateEditorConfigConfig'
import { SmartEditConfig } from './SmartEditConfig'
import { GenerateWorkflowConfig } from './GenerateWorkflowConfig'
import { ChatGPTConfig } from './ChatGPTConfig'
import { GeminiConfig } from './GeminiConfig'
import { DeepSeekConfig } from './DeepSeekConfig'
import { MemoryConfig } from './MemoryConfig'

// 配置组件属性接口
export interface NodeConfigProps {
  form: FormInstance
  filePathValue?: string
  setFilePathValue?: (value: string) => void
  onFileSelect?: (fieldName: 'file_path' | 'output_path') => void
  onConfigChange?: () => void
}

// 配置组件类型
type ConfigComponent = React.FC<NodeConfigProps>

// 配置组件注册表
const configRegistry: Partial<Record<NodeType, ConfigComponent>> = {
  parse_file: ParseFileConfig,
  edit_data: EditDataConfig,
  filter_data: FilterDataConfig,
  validate_data: ValidateDataConfig,
  analyze_xml_structure: AnalyzeXMLStructureConfig,
  generate_editor_config: GenerateEditorConfigConfig,
  smart_edit: SmartEditConfig,
  generate_workflow: GenerateWorkflowConfig,
  chatgpt: ChatGPTConfig,
  gemini: GeminiConfig,
  deepseek: DeepSeekConfig,
  memory: MemoryConfig,
  // 其他节点配置组件将在后续添加
}

/**
 * 获取节点配置组件
 * @param nodeType 节点类型
 * @returns 配置组件，如果不存在则返回 null
 */
export function getNodeConfigComponent(
  nodeType: NodeType | undefined
): ConfigComponent | null {
  if (!nodeType) return null
  
  const Component = configRegistry[nodeType]
  if (!Component) {
    console.warn(`未找到节点类型 ${nodeType} 的配置组件`)
    return null
  }
  
  return Component
}

/**
 * 检查节点类型是否有配置组件
 */
export function hasConfigComponent(nodeType: NodeType): boolean {
  return nodeType in configRegistry
}

