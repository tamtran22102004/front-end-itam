// components/assets/AssetSummary.jsx
import { Card, Col, Row, Statistic } from "antd";

export default function AssetSummary({
  total,
  byStatus,
  warrantyActiveCount,
  withQRCount,
}) {
  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 8 }}>
      <Col xs={12} sm={8} md={6} lg={4}>
        <Card size="small">
          <Statistic title="Tổng (sau lọc)" value={total} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={4}>
        <Card size="small">
          <Statistic title="Sẵn sàng" value={byStatus[1] || 0} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={4}>
        <Card size="small">
          <Statistic title="Đang dùng" value={byStatus[2] || 0} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={4}>
        <Card size="small">
          <Statistic title="Đang bảo hành" value={warrantyActiveCount} />
        </Card>
      </Col>
      <Col xs={12} sm={8} md={6} lg={4}>
        <Card size="small">
          <Statistic title="Có QR" value={withQRCount} />
        </Card>
      </Col>
    </Row>
  );
}
