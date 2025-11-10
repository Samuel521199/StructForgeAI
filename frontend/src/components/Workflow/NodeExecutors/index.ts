/**
 * 节点执行器注册表
 * 统一管理所有节点类型的执行器
 */
import type { NodeType } from '../WorkflowNode'
import type { ExecutorContext } from './BaseExecutor'
import { BaseExecutor } from './BaseExecutor'
import { ParseFileExecutor } from './ParseFileExecutor'
import { EditDataExecutor } from './EditDataExecutor'
import { FilterDataExecutor } from './FilterDataExecutor'
import { ValidateDataExecutor } from './ValidateDataExecutor'
import { AnalyzeXMLStructureExecutor } from './AnalyzeXMLStructureExecutor'
import { GenerateEditorConfigExecutor } from './GenerateEditorConfigExecutor'
import { SmartEditExecutor } from './SmartEditExecutor'
import { GenerateWorkflowExecutor } from './GenerateWorkflowExecutor'
import { ChatGPTExecutor } from './ChatGPTExecutor'
import { GeminiExecutor } from './GeminiExecutor'
import { DeepSeekExecutor } from './DeepSeekExecutor'
import { MemoryExecutor } from './MemoryExecutor'
import { AIAgentExecutor } from './AIAgentExecutor'
import { GPTAgentExecutor } from './GPTAgentExecutor'
import { GeminiAgentExecutor } from './GeminiAgentExecutor'
import { ExportFileExecutor } from './ExportFileExecutor'

// 执行器工厂函数类型
type ExecutorFactory = (context: ExecutorContext) => BaseExecutor

// 执行器注册表
const executorRegistry: Record<string, ExecutorFactory> = {
  parse_file: (context) => new ParseFileExecutor(context),
  edit_data: (context) => new EditDataExecutor(context),
  filter_data: (context) => new FilterDataExecutor(context),
  validate_data: (context) => new ValidateDataExecutor(context),
  analyze_xml_structure: (context) => new AnalyzeXMLStructureExecutor(context),
  generate_editor_config: (context) => new GenerateEditorConfigExecutor(context),
  smart_edit: (context) => new SmartEditExecutor(context),
  generate_workflow: (context) => new GenerateWorkflowExecutor(context),
  chatgpt: (context) => new ChatGPTExecutor(context),
  gemini: (context) => new GeminiExecutor(context),
  deepseek: (context) => new DeepSeekExecutor(context),
  memory: (context) => new MemoryExecutor(context),
  ai_agent: (context) => new AIAgentExecutor(context),
  gpt_agent: (context) => new GPTAgentExecutor(context),
  gemini_agent: (context) => new GeminiAgentExecutor(context),
  export_file: (context) => new ExportFileExecutor(context),
}

/**
 * 获取节点执行器
 * @param nodeType 节点类型
 * @param context 执行上下文
 * @returns 执行器实例，如果不存在则返回 null
 */
export function getNodeExecutor(
  nodeType: NodeType | undefined,
  context: ExecutorContext
): BaseExecutor | null {
  if (!nodeType) return null
  
  const factory = executorRegistry[nodeType]
  if (!factory) {
    console.warn(`未找到节点类型 ${nodeType} 的执行器`)
    return null
  }
  
  return factory(context)
}

/**
 * 检查节点类型是否有执行器
 */
export function hasExecutor(nodeType: NodeType): boolean {
  return nodeType in executorRegistry
}

