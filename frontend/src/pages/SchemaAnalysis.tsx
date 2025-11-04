import { useState } from 'react'
import {
  Card,
  Form,
  Button,
  Switch,
  Typography,
  message,
  Descriptions,
  Space,
  Divider,
  Tabs,
  Table,
  Tag,
} from 'antd'
import { schemaApi } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import type { SchemaAnalysisResult, SchemaField } from '@/types'
import DataEditor from '@/components/DataEditor'
import RelationshipGraph from '@/components/RelationshipGraph'

const { Title, Paragraph } = Typography

const SchemaAnalysis = () => {
  const { currentFile, schemaResult, setSchemaResult } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const handleAnalyze = async (values: any) => {
    if (!currentFile) {
      message.warning('请先上传并解析文件')
      return
    }

    try {
      setLoading(true)
      const result = await schemaApi.analyze(
        currentFile.data,
        values.useAI,
        { file_path: currentFile.file_path }
      )
      setSchemaResult(result)
      message.success('Schema分析完成')
    } catch (error: any) {
      message.error(`分析失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 获取Schema字段数据
  const getSchemaFields = () => {
    if (!schemaResult?.schema) return []
    
    const fields =
      schemaResult.schema.properties ||
      schemaResult.schema.fields ||
      schemaResult.schema.columns ||
      {}

    return Object.entries(fields).map(([key, value]: [string, any]) => ({
      key,
      name: key,
      type: value.type || typeof value,
      description: value.description || '-',
      path: value.path || '-',
      position: value.position || '-',
    }))
  }

  // 格式化Schema为JSON
  const formatSchemaJson = () => {
    if (!schemaResult) return ''
    return JSON.stringify(schemaResult.schema, null, 2)
  }

  // 格式化数据为JSON
  const formatDataJson = () => {
    if (!currentFile) return ''
    return JSON.stringify(currentFile.data, null, 2)
  }

  const schemaFields = getSchemaFields()
  const fieldsColumns = [
    {
      title: '字段名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="blue">{type}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
      ellipsis: true,
    },
    {
      title: '位置',
      dataIndex: 'position',
      key: 'position',
    },
  ]

  return (
    <div>
      <Title level={2}>Schema分析</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Form
            form={form}
            layout="inline"
            onFinish={handleAnalyze}
            initialValues={{ useAI: true }}
          >
            <Form.Item
              name="useAI"
              label="使用AI分析"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                开始分析
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {schemaResult && (
          <Card title="分析结果">
            <Tabs
              defaultActiveKey="overview"
              items={[
                {
                  key: 'overview',
                  label: '概览',
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Descriptions column={2} bordered>
                        <Descriptions.Item label="Schema类型">
                          {schemaResult.schema.type || 'object'}
                        </Descriptions.Item>
                        <Descriptions.Item label="字段数量">
                          {schemaFields.length}
                        </Descriptions.Item>
                      </Descriptions>
                      {schemaResult.relationships &&
                        schemaResult.relationships.length > 0 && (
                          <>
                            <Divider>关系图谱</Divider>
                            <RelationshipGraph
                              relationships={schemaResult.relationships}
                              height="400px"
                            />
                          </>
                        )}
                    </Space>
                  ),
                },
                {
                  key: 'fields',
                  label: '字段列表',
                  children: (
                    <Table
                      columns={fieldsColumns}
                      dataSource={schemaFields}
                      pagination={{ pageSize: 10 }}
                    />
                  ),
                },
                {
                  key: 'schema',
                  label: 'Schema JSON',
                  children: (
                    <DataEditor
                      value={formatSchemaJson()}
                      language="json"
                      readOnly
                      height="500px"
                    />
                  ),
                },
                {
                  key: 'data',
                  label: '数据预览',
                  children: (
                    <DataEditor
                      value={formatDataJson()}
                      language="json"
                      readOnly
                      height="500px"
                    />
                  ),
                },
              ]}
            />
          </Card>
        )}

        {!currentFile && (
          <Card>
            <Paragraph type="secondary">
              请先在文件管理页面上传并解析文件
            </Paragraph>
          </Card>
        )}
      </Space>
    </div>
  )
}

export default SchemaAnalysis

