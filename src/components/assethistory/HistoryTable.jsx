// src/components/history/HistoryTable.jsx
import React from "react";
import { Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import { EyeOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { fmtDateTime } from "../../utils/format";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const shortId = (id) =>
  id ? `${String(id).slice(0, 8)}…${String(id).slice(-4)}` : "—";

export default function HistoryTable({
  data,
  loading,
  TYPE_MAP,
  onOpenTimeline,
}) {
  const navigate = useNavigate();

  const typeTag = (t) => {
    const m = TYPE_MAP[String(t).toUpperCase()] || {
      text: t || "UNKNOWN",
      color: "default",
    };
    return <Tag color={m.color}>{m.text}</Tag>;
  };

  const columns = [
    {
      title: "Thời gian",
      dataIndex: "ActionAt",
      key: "ActionAt",
      width: 170,
      render: (v) => fmtDateTime(v),
      sorter: (a, b) => new Date(a.ActionAt) - new Date(b.ActionAt),
      defaultSortOrder: "descend",
    },
    {
      title: "Asset",
      key: "asset",
      width: 260,
      render: (_, r) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>{r.AssetName || "—"}</span>
          <Space size={6}>
            <Tooltip title={r.AssetID}>
              <Text code copyable={{ text: r.AssetID }}>
                {shortId(r.AssetID)}
              </Text>
            </Tooltip>
            <Button
              size="small"
              type="link"
              style={{ padding: 0 }}
              onClick={() => navigate(`/assetdetail/${r.AssetID}`)}
            >
              Xem asset
            </Button>
          </Space>
        </div>
      ),
    },
    {
      title: "Loại sự kiện",
      dataIndex: "Type",
      key: "Type",
      width: 160,
      render: (t) => typeTag(t),
      filters: Object.keys(TYPE_MAP).map((k) => ({
        text: TYPE_MAP[k].text,
        value: k,
      })),
      onFilter: (v, r) =>
        String(r.Type).toUpperCase() === String(v).toUpperCase(),
    },
    {
      title: "Từ (From)",
      key: "from",
      width: 260,
      render: (r) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>
            <Text type="secondary">Nhân viên:&nbsp;</Text>
            {r.FromEmployeeName || "—"}{" "}
            {r.EmployeeID ? (
              <>
                (<Text code>{r.EmployeeID}</Text>)
              </>
            ) : null}
          </div>
          <div>
            <Text type="secondary">Phòng ban:&nbsp;</Text>
            {r.FromDepartmentName || "—"}{" "}
            {r.SectionID ? (
              <>
                (<Text code>{r.SectionID}</Text>)
              </>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: "",
      key: "arrow",
      width: 24,
      align: "center",
      render: () => <ArrowRightOutlined style={{ color: "#aaa" }} />,
    },
    {
      title: "Đến (To)",
      key: "to",
      width: 260,
      render: (r) => (
        <div style={{ lineHeight: 1.6 }}>
          <div>
            <Text type="secondary">Nhân viên:&nbsp;</Text>
            {r.ToEmployeeName || "—"}{" "}
            {r.EmployeeReceiveID ? (
              <>
                (<Text code>{r.EmployeeReceiveID}</Text>)
              </>
            ) : null}
          </div>
          <div>
            <Text type="secondary">Phòng ban:&nbsp;</Text>
            {r.ToDepartmentName || "—"}{" "}
            {r.SectionReceiveID ? (
              <>
                (<Text code>{r.SectionReceiveID}</Text>)
              </>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      title: "SL",
      dataIndex: "Quantity",
      key: "Quantity",
      width: 70,
      align: "center",
      render: (v) => <Tag>{v ?? "—"}</Tag>,
    },
    {
      title: "Ghi chú",
      dataIndex: "Note",
      key: "Note",
      ellipsis: true,
    },
    {
      title: "Lịch sử",
      key: "timeline",
      fixed: "right",
      width: 90,
      render: (r) => (
        <Tooltip title="Xem timeline tài sản này">
          <Button
            icon={<EyeOutlined />}
            onClick={() =>
              onOpenTimeline({ AssetID: r.AssetID, AssetName: r.AssetName })
            }
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey={(r) => r.HistoryID}
      loading={loading}
      pagination={{ pageSize: 12, showSizeChanger: false }}
      scroll={{ x: 1400 }}
      size="middle"
      bordered
    />
  );
}
