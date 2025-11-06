// components/assets/AssetTable.jsx
import { useMemo } from "react";
import { Button, Popconfirm, Space, Table, Tag, Tooltip } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { STATUS_MAP } from "../../constants/asset";
import { fmtDate, fmtMoney, isWarrantyActive } from "../../utils/format";
import AssetHistoryTrigger from "./AssetHistoryTrigger";

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
};
const shortId = (id) =>
  id ? `${String(id).slice(0, 8)}…${String(id).slice(-4)}` : "—";

export default function AssetTable({
  data,
  loading,
  catMap,
  imMap,
  imManageTypeMap,
  vendorMap,
  userNameMap,
  deptNameMap,
  onView,
  onEdit,
  onDelete,
  onShowQr,
  hideQrToken = false,
}) {
  const columns = [
    // ✔ Cố định trái 2 cột đầu để tránh xô lệch khi scroll
    {
      title: "Mã tài sản",
      dataIndex: "ID",
      key: "ID",
      width: 220,
      fixed: "left",
      ellipsis: true,
      render: (v) => shortId(v),
    },
    {
      title: "Tên thiết bị",
      dataIndex: "Name",
      key: "Name",
      width: 240,
      fixed: "left",
      ellipsis: { showTitle: false },
      render: (v) => v || "—",
    },

    {
      title: "Mã nội bộ",
      dataIndex: "ManageCode",
      key: "ManageCode",
      width: 120,
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Mã kế toán",
      dataIndex: "AssetCode",
      key: "AssetCode",
      width: 120,
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "SerialNumber",
      dataIndex: "SerialNumber",
      key: "SerialNumber",
      width: 140,
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "Danh mục",
      dataIndex: "CategoryID",
      key: "CategoryID",
      width: 140,
      render: (id) => catMap[id] || "—",
    },
    {
      title: "ItemMaster",
      dataIndex: "ItemMasterID",
      key: "ItemMasterID",
      width: 180,
      ellipsis: true,
      render: (id) => imMap[id] || "—",
    },
    {
      title: "ManageType",
      key: "ManageType",
      width: 120,
      render: (_, r) => {
        const mt = imManageTypeMap[r.ItemMasterID];
        return mt ? (
          <Tag color={mt === "INDIVIDUAL" ? "purple" : "cyan"}>{mt}</Tag>
        ) : (
          "—"
        );
      },
    },

    // 🆕 Chỉ hiển thị giá trị khi ManageType = INDIVIDUAL
    {
      title: "Người sử dụng",
      key: "Employee",
      width: 180,
      ellipsis: true,
      render: (_, r) => {
        const mt = imManageTypeMap[r.ItemMasterID];
        if (mt !== "INDIVIDUAL") return "—";
        const name = userNameMap[r.EmployeeID] || "—";
        return <span>{name}</span>;
      },
    },
    {
      title: "Bộ phận",
      key: "Department",
      width: 180,
      ellipsis: true,
      render: (_, r) => {
        const mt = imManageTypeMap[r.ItemMasterID];
        if (mt !== "INDIVIDUAL") return "—";
        const dept =
          deptNameMap[r.SectionID] || deptNameMap[r.DepartmentID] || "—";
        return <span>{dept}</span>;
      },
    },

    {
      title: "Vendor",
      dataIndex: "VendorID",
      key: "VendorID",
      width: 160,
      render: (id) => vendorMap[id] || "—",
    },
    {
      title: "Ngày mua",
      dataIndex: "PurchaseDate",
      key: "PurchaseDate",
      width: 120,
      render: fmtDate,
    },
    {
      title: "Giá mua",
      dataIndex: "PurchasePrice",
      key: "PurchasePrice",
      width: 120,
      align: "right",
      render: fmtMoney,
    },
    {
      title: "Mã phiếu mua",
      dataIndex: "PurchaseId",
      key: "PurchaseId",
      width: 140,
      ellipsis: true,
      render: (v) => v || "—",
    },
    {
      title: "BH bắt đầu",
      dataIndex: "WarrantyStartDate",
      key: "WarrantyStartDate",
      width: 130,
      render: fmtDate,
    },
    {
      title: "BH kết thúc",
      dataIndex: "WarrantyEndDate",
      key: "WarrantyEndDate",
      width: 130,
      render: fmtDate,
    },
    {
      title: "Tháng BH",
      dataIndex: "WarrantyMonth",
      key: "WarrantyMonth",
      width: 100,
      align: "center",
      render: (v) => v ?? "—",
    },
    {
      title: "Đang BH",
      key: "WarrantyActive",
      width: 110,
      align: "center",
      render: (_, r) =>
        isWarrantyActive(r.WarrantyStartDate, r.WarrantyEndDate) ? (
          <Tag color="green">Có</Tag>
        ) : (
          <Tag>Không</Tag>
        ),
    },
    {
      title: "Số lượng",
      dataIndex: "Quantity",
      key: "Quantity",
      width: 90,
      align: "center",
      render: (v) => v ?? "—",
    },
    {
      title: "Số lượng còn lại ",
      dataIndex: "RemainQuantity",
      key: "RemainQuantity",
      width: 90,
      align: "center",
      render: (v) => v ?? "—",
    },

    // 🔕 ĐÃ ẨN hai cột Số lượng / Số lượng còn lại theo yêu cầu

    {
      title: "Trạng thái",
      dataIndex: "Status",
      key: "Status",
      width: 130,
      render: (s) => {
        const m = STATUS_MAP[s] || { text: "Không rõ", color: "default" };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: "QR",
      key: "QRCode",
      width: 120,
      align: "center",
      render: (_, record) => {
        const token = hideQrToken ? "" : record.QRCode || record.QRToken || "";
        return (
          <Space>
            <Tooltip title="Sao chép mã">
              <Button
                size="small"
                icon={<CopyOutlined />}
                disabled={!token}
                onClick={() => copy(token)}
              />
            </Tooltip>
            <Tooltip title="Xem QR">
              <Button
                size="small"
                icon={<QrcodeOutlined />}
                disabled={!token}
                onClick={() => onShowQr?.(token, record)}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: "Thao tác",
      key: "action",
      fixed: "right",
      width: 170,
      render: (_, record) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button icon={<EyeOutlined />} onClick={() => onView(record)} />
          </Tooltip>
          <Tooltip title="Chỉnh sửa">
            <Button icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          {/* nút Xem / Chỉnh sửa / Xóa của bạn ở đây */}
          <AssetHistoryTrigger
            assetID={record.ID || record.AssetID}
            assetName={record.Name || record.AssetName}
            userNameMap={userNameMap}
            deptNameMap={deptNameMap}
          />
          <Popconfirm
            title="Bạn có chắc muốn xóa tài sản này?"
            onConfirm={() => onDelete(record.ID)}
          >
            <Button danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ✔ Tính đúng tổng độ rộng để tránh lớp trắng của cột fixed
  const scrollX = useMemo(
    () => columns.reduce((sum, c) => sum + (Number(c.width) || 120), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(r) => r.ID}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50],
        }}
        scroll={{ x: scrollX, y: 520 }}
        size="middle"
        tableLayout="fixed" // ⬅️ khoá layout theo width cột
        bordered
        sticky
      />
      <style>{`
        /* Giữ chiều cao & canh giữa nội dung ô */
        .ant-table-tbody > tr > td, .ant-table-thead > tr > th {
          white-space: nowrap;
          vertical-align: middle;
          padding: 10px 12px;
        }
        /* Giảm rung lắc khi ellipsis */
        .ant-table-cell-ellipsis { overflow: hidden; text-overflow: ellipsis; }
      `}</style>
    </>
  );
}
