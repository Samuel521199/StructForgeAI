/**
 * 节点验证视图组件
 * 为不同节点类型提供专门的验证视图，突出显示关键信息
 */
import React from 'react'
import { Card, Descriptions, Tag, Table, Space, Typography, Divider, Collapse, Alert } from 'antd'
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { NodeType } from './WorkflowNode'
import type { ParsedFile } from '@/types'

const { Text, Title } = Typography
const { Panel } = Collapse

interface ValidationViewProps {
  nodeType: NodeType
  executionResult: ParsedFile | null
}

/**
 * 解析文件节点验证视图
 */
const ParseFileValidationView: React.FC<{ result: ParsedFile }> = ({ result }) => {
  const dataCount = result.data 
    ? (Array.isArray(result.data) ? result.data.length : Object.keys(result.data).length)
    : 0
  
  const schemaFields = result.schema 
    ? (result.schema.properties ? Object.keys(result.schema.properties).length : 0)
    : 0

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Alert
        message="文件解析成功"
        description={`已解析 ${dataCount} 条数据，识别 ${schemaFields} 个字段`}
        type="success"
        icon={<CheckCircleOutlined />}
        showIcon
      />
      
      <Card title="文件信息" size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="文件路径">
            <Text code>{result.file_path}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="文件类型">
            <Tag color="blue">
              {result.file_path?.split('.').pop()?.toUpperCase() || '未知'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="数据项数">
            <Text strong>{dataCount}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Schema字段数">
            <Text strong>{schemaFields}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="数据结构预览" size="small">
        {result.schema && (
          <div style={{ marginBottom: '12px' }}>
            <Text strong>Schema类型：</Text>
            <Tag>{result.schema.type || 'object'}</Tag>
          </div>
        )}
        {result.data && Array.isArray(result.data) && result.data.length > 0 && (
          <div>
            <Text strong>第一条数据示例：</Text>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              fontSize: '12px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {JSON.stringify(result.data[0], null, 2)}
            </pre>
          </div>
        )}
      </Card>
    </Space>
  )
}

/**
 * AI分析XML结构节点验证视图
 */
const AnalyzeXMLStructureValidationView: React.FC<{ result: ParsedFile }> = ({ result }) => {
  const analysis = result.analysis
  
  if (!analysis) {
    return (
      <Alert
        message="未找到分析结果"
        description="请先执行AI分析XML结构节点"
        type="warning"
      />
    )
  }

  const enumFields = analysis.enum_fields || {}
  const numericRanges = analysis.numeric_ranges || {}
  const fieldRelationships = analysis.field_relationships || []
  const businessDomain = analysis.business_domain || '未知'
  const requiredFields = analysis.required_fields || []
  const optionalFields = analysis.optional_fields || []

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Alert
        message="AI分析完成"
        description={`业务领域：${businessDomain}`}
        type="success"
        icon={<CheckCircleOutlined />}
        showIcon
      />

      <Card title="业务领域识别" size="small">
        <Text>{businessDomain}</Text>
      </Card>

      {/* 枚举字段 */}
      {Object.keys(enumFields).length > 0 && (
        <Card title="枚举字段识别" size="small">
          <Collapse ghost>
            {Object.entries(enumFields).map(([fieldName, values]: [string, any]) => (
              <Panel 
                key={fieldName} 
                header={
                  <Space>
                    <Tag color="purple">{fieldName}</Tag>
                    <Text type="secondary">{Array.isArray(values) ? values.length : 0} 个可能值</Text>
                  </Space>
                }
              >
                <Space wrap>
                  {Array.isArray(values) ? values.map((val: any, idx: number) => (
                    <Tag key={idx} color="blue">{String(val)}</Tag>
                  )) : (
                    <Text type="secondary">无数据</Text>
                  )}
                </Space>
              </Panel>
            ))}
          </Collapse>
        </Card>
      )}

      {/* 数值范围 */}
      {Object.keys(numericRanges).length > 0 && (
        <Card title="数值范围识别" size="small">
          <Table
            dataSource={Object.entries(numericRanges).map(([field, range]: [string, any]) => ({
              key: field,
              field,
              min: range.min ?? '-',
              max: range.max ?? '-',
              default: range.default ?? '-',
            }))}
            columns={[
              { title: '字段名', dataIndex: 'field', key: 'field', width: '30%' },
              { title: '最小值', dataIndex: 'min', key: 'min', width: '20%' },
              { title: '最大值', dataIndex: 'max', key: 'max', width: '20%' },
              { title: '默认值', dataIndex: 'default', key: 'default', width: '30%' },
            ]}
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* 字段关联关系 */}
      {fieldRelationships.length > 0 && (
        <Card title="字段关联关系" size="small">
          <Table
            dataSource={fieldRelationships.map((rel: any, idx: number) => ({
              key: idx,
              field1: rel.field1 || rel.field || '-',
              field2: rel.field2 || '-',
              relation: rel.relation_type || rel.relation || '关联',
              rules: rel.relation_rules || rel.rules || '-',
            }))}
            columns={[
              { title: '字段1', dataIndex: 'field1', key: 'field1', width: '25%' },
              { title: '字段2', dataIndex: 'field2', key: 'field2', width: '25%' },
              { title: '关系类型', dataIndex: 'relation', key: 'relation', width: '20%' },
              { 
                title: '关联规则', 
                dataIndex: 'rules', 
                key: 'rules',
                width: '30%',
                render: (rules: any) => (
                  <Text code style={{ fontSize: '11px' }}>
                    {typeof rules === 'object' ? JSON.stringify(rules) : String(rules)}
                  </Text>
                )
              },
            ]}
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* 必填/可选字段 */}
      <Card title="字段约束" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>必填字段：</Text>
            <Space wrap style={{ marginTop: '8px' }}>
              {requiredFields.length > 0 ? (
                requiredFields.map((field: string, idx: number) => (
                  <Tag key={idx} color="red">{field}</Tag>
                ))
              ) : (
                <Text type="secondary">无必填字段</Text>
              )}
            </Space>
          </div>
          <Divider style={{ margin: '8px 0' }} />
          <div>
            <Text strong>可选字段：</Text>
            <Space wrap style={{ marginTop: '8px' }}>
              {optionalFields.length > 0 ? (
                optionalFields.map((field: string, idx: number) => (
                  <Tag key={idx} color="green">{field}</Tag>
                ))
              ) : (
                <Text type="secondary">无可选字段</Text>
              )}
            </Space>
          </div>
        </Space>
      </Card>
    </Space>
  )
}

/**
 * 生成编辑器配置节点验证视图
 */
const GenerateEditorConfigValidationView: React.FC<{ result: ParsedFile }> = ({ result }) => {
  const config = result.editor_config
  
  if (!config) {
    return (
      <Alert
        message="未找到编辑器配置"
        description="请先执行生成编辑器配置节点"
        type="warning"
      />
    )
  }

  const fields = config.fields || []
  const layout = config.layout || {}
  const operations = config.operations || []
  const validationRules = config.validation_rules || {}

  // 统计字段类型
  const fieldTypeStats: Record<string, number> = {}
  fields.forEach((field: any) => {
    const type = field.type || 'text'
    fieldTypeStats[type] = (fieldTypeStats[type] || 0) + 1
  })

  // 统计下拉选项
  const selectFields = fields.filter((f: any) => f.type === 'select' && f.options)

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Alert
        message="编辑器配置生成完成"
        description={`已生成 ${fields.length} 个字段配置`}
        type="success"
        icon={<CheckCircleOutlined />}
        showIcon
      />

      <Card title="配置概览" size="small">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="字段总数">
            <Text strong>{fields.length}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="操作支持">
            <Space wrap>
              {operations.map((op: string, idx: number) => (
                <Tag key={idx} color="blue">{op}</Tag>
              ))}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="布局分组">
            <Text strong>{(layout.sections || []).length}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="验证规则">
            <Text strong>{Object.keys(validationRules).length}</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 字段类型统计 */}
      <Card title="字段类型分布" size="small">
        <Space wrap>
          {Object.entries(fieldTypeStats).map(([type, count]) => (
            <Tag key={type} color="blue">
              {type}: {count}
            </Tag>
          ))}
        </Space>
      </Card>

      {/* 下拉选项 */}
      {selectFields.length > 0 && (
        <Card title="下拉选项配置" size="small">
          <Collapse ghost>
            {selectFields.map((field: any, idx: number) => (
              <Panel 
                key={idx}
                header={
                  <Space>
                    <Tag color="purple">{field.name || field.label}</Tag>
                    <Text type="secondary">
                      {Array.isArray(field.options) ? field.options.length : 0} 个选项
                    </Text>
                  </Space>
                }
              >
                <Space wrap>
                  {Array.isArray(field.options) ? field.options.map((opt: any, optIdx: number) => (
                    <Tag key={optIdx} color="blue">
                      {typeof opt === 'object' ? opt.label || opt.value : String(opt)}
                    </Tag>
                  )) : (
                    <Text type="secondary">无选项</Text>
                  )}
                </Space>
                {field.tooltip && (
                  <div style={{ marginTop: '8px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      <InfoCircleOutlined /> {field.tooltip}
                    </Text>
                  </div>
                )}
              </Panel>
            ))}
          </Collapse>
        </Card>
      )}

      {/* 验证规则 */}
      {Object.keys(validationRules).length > 0 && (
        <Card title="验证规则" size="small">
          <Table
            dataSource={Object.entries(validationRules).map(([field, rules]: [string, any]) => ({
              key: field,
              field,
              rules: typeof rules === 'object' ? JSON.stringify(rules, null, 2) : String(rules),
            }))}
            columns={[
              { title: '字段', dataIndex: 'field', key: 'field', width: '30%' },
              { 
                title: '验证规则', 
                dataIndex: 'rules', 
                key: 'rules',
                render: (rules: string) => (
                  <pre style={{ 
                    margin: 0, 
                    fontSize: '11px', 
                    background: '#f5f5f5', 
                    padding: '8px',
                    borderRadius: '4px'
                  }}>
                    {rules}
                  </pre>
                )
              },
            ]}
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* 布局配置 */}
      {layout.sections && layout.sections.length > 0 && (
        <Card title="布局分组" size="small">
          <Collapse ghost>
            {layout.sections.map((section: any, idx: number) => (
              <Panel 
                key={idx}
                header={
                  <Space>
                    <Text strong>{section.title || `分组 ${idx + 1}`}</Text>
                    <Text type="secondary">
                      {Array.isArray(section.fields) ? section.fields.length : 0} 个字段
                    </Text>
                  </Space>
                }
              >
                <Space wrap>
                  {Array.isArray(section.fields) ? section.fields.map((field: string, fIdx: number) => (
                    <Tag key={fIdx}>{field}</Tag>
                  )) : (
                    <Text type="secondary">无字段</Text>
                  )}
                </Space>
              </Panel>
            ))}
          </Collapse>
        </Card>
      )}
    </Space>
  )
}

/**
 * 主验证视图组件
 */
export const NodeValidationView: React.FC<ValidationViewProps> = ({ nodeType, executionResult }) => {
  if (!executionResult) {
    return (
      <Alert
        message="暂无执行结果"
        description="请先执行节点以查看验证信息"
        type="info"
      />
    )
  }

  switch (nodeType) {
    case 'parse_file':
      return <ParseFileValidationView result={executionResult} />
    case 'analyze_xml_structure':
      return <AnalyzeXMLStructureValidationView result={executionResult} />
    case 'generate_editor_config':
      return <GenerateEditorConfigValidationView result={executionResult} />
    default:
      return (
        <Alert
          message="通用输出"
          description="该节点类型暂无专门的验证视图"
          type="info"
        />
      )
  }
}

