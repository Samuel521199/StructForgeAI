import { Card, Row, Col, Statistic, Typography } from 'antd'
import { FileOutlined, ApiOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { fileApi } from '@/services/api'

const { Title } = Typography

const Dashboard = () => {
  const [fileCount, setFileCount] = useState(0)

  useEffect(() => {
    fileApi.list().then((res) => {
      setFileCount(res.files.length)
    })
  }, [])

  return (
    <div>
      <Title level={2}>仪表盘</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="已上传文件"
              value={fileCount}
              prefix={<FileOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="Schema分析"
              value={0}
              prefix={<ApiOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="工作流执行"
              value={0}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard

