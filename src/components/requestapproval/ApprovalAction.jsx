import React from "react";
import { Card, Space, Button } from "antd";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";
import { canApproveByRole } from "../../utils/approvalUi";

export default function ApprovalActions({
  detail,
  currentUser,
  onApprove,
  onReject,
}) {
  const disabled =
    !detail?.request ||
    !currentUser ||
    !canApproveByRole(detail?.request?.CurrentState, currentUser?.Role) ||
    detail?.request?.CurrentState === "APPROVED" ||
    detail?.request?.CurrentState === "REJECTED";

  return (
    <Card title="Thao tác duyệt" size="small">
      <Space wrap>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          disabled={disabled}
          onClick={onApprove}
        >
          Duyệt
        </Button>
        <Button
          danger
          icon={<CloseOutlined />}
          disabled={disabled}
          onClick={onReject}
        >
          Từ chối
        </Button>
      </Space>
    </Card>
  );
}
