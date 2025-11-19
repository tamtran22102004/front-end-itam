// src/components/requestapproval/ApprovalSubCard.jsx
import React, { useMemo } from "react";
import { Card, Empty, Table } from "antd";

export default function ApprovalSubCard({
  title,
  sub,
  fields,
  emptyText = "Không có dữ liệu",
  loading,
}) {
  const rows = useMemo(() => {
    if (Array.isArray(sub)) return sub;
    if (sub && typeof sub === "object") return [sub];
    return [];
  }, [sub]);

  const columns = useMemo(() => {
    const baseCols =
      fields?.map((f) => ({
        title: f.label,
        dataIndex: f.key,
        key: f.key,
      })) || [];

    return [
      {
        title: "#",
        key: "_idx",
        width: 60,
        render: (_v, _r, idx) => idx + 1,
      },
      ...baseCols,
    ];
  }, [fields]);

  return (
    <Card title={title} size="small" loading={loading}>
      {rows.length ? (
        <Table
          size="small"
          rowKey={(r, idx) =>
            r.AllocationID ||
            r.MaintenanceID ||
            r.WarrantyID ||
            r.DisposalID ||
            `${idx}`
          }
          dataSource={rows}
          columns={columns}
          pagination={false}
        />
      ) : (
        <Empty description={emptyText} />
      )}
    </Card>
  );
}
