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
 * 统计XML结构信息
 */
const analyzeXMLStructure = (data: any): {
  rootElement?: string
  childElements: Record<string, number>
  totalElements: number
  attributes: Record<string, number>
  maxDepth: number
} => {
  const stats = {
    rootElement: undefined as string | undefined,
    childElements: {} as Record<string, number>,
    totalElements: 0,
    attributes: {} as Record<string, number>,
    maxDepth: 0,
  }

  const countElements = (obj: any, depth: number = 0, parentKey?: string): void => {
    if (!obj || typeof obj !== 'object') return

    stats.maxDepth = Math.max(stats.maxDepth, depth)

    if (depth === 0 && !parentKey) {
      // 根元素
      const keys = Object.keys(obj).filter(k => k !== '@attributes' && k !== '#text')
      if (keys.length > 0) {
        stats.rootElement = keys[0]
      }
    }

    if (Array.isArray(obj)) {
      stats.totalElements += obj.length
      obj.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          countElements(item, depth + 1, parentKey)
        }
      })
      return
    }

    Object.keys(obj).forEach((key) => {
      if (key === '@attributes') {
        // 统计属性
        const attrs = obj[key]
        if (typeof attrs === 'object') {
          Object.keys(attrs).forEach((attrKey) => {
            stats.attributes[attrKey] = (stats.attributes[attrKey] || 0) + 1
          })
        }
      } else if (key !== '#text') {
        const value = obj[key]
        
        if (Array.isArray(value)) {
          // 数组元素
          stats.childElements[key] = (stats.childElements[key] || 0) + value.length
          stats.totalElements += value.length
          value.forEach((item) => {
            if (typeof item === 'object' && item !== null) {
              countElements(item, depth + 1, key)
            }
          })
        } else if (typeof value === 'object' && value !== null) {
          // 对象元素
          stats.childElements[key] = (stats.childElements[key] || 0) + 1
          stats.totalElements += 1
          countElements(value, depth + 1, key)
        }
      }
    })
  }

  countElements(data)
  return stats
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

  // XML结构统计
  const isXML = result.original_format === 'xml' || result.file_path?.endsWith('.xml')
  const xmlStats = isXML && result.data ? analyzeXMLStructure(result.data) : null

  // 验证信息
  const isValid = result.validation?.valid !== false // 如果没有验证结果，假设有效
  const validationErrors = result.validation?.errors || []
  const validationWarnings = result.validation?.warnings || []

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* 验证状态 */}
      <Alert
        message={isValid ? "文件解析成功" : "文件解析存在问题"}
        description={
          isValid 
            ? `已解析 ${dataCount} 条数据，识别 ${schemaFields} 个字段${xmlStats ? `，共 ${xmlStats.totalElements} 个元素` : ''}`
            : `解析完成，但发现 ${validationErrors.length} 个错误`
        }
        type={isValid ? "success" : "error"}
        icon={<CheckCircleOutlined />}
        showIcon
      />

      {/* 验证详情 */}
      {validationErrors.length > 0 && (
        <Card title="验证错误" size="small" style={{ borderColor: '#ff4d4f' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {validationErrors.map((error, idx) => (
              <Alert
                key={idx}
                message={error}
                type="error"
                size="small"
                showIcon={false}
              />
            ))}
          </Space>
        </Card>
      )}

      {validationWarnings.length > 0 && (
        <Card title="验证警告" size="small" style={{ borderColor: '#faad14' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {validationWarnings.map((warning, idx) => (
              <Alert
                key={idx}
                message={warning}
                type="warning"
                size="small"
                showIcon={false}
              />
            ))}
          </Space>
        </Card>
      )}
      
      <Card title="文件信息" size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="文件路径">
            <Text code style={{ fontSize: '12px' }}>{result.file_path}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="原始格式">
            <Tag color="blue">
              {(result.original_format || result.file_path?.split('.').pop() || '未知').toUpperCase()}
            </Tag>
          </Descriptions.Item>
          {result.output_format && (
            <Descriptions.Item label="输出格式">
              <Tag color="green">{result.output_format.toUpperCase()}</Tag>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="数据项数">
            <Text strong>{dataCount}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Schema字段数">
            <Text strong>{schemaFields}</Text>
          </Descriptions.Item>
          {xmlStats && (
            <>
              <Descriptions.Item label="XML根元素">
                <Tag color="purple">{xmlStats.rootElement || '未知'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="最大嵌套深度">
                <Text strong>{xmlStats.maxDepth}</Text>
              </Descriptions.Item>
            </>
          )}
        </Descriptions>
      </Card>

      {/* XML结构统计 */}
      {xmlStats && Object.keys(xmlStats.childElements).length > 0 && (
        <Card title="XML结构统计" size="small">
          <Descriptions column={1} size="small" style={{ marginBottom: '12px' }}>
            <Descriptions.Item label="总元素数">
              <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                {xmlStats.totalElements}
              </Text>
            </Descriptions.Item>
          </Descriptions>
          <Divider style={{ margin: '8px 0' }} />
          <div style={{ marginBottom: '12px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>子元素统计：</Text>
            <Space wrap>
              {Object.entries(xmlStats.childElements)
                .sort(([, a], [, b]) => b - a)
                .map(([elementName, count]) => (
                  <Tag key={elementName} color="blue" style={{ fontSize: '12px', padding: '4px 8px' }}>
                    {elementName}: <Text strong>{count}</Text>
                  </Tag>
                ))}
            </Space>
          </div>
          {Object.keys(xmlStats.attributes).length > 0 && (
            <>
              <Divider style={{ margin: '8px 0' }} />
              <div>
                <Text strong style={{ display: 'block', marginBottom: '8px' }}>属性统计：</Text>
                <Space wrap>
                  {Object.entries(xmlStats.attributes)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 10) // 只显示前10个
                    .map(([attrName, count]) => (
                      <Tag key={attrName} color="purple" style={{ fontSize: '12px', padding: '4px 8px' }}>
                        {attrName}: <Text strong>{count}</Text>
                      </Tag>
                    ))}
                  {Object.keys(xmlStats.attributes).length > 10 && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      等 {Object.keys(xmlStats.attributes).length} 个属性
                    </Text>
                  )}
                </Space>
              </div>
            </>
          )}
        </Card>
      )}

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
              overflow: 'auto',
              marginTop: '8px'
            }}>
              {JSON.stringify(result.data[0], null, 2)}
            </pre>
          </div>
        )}
        {result.data && !Array.isArray(result.data) && typeof result.data === 'object' && (
          <div>
            <Text strong>数据结构：</Text>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '12px', 
              borderRadius: '4px',
              fontSize: '12px',
              maxHeight: '200px',
              overflow: 'auto',
              marginTop: '8px'
            }}>
              {JSON.stringify(result.data, null, 2).substring(0, 500)}
              {JSON.stringify(result.data, null, 2).length > 500 ? '...' : ''}
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

