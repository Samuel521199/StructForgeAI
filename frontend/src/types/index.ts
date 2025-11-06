// API Response Types
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

// File Types
export interface UploadedFile {
  filename: string
  path: string
  size: number
  modified?: number
}

export interface ParsedFile {
  data?: Record<string, any>
  schema?: Schema
  file_path?: string
  hasData?: boolean
  hasSchema?: boolean
  hasAnalysis?: boolean
  // AI workflow results
  analysis?: any // XML structure analysis result
  editor_config?: any // Editor configuration
  generated_workflow?: any // Generated workflow definition
  smart_edit_result?: any // Smart edit result
  chat_model_response?: {
    model: string
    content: string
    usage?: any
    raw_response?: any
    prompt?: string
    model_type?: string
  }
  memory_result?: {
    operation: 'store' | 'retrieve' | 'search' | 'delete'
    memory_type?: string
    key?: string
    memories?: any[]
    count?: number
    deleted_count?: number
    stored_at?: string
    retrieved_at?: string
    searched_at?: string
    deleted_at?: string
    query?: string
    success?: boolean
  }
  validation?: {
    valid: boolean
    errors?: string[]
    warnings?: string[]
  }
}

// Schema Types
export interface Schema {
  type: string
  properties?: Record<string, SchemaField>
  fields?: Record<string, SchemaField>
  columns?: Record<string, SchemaField>
}

export interface SchemaField {
  type: string
  description?: string
  path?: string
  position?: number
}

export interface SchemaAnalysisResult {
  schema: Schema
  relationships?: Relationship[]
  base_schema?: Schema
}

export interface Relationship {
  from: string
  to: string
  type: 'reference' | 'dependency' | 'composition'
}

// Intent Types
export interface Intent {
  action: 'create' | 'update' | 'delete' | 'copy' | 'error'
  target?: string
  value?: any
  modifications?: Array<{
    field: string
    value?: any
    operation?: string
  }>
  constraints?: string[]
}

export interface IntentInferenceResult {
  intent: Intent
  instruction: string
}

// Workflow Types
export interface WorkflowInfo {
  workflow_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  type: 'default' | 'custom'
}

export interface WorkflowExecution {
  execution_id: string
  workflow_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at?: string
  steps: WorkflowStep[]
  error?: string
}

export interface WorkflowStep {
  step: string
  status: 'running' | 'completed' | 'failed'
  started_at: string
  completed_at?: string
  result?: any
  error?: string
}

// AI Types
export interface AIModel {
  id: string
  name: string
  provider: string
  recommended?: boolean
}

