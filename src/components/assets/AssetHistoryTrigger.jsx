// src/components/assets/AssetHistoryTrigger.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Tag,
  Tooltip,
  Typography,
  Space,
  Timeline,
  Empty,
  Skeleton,
} from "antd";
import {
  ClockCircleOutlined,
  ReloadOutlined,
  CopyOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { apiGetAssetHistoryByAssetID } from "../../services/assetApi";

const { Text } = Typography;

const copy = async (text) => { try { await navigator.clipboard.writeText(String(text)); } catch {} };
const fmtDT = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm:ss") : "—");
const shortId = (id) => (id ? `${String(id).slice(0, 8)}…${String(id).slice(-4)}` : "—");

// Map TYPE (màu “brown” dùng mã màu)
const TYPE_TAGS = {
  AVAILABLE: { text: "AVAILABLE", color: "green" },
  ALLOCATED: { text: "ALLOCATED", color: "blue" },
  MAINTENANCE: { text: "MAINTENANCE", color: "orange" },
  MAINTENANCE_IN: { text: "MAINTENANCE_IN", color: "orange" },
  MAINTENANCE_OUT: { text: "MAINTENANCE_OUT", color: "orange" },
  WARRANTY: { text: "WARRANTY", color: "gold" },
  WARRANTY_OUT: { text: "WARRANTY_OUT", color: "gold" },
  DISPOSED: { text: "DISPOSED", color: "red" },
  TRANSFER: { text: "TRANSFER", color: "geekblue" },
  STOCKTAKE: { text: "STOCKTAKE", color: "#8B4513" },
  STOCKTAKE_MISSING: { text: "STOCKTAKE_MISSING", color: "#8B4513" },
  STOCKTAKE_FOUND: { text: "STOCKTAKE_FOUND", color: "#8B4513" },
};

// Dot tròn màu cho Timeline
const Dot = ({ color = "#d9d9d9" }) => (
  <span
    style={{
      display: "inline-block",
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: color,
      boxShadow: "0 0 0 2px #fff inset",
    }}
  />
);

// Chip nhỏ hiển thị ID/số lượng
const Chip = ({ children }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      height: 18,
      padding: "0 6px",
      border: "1px solid #d9d9d9",
      borderRadius: 9,
      fontSize: 12,
      background: "#fafafa",
      lineHeight: "18px",
      marginLeft: 6,
    }}
  >
    {children}
  </span>
);

const Field = ({ label, children }) => (
  <div style={{ marginTop: 6 }}>
    <Text type="secondary" style={{ width: 72, display: "inline-block" }}>
      {label}
    </Text>
    <span>{children}</span>
  </div>
);

// Ghép “Tên (empId) • Phòng (deptId)”
const personDept = (name, empId, deptName, deptId) => (
  <>
    <span>{name || "—"}</span>
    {empId ? <Chip>{empId}</Chip> : null}
    <span> • </span>
    <span>{deptName || "—"}</span>
    {deptId ? <Chip>{deptId}</Chip> : null}
  </>
);

export default function AssetHistoryTrigger({
  assetID,
  assetName,
  buttonSize = "middle",
  userNameMap,
  deptNameMap,
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{assetName || "—"}</div>
        <div style={{ color: "#999", display: "flex", alignItems: "center", gap: 8 }}>
          <span>Asset ID:</span>
          <code
            style={{
              background: "#f5f5f5",
              border: "1px solid #eee",
              borderRadius: 6,
              padding: "2px 6px",
              color: "#555",
            }}
          >
            {shortId(assetID)}
          </code>
          <Tooltip title="Sao chép AssetID">
            <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => copy(assetID)} />
          </Tooltip>
        </div>
      </div>
    ),
    [assetID, assetName]
  );

  const fetchHistory = async () => {
    if (!assetID) return;
    setLoading(true);
    try {
      const data = await apiGetAssetHistoryByAssetID(assetID);
      const arr = Array.isArray(data) ? data : [];
      // sort DESC theo thời gian
      arr.sort((a, b) => new Date(b.ActionAt || 0) - new Date(a.ActionAt || 0));
      setRows(arr);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) fetchHistory(); }, [open, assetID]);

  const items = rows.map((r, idx) => {
    const typeCfg = TYPE_TAGS[r.Type] || { text: r.Type || "—", color: "#d9d9d9" };

    // fallback tên nếu API không trả
    const fromEmp = r.FromEmployeeName || (r.EmployeeID && userNameMap?.[r.EmployeeID]) || "—";
    const fromDept = r.FromDepartmentName || (r.SectionID && deptNameMap?.[r.SectionID]) || "—";
    const toEmp = r.ToEmployeeName || (r.EmployeeReceiveID && userNameMap?.[r.EmployeeReceiveID]) || "—";
    const toDept = r.ToDepartmentName || (r.SectionReceiveID && deptNameMap?.[r.SectionReceiveID]) || "—";

    return {
      key: r.HistoryID || r.ID || idx,
      dot: <Dot color={typeCfg.color} />,
      children: (
        <div style={{ paddingBottom: 8 }}>
          {/* Header: Tag Type + thời gian */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 6,
            }}
          >
            <Tag color={typeCfg.color} style={{ fontWeight: 600 }}>
              {typeCfg.text}
            </Tag>
            <Text type="secondary">{fmtDT(r.ActionAt)}</Text>
          </div>

          {/* Yêu cầu */}
          <Field label="Yêu cầu:">
            {r.RequestID ? (
              <>
                <Chip>{r.RequestID}</Chip>
                {r.RequestTypeName ? (
                  <Tag style={{ marginLeft: 8 }}>{r.RequestTypeName}</Tag>
                ) : null}
              </>
            ) : (
              "—"
            )}
          </Field>

          {/* Từ */}
          <Field label="Từ:">
            {personDept(fromEmp, r.EmployeeID, fromDept, r.SectionID)}
          </Field>

          {/* Đến */}
          <Field label="Đến:">
            {personDept(toEmp, r.EmployeeReceiveID, toDept, r.SectionReceiveID)}
          </Field>

          {/* Số lượng */}
          <Field label="Số lượng:">
            <Chip>{r.Quantity ?? 1}</Chip>
          </Field>

          {/* Ghi chú */}
          <Field label="Ghi chú:">{r.Note || "—"}</Field>
        </div>
      ),
    };
  });

  return (
    <>
      <Tooltip title="Lịch sử">
        <Button icon={<ClockCircleOutlined />} size={buttonSize} onClick={() => setOpen(true)} />
      </Tooltip>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        placement="right"
        width={560}                // giống panel bên phải
        destroyOnClose
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchHistory} loading={loading}>
              Tải lại
            </Button>
          </Space>
        }
        bodyStyle={{ paddingTop: 8, paddingBottom: 12 }}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : rows.length === 0 ? (
          <Empty description="Chưa có lịch sử" />
        ) : (
          <div style={{ maxHeight: "calc(100vh - 180px)", overflow: "auto", paddingRight: 8 }}>
            <Timeline items={items} />
          </div>
        )}
      </Drawer>
    </>
  );
}
