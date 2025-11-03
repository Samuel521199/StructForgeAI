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
  data: Record<string, any>
  schema: Schema
  file_path: string
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
  relationships: Relationship[]
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

