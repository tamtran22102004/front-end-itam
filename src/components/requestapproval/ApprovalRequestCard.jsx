import React from "react";
import { Card, Descriptions, Empty, Tag } from "antd";
import { fmt, stateTag } from "../../utils/approvalUi";

export default function ApprovalRequestCard({ request, title, userName, deptName, loading }) {
  return (
    <Card title={title} size="small" loading={loading}>
      {request ? (
        <Descriptions bordered size="small" column={1}>
          <Descriptions.Item label="RequestID">{request.RequestID}</Descriptions.Item>
          <Descriptions.Item label="Requester">
            <b>{userName(request.RequesterUserID)}</b> <Tag style={{ marginLeft:6 }}>{request.RequesterUserID ?? "-"}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Người nhận">
            <b>{userName(request.TargetUserID)}</b> <Tag style={{ marginLeft:6 }}>{request.TargetUserID ?? "-"}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Phòng nhận">
            <b>{deptName(request.TargetDepartmentID)}</b> <Tag style={{ marginLeft:6 }}>{request.TargetDepartmentID ?? "-"}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{stateTag(request.CurrentState)}</Descriptions.Item>
          <Descriptions.Item label="Note">{request.Note || "-"}</Descriptions.Item>
          <Descriptions.Item label="CreatedAt">{fmt(request.CreatedAt)}</Descriptions.Item>
          <Descriptions.Item label="UpdatedAt">{fmt(request.UpdatedAt)}</Descriptions.Item>
        </Descriptions>
      ) : (
        <Empty description="Chọn bản ghi ở danh sách phía trên để xem" />
      )}
    </Card>
  );
}
