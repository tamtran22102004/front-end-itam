import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu } from "antd";
import {
  LaptopOutlined,
  NotificationOutlined,
  UserOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  SettingOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

const siderItems = [
  {
    key: "sub2",
    icon: <LaptopOutlined />,
    label: "Thiết bị",
    children: [
      {
        key: "assets",
        label: "Tài sản",
        children: [
          { key: "/item", label: "Mẫu tài sản" },
          { key: "/asset", label: "Tài sản" },
          { key: "/assetconfig", label: "Cấu hình tài sản" },
        ],
      },
      {
        key: "category",
        label: "Danh mục",
        children: [
          { key: "/category", label: "Thêm danh mục" },
          { key: "/category/attribute", label: "Thuộc tính danh mục" },
          { key: "/category/categoryattribute", label: "Cấu hình danh mục" },
          { key: "/assethistory", label: "Lịch sử tài sản" },

        ],
      },
    ],
  },

  {
    key: "sub3",
    icon: <DatabaseOutlined />,
    label: "Yêu cầu & Duyệt",
    children: [
      {
        key: "request",
        label: "Yêu cầu",
        children: [{ key: "/request", label: "Mẫu yêu cầu" }],
      },
      {
        key: "Approval",
        label: "Duyệt yêu cầu",
        children: [
          { key: "/requestapproval", label: " Cấp phát" },
        ],
      },
    ],
  },
  {
    key: "sub4",
    icon: <AppstoreOutlined />,
    label: "Dịch vụ",
    children: [
      { key: "/services", label: "Tổng quan" },
      { key: "/requests", label: "Yêu cầu" },
    ],
  },
  {
    key: "sub5",
    icon: <SettingOutlined />,
    label: "Cài đặt",
    children: [
      { key: "/settings/app", label: "Ứng dụng" },
      { key: "/settings/roles", label: "Phân quyền" },
    ],
  },
  {
    key: "sub6",
    icon: <NotificationOutlined />,
    label: "Thông báo",
    children: [{ key: "/notifications", label: "Tất cả" }],
  },
];

const SiderNav = ({ collapsedWidth = 64, width = 220 }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const defaultOpenKey =
    siderItems.find((group) =>
      group.children?.some((c) => location.pathname.startsWith(c.key))
    )?.key || "sub2";

  return (
    <Sider
      width={width}
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      breakpoint="lg"
      collapsedWidth={collapsedWidth}
      style={{ background: "transparent" }}
    >
      <Menu
        mode="inline"
        defaultOpenKeys={[defaultOpenKey]}
        selectedKeys={[location.pathname]}
        style={{ height: "100%" }}
        items={siderItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
};

export default SiderNav;
