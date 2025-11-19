import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu } from "antd";

import {
  LaptopOutlined,
  AppstoreOutlined,
  DatabaseOutlined,
  SettingOutlined,
  ToolOutlined,
  HistoryOutlined,
  FormOutlined,
  CheckCircleOutlined,
  DeploymentUnitOutlined,
  AppstoreAddOutlined,
  SafetyCertificateOutlined,
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
        icon: <DatabaseOutlined />,
        label: "Tài sản",
        children: [
          { key: "/item", label: "Mẫu tài sản", icon: <AppstoreOutlined /> },
          { key: "/asset", label: "Tài sản", icon: <DatabaseOutlined /> },
          {
            key: "/assethistory",
            label: "Lịch sử tài sản",
            icon: <HistoryOutlined />,
          },
          {
            key: "/schedulemaintenance",
            label: "Lên lịch bảo trì",
            icon: <ToolOutlined />,
          },
          {
            key: "/scheduleworkorder",
            label: "Thực hiện bảo trì",
            icon: <ToolOutlined />,
          },
        ],
      },
      {
        key: "category",
        icon: <AppstoreOutlined />,
        label: "Danh mục",
        children: [
          {
            key: "/category",
            label: "Thêm danh mục",
            icon: <AppstoreOutlined />,
          },
          {
            key: "/category/attribute",
            label: "Thuộc tính danh mục",
            icon: <AppstoreAddOutlined />,
          },
          {
            key: "/category/categoryattribute",
            label: "Cấu hình danh mục",
            icon: <AppstoreAddOutlined />,
          },
        ],
      },
    ],
  },

  {
    key: "sub3",
    icon: <FormOutlined />,
    label: "Yêu cầu & Duyệt",
    children: [
      { key: "/request", label: "Yêu cầu", icon: <FormOutlined /> },
      {
        key: "/requestapproval",
        label: "Duyệt yêu cầu",
        icon: <CheckCircleOutlined />,
      },
    ],
  },

  {
    key: "sub4",
    icon: <DeploymentUnitOutlined />,
    label: "Kiểm kê",
    children: [
      {
        key: "/stocktake",
        label: "Tạo kiểm kê",
        icon: <DeploymentUnitOutlined />,
      },
    ],
  },

  {
    key: "sub5",
    icon: <SettingOutlined />,
    label: "Cài đặt",
    children: [
      {
        key: "/settings/app",
        label: "Ứng dụng",
        icon: <AppstoreAddOutlined />,
      },
      {
        key: "/settings/roles",
        label: "Phân quyền",
        icon: <SafetyCertificateOutlined />,
      },
    ],
  },
];

const SiderNav = ({ collapsedWidth = 64, width = 220 }) => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const defaultOpenKey =
    siderItems.find((group) =>
      group.children?.some((c) =>
        c.children?.some((item) =>
          location.pathname.startsWith(item.key)
        )
      )
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
