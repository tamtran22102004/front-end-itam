import React, { useState, useEffect } from "react";
import {
  HomeOutlined,
  DashboardOutlined,
  AuditOutlined,
  BarcodeOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Menu, Button, Avatar, Dropdown } from "antd";
import { useNavigate } from "react-router-dom";
import "../../styles/Header.css";

const Header = () => {
  const [current, setCurrent] = useState("home");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser && savedUser !== "undefined") {
        setUser(JSON.parse(savedUser));
      }
    } catch {
      setUser(null);
    }
  }, []);

  const handleMenuClick = (e) => {
    setCurrent(e.key);
    if (e.key.startsWith("/")) {
      navigate(e.key);
      return;
    }
    if (e.key === "home") navigate("/home");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const menuItems = [
    { label: "Trang chủ", key: "home", icon: <HomeOutlined /> },
    { label: "Dashboard", key: "/", icon: <DashboardOutlined /> },
    {
      key: "requests",
      icon: <AuditOutlined />,
      label: "Yêu cầu & Duyệt",
      children: [
        { key: "/request", label: "Yêu cầu" },
        { key: "/requestapproval", label: "Duyệt yêu cầu" },
      ],
    },
    {
      key: "inventory",
      icon: <BarcodeOutlined />,
      label: "Kiểm kê",
      children: [{ key: "/stocktake", label: "Tạo kiểm kê" }],
    },
  ];

  const userMenu = (
    <Menu
      onClick={({ key }) => {
        if (key === "profile") navigate("/profile");
        if (key === "logout") handleLogout();
      }}
      items={[
        { key: "profile", label: "Hồ sơ" },
        { key: "logout", label: "Đăng xuất" },
      ]}
    />
  );

  return (
    <header className="header">
      <div className="header-logo" onClick={() => navigate("/")}>
        ITAM
      </div>

      <Menu
        onClick={handleMenuClick}
        selectedKeys={[current]}
        mode="horizontal"
        items={menuItems}
        className="header-menu"
      />

      <div className="header-user">
        {user ? (
          <Dropdown overlay={userMenu} placement="bottomRight" arrow>
            <div className="header-user-info">
              <Avatar src={user.avatar} icon={<UserOutlined />} />
              <span className="header-username">{user.fullname}</span>
            </div>
          </Dropdown>
        ) : (
          <>
            <Button type="link" onClick={() => navigate("/login")}>
              Đăng nhập
            </Button>
            <Button type="primary" onClick={() => navigate("/register")}>
              Đăng ký
            </Button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
