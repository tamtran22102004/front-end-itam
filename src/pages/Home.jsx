import React, { useMemo, useState } from "react";
import { Card, Row, Col, Typography, Input, Space, Tag, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import {
  AppstoreOutlined,
  DatabaseOutlined,
  LaptopOutlined,
  HistoryOutlined,
  ToolOutlined,
  ScheduleOutlined,
  ContainerOutlined,
  FileSearchOutlined,
  AuditOutlined,
  InboxOutlined,
  SettingOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

/**
 * Home Grid (no images) – clickable tiles with icons & short descriptions
 * VERSION: compact, no grouping, 4 items per row; "Cài đặt" routes removed
 */
export default function HomeGrid({ siderItems }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  // Descriptions for UX clarity
  const DESCRIPTIONS = useMemo(
    () => ({
      "/item": "Tạo và quản lý Mẫu tài sản (Item Master).",
      "/asset": "Danh sách tài sản, thêm/sửa, gán nhân viên/bộ phận.",
      "/assethistory": "Theo dõi lịch sử cấp phát/thu hồi/chuyển giao.",
      "/schedulemaintenance": "Lên lịch bảo trì định kỳ và người phụ trách.",
      "/scheduleworkorder": "Thực hiện bảo trì theo Work Order.",
      "/category": "Tạo danh mục (loại tài sản) để chuẩn hóa quản lý.",
      "/category/attribute":
        "Khai báo thuộc tính cho từng danh mục (RAM, CPU…).",
      "/category/categoryattribute":
        "Ánh xạ thuộc tính vào danh mục để dùng trong biểu mẫu.",
      "/request":
        "Người dùng gửi yêu cầu (cấp phát, bảo trì, thu hồi, bảo hành).",
      "/requestapproval":
        "Duyệt yêu cầu quy trình cấp phát, bảo trì, thu hồi, bảo hành.",
      "/stocktake": "Tạo phiên kiểm kê, quét/đối soát tài sản thực tế.",
    }),
    []
  );

  // Icon mapping per route
  const ROUTE_ICON = useMemo(
    () => ({
      "/item": ContainerOutlined,
      "/asset": LaptopOutlined,
      "/assethistory": HistoryOutlined,
      "/schedulemaintenance": ToolOutlined,
      "/scheduleworkorder": ScheduleOutlined,
      "/category": AppstoreOutlined,
      "/category/attribute": DatabaseOutlined,
      "/category/categoryattribute": SettingOutlined,
      "/request": FileSearchOutlined,
      "/requestapproval": AuditOutlined,
      "/stocktake": InboxOutlined,
    }),
    []
  );

  // Default sider structure (without Settings/Cài đặt)
  const FALLBACK_SIDER = useMemo(
    () => [
      {
        key: "sub2",
        label: "Thiết bị",
        icon: <LaptopOutlined />,
        children: [
          {
            key: "assets",
            label: "Tài sản",
            children: [
              { key: "/item", label: "Mẫu tài sản" },
              { key: "/asset", label: "Tài sản" },
              { key: "/assethistory", label: "Lịch sử tài sản" },
              { key: "/schedulemaintenance", label: "Lên lịch bảo trì" },
              { key: "/scheduleworkorder", label: "Thực hiện bảo trì" },
            ],
          },
          {
            key: "category",
            label: "Danh mục",
            children: [
              { key: "/category", label: "Thêm danh mục" },
              { key: "/category/attribute", label: "Thuộc tính danh mục" },
              {
                key: "/category/categoryattribute",
                label: "Cấu hình danh mục",
              },
            ],
          },
        ],
      },
      {
        key: "sub3",
        label: "Yêu cầu & Duyệt",
        icon: <DatabaseOutlined />,
        children: [
          { key: "/request", label: "Yêu cầu" },
          { key: "/requestapproval", label: "Duyệt yêu cầu" },
        ],
      },
      {
        key: "sub4",
        label: "Kiểm kê",
        icon: <AppstoreOutlined />,
        children: [{ key: "/stocktake", label: "Tạo kiểm kê" }],
      },
    ],
    []
  );

  const SOURCE = siderItems ?? FALLBACK_SIDER;

  // recursively flatten to leaf routes starting with '/' and NOT under '/settings'
  const flatten = (nodes) => {
    const out = [];
    nodes?.forEach((n) => {
      if (Array.isArray(n.children) && n.children.length) {
        out.push(...flatten(n.children));
      } else if (
        typeof n.key === "string" &&
        n.key.startsWith("/") &&
        !n.key.startsWith("/settings")
      ) {
        const RouteIcon = ROUTE_ICON[n.key];
        const finalIcon = RouteIcon ? <RouteIcon /> : <AppstoreOutlined />;
        out.push({
          key: n.key,
          label: n.label,
          icon: finalIcon,
          desc: DESCRIPTIONS[n.key] ?? "",
        });
      }
    });
    return out;
  };

  const tiles = useMemo(() => flatten(SOURCE), [SOURCE]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    if (!kw) return tiles;
    return tiles.filter(
      (t) =>
        t.label.toLowerCase().includes(kw) ||
        t.key.toLowerCase().includes(kw) ||
        (t.desc || "").toLowerCase().includes(kw)
    );
  }, [tiles, q]);

  const renderTile = (t) => (
    <Card
      key={t.key}
      hoverable
      onClick={() => navigate(t.key)}
      onKeyDown={(e) => e.key === "Enter" && navigate(t.key)}
      role="button"
      tabIndex={0}
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
      bodyStyle={{
        padding: 16,
        width: "100%",
      }}
    >
      <Space
        direction="vertical"
        size={10}
        style={{
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          display: "flex",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            display: "grid",
            placeItems: "center",
            borderRadius: 14,
            background: "var(--ant-color-fill-tertiary, #f5f5f5)",
            fontSize: 28,
          }}
        >
          {t.icon}
        </div>

        <Title level={5} style={{ margin: 0 }}>
          {t.label}
        </Title>

        {t.desc ? (
          <Text
            type="secondary"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {t.desc}
          </Text>
        ) : (
          <Text type="secondary">&nbsp;</Text>
        )}
      </Space>
    </Card>
  );

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Title level={3} style={{ margin: 0 }}>
          Bảng điều hướng
        </Title>
        <Input.Search
          allowClear
          placeholder="Tìm nhanh mục/chức năng…"
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 420 }}
        />
      </div>

      <Row gutter={[12, 12]}>
        {filtered.map((t) => (
          <Col key={t.key} xs={24} sm={12} md={6} lg={6} xl={6} xxl={6}>
            {renderTile(t)}
          </Col>
        ))}
      </Row>

      {filtered.length === 0 && (
        <Card style={{ marginTop: 12 }}>
          <Space direction="vertical">
            <Text>Không tìm thấy mục phù hợp. Hãy thử từ khóa khác.</Text>
          </Space>
        </Card>
      )}
    </div>
  );
}
