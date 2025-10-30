// src/components/history/HistorySummary.jsx
import { Card, Col, Row, Statistic, Tag, Tooltip } from "antd";
import React from "react";

export default function HistorySummary({
  total, distinctAssetCount, byType, TYPE_MAP,
}) {
  const typeKeys = Object.keys(TYPE_MAP);

  return (
    <Row gutter={[12, 12]} style={{ marginBottom: 8 }}>
      
      
      {typeKeys.slice(0, 6).map((k) => (
        <Col key={k} xs={12} sm={8} md={6} lg={4}>
          <Card size="small">
            <Tooltip title={TYPE_MAP[k].text}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Tag color={TYPE_MAP[k].color} style={{ marginRight: 6 }}>
                  {TYPE_MAP[k].text}
                </Tag>
                <span style={{ fontWeight: 700 }}>{byType[k] || 0}</span>
              </div>
            </Tooltip>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
