// src/components/requestapproval/ApprovalRequestCard.jsx
import React, { useMemo } from "react";
import { Card, Descriptions, Empty, Tag, Typography } from "antd";
import { fmt, stateTag } from "../../utils/approvalUi";

const { Text } = Typography;

const buildAssetLabel = (row = {}) => {
  const id =
    row.AssetID ||
    row.AssetId ||
    row.assetId ||
    row.AssetCode ||
    row.ManageCode;
  const name =
    row.AssetName ||
    row.Name ||
    row.AssetDisplay ||
    row.AssetCode ||
    row.ManageCode ||
    row.SerialNumber;

  if (name && id) return `${name} (${id})`;
  return name || id || "";
};

function SpaceWrap({ children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {children}
    </span>
  );
}

export default function ApprovalRequestCard({
  request,
  sub,        // ✅ mảng chi tiết (allocation / maintenance / disposal / warranty)
  title,
  userName,
  deptName,
  loading,
  kindLabel,
  kindCode,
}) {
  // Tóm tắt asset từ sub
  const { assetCount, totalQty, assetPreview } = useMemo(() => {
    const rows = Array.isArray(sub) ? sub : sub ? [sub] : [];
    const count = rows.length;
    const qty = rows.reduce(
      (sum, r) => sum + Number(r.Quantity ?? r.Qty ?? 0),
      0
    );
    const preview = rows
      .slice(0, 3)
      .map((r) => buildAssetLabel(r))
      .filter(Boolean);

    return { assetCount: count, totalQty: qty, assetPreview: preview };
  }, [sub]);

  if (!request) {
    return (
      <Card title={title} size="small" loading={loading}>
        <Empty description="Chọn bản ghi ở danh sách phía trên để xem" />
      </Card>
    );
  }

  const typeName =
    request.RequestTypeName ||
    request.RequestTypeLabel ||
    kindLabel ||
    null;
  const typeCode =
    request.RequestTypeCode ||
    request.TypeCode ||
    request.Type ||
    kindCode ||
    null;

  return (
    <Card title={title} size="small" loading={loading}>
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="RequestID">
          <Text code>{request.RequestID}</Text>
        </Descriptions.Item>

        <Descriptions.Item label="Loại yêu cầu">
          <SpaceWrap>
            {typeName && (
              <Tag color="blue">
                <b>{typeName}</b>
              </Tag>
            )}
            {typeCode && (
              <Tag color="geekblue" style={{ marginLeft: 4 }}>
                {typeCode}
              </Tag>
            )}
          </SpaceWrap>
        </Descriptions.Item>

        <Descriptions.Item label="Requester">
          <SpaceWrap>
            <b>{userName(request.RequesterUserID)}</b>
            <Tag style={{ marginLeft: 6 }}>
              {request.RequesterUserID ?? "-"}
            </Tag>
          </SpaceWrap>
        </Descriptions.Item>

        <Descriptions.Item label="Người nhận">
          <SpaceWrap>
            <b>{userName(request.TargetUserID)}</b>
            <Tag style={{ marginLeft: 6 }}>
              {request.TargetUserID ?? "-"}
            </Tag>
          </SpaceWrap>
        </Descriptions.Item>

        <Descriptions.Item label="Phòng nhận">
          <SpaceWrap>
            <b>{deptName(request.TargetDepartmentID)}</b>
            <Tag style={{ marginLeft: 6 }}>
              {request.TargetDepartmentID ?? "-"}
            </Tag>
          </SpaceWrap>
        </Descriptions.Item>

        {/* Tóm tắt asset */}
        <Descriptions.Item label="Số dòng tài sản">
          <SpaceWrap>
            <Tag color="purple">
              {assetCount ?? 0} dòng thiết bị
            </Tag>
            {typeof request.TotalQuantity === "number" && (
              <Tag color="gold" style={{ marginLeft: 4 }}>
                Tổng SL (list): {request.TotalQuantity}
              </Tag>
            )}
          </SpaceWrap>
        </Descriptions.Item>

        <Descriptions.Item label="Tổng số lượng (từ chi tiết)">
          {assetCount > 0 ? (
            <SpaceWrap>
              <Tag color="geekblue">
                {totalQty || 0} đơn vị
              </Tag>
              {typeof request.TotalQuantity === "number" &&
                totalQty !== request.TotalQuantity && (
                  <Text type="secondary" style={{ marginLeft: 6 }}>
                    (Trong list: {request.TotalQuantity})
                  </Text>
                )}
            </SpaceWrap>
          ) : (
            "—"
          )}
        </Descriptions.Item>

        {assetPreview.length > 0 && (
          <Descriptions.Item label="Tóm tắt Asset">
            {assetPreview.join(" • ")}
            {assetCount > assetPreview.length && (
              <Text type="secondary" style={{ marginLeft: 6 }}>
                +{assetCount - assetPreview.length} dòng nữa
              </Text>
            )}
          </Descriptions.Item>
        )}

        <Descriptions.Item label="Trạng thái">
          {stateTag(request.CurrentState)}
        </Descriptions.Item>
        <Descriptions.Item label="Note">
          {request.Note || "-"}
        </Descriptions.Item>
        <Descriptions.Item label="CreatedAt">
          {fmt(request.CreatedAt)}
        </Descriptions.Item>
        <Descriptions.Item label="UpdatedAt">
          {fmt(request.UpdatedAt)}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
