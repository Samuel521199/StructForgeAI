import { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  Typography,
  message,
  Descriptions,
  Space,
  Divider,
} from 'antd'
import { schemaApi } from '@/services/api'
import { useAppStore } from '@/store/useAppStore'
import type { SchemaAnalysisResult } from '@/types'

const { Title, Paragraph } = Typography
const { TextArea } = Input

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

  return (
    <div>
      <Title level={2}>Schema分析</Title>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Form
            form={form}
            layout="vertical"
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
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Schema类型">
                {schemaResult.schema.type || 'object'}
              </Descriptions.Item>
              <Descriptions.Item label="字段数量">
                {Object.keys(
                  schemaResult.schema.properties ||
                    schemaResult.schema.fields ||
                    schemaResult.schema.columns ||
                    {}
                ).length}
              </Descriptions.Item>
            </Descriptions>

            <Divider>关系图谱</Divider>
            {schemaResult.relationships?.references && (
              <div>
                <Paragraph strong>引用关系:</Paragraph>
                <ul>
                  {schemaResult.relationships.references.map((rel, idx) => (
                    <li key={idx}>
                      {rel.from} → {rel.to} ({rel.type})
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

