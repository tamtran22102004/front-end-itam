import React from "react";
import { Card, Descriptions, Empty } from "antd";

export default function ApprovalSubCard({ title, sub, fields, emptyText = "Không có dữ liệu" , loading }) {
  return (
    <Card title={title} size="small" loading={loading}>
      {sub ? (
        <Descriptions bordered size="small" column={1}>
          {fields.map((f) => (
            <Descriptions.Item key={f.key} label={f.label}>
              {sub[f.key] ?? "-"}
            </Descriptions.Item>
          ))}
        </Descriptions>
      ) : (
        <Empty description={emptyText} />
      )}
    </Card>
  );
}
