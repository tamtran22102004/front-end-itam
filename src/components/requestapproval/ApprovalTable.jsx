import React, { useMemo } from "react";
import { Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import { EyeOutlined, CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { fmt, stateTag, canApproveByRole } from "../../utils/approvalUi";
import "../../styles/approval-ui.css"; // ⬅️ nhớ import CSS

const { Text } = Typography;

export default function ApprovalTable({
  data, loading,
  onView, onApprove, onReject,
  currentUser, usersMap, deptsMap,
  title,
}) {
  const userName = (id) => (id && usersMap[id]?.label) || (id ?? "-");
  const deptName = (id) => (id && deptsMap[id]) || (id ?? "-");

  const NameCell = (label, id, maxWidth = 140) => (
    <div className="cell-inline">
      <Text className="cell-truncate" style={{ maxWidth }}>{label}</Text>
      <Text type="secondary" className="cell-sep">|</Text>
      <Text code className="mono-id">{id ?? "-"}</Text>
    </div>
  );

  const columns = useMemo(() => ([
    {
      title: "ID",
      dataIndex: "RequestID",
      key: "RequestID",
      width: 96,
      align: "center",
      render: (v) => <Text code className="mono-id">{v}</Text>,
    },
    {
      title: "Requester",
      dataIndex: "RequesterUserID",
      key: "RequesterUserID",
      width: 220,
      render: (v) => NameCell(userName(v), v, 130),
    },
    {
      title: "Người nhận",
      dataIndex: "TargetUserID",
      key: "TargetUserID",
      width: 240,
      render: (v) => NameCell(userName(v), v, 150),
    },
    {
      title: "Phòng nhận",
      dataIndex: "TargetDepartmentID",
      key: "TargetDepartmentID",
      width: 220,
      render: (v) => NameCell(deptName(v), v, 140),
    },
    {
      title: "Trạng thái",
      dataIndex: "CurrentState",
      key: "CurrentState",
      width: 160,
      render: (st) => stateTag(st),
    },
    {
      title: "Số lượng",
      dataIndex: "TotalQuantity",
      key: "TotalQuantity",
      width: 110,
      align: "center",
      render: (v) => (v == null ? 0 : v),
    },
    {
      title: "CreatedAt",
      dataIndex: "CreatedAt",
      key: "CreatedAt",
      width: 176,
      align: "center",
      render: (v) => fmt(v),
    },
    {
      title: "Note",
      dataIndex: "Note",
      key: "Note",
      width: 320,
      ellipsis: { showTitle: false },
      render: (text) =>
        text ? (
          <Tooltip placement="topLeft" title={text}>
            <span className="note-ellipsis">{text}</span>
          </Tooltip>
        ) : (
          <span>—</span>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 268,
      render: (_, r) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => onView(r.RequestID)}>
            Xem
          </Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            disabled={
              !currentUser ||
              !canApproveByRole(r.CurrentState, currentUser.Role) ||
              r.CurrentState === "APPROVED" ||
              r.CurrentState === "REJECTED"
            }
            onClick={() => onApprove(r)}
          >
            Duyệt
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            disabled={
              !currentUser ||
              !canApproveByRole(r.CurrentState, currentUser.Role) ||
              r.CurrentState === "APPROVED" ||
              r.CurrentState === "REJECTED"
            }
            onClick={() => onReject(r)}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ]), [currentUser, usersMap, deptsMap]);

  return (
    <Table
      title={title ? () => title : undefined}
      rowKey={(r, idx) => r?.RequestID ?? idx}
      loading={loading}
      dataSource={data}
      columns={columns}
      size="middle"
      sticky
      tableLayout="fixed"                  // ⬅️ chống xê dịch
      rowClassName={(_, i) => (i % 2 ? "zebra-row" : "")}
      scroll={{ x: 1300, y: 420 }}
      pagination={{ pageSize: 10, showSizeChanger: false }}
      bordered
    />
  );
}
