import React, { useState, useEffect } from "react";
import {
  AppstoreOutlined,
  MailOutlined,
  DatabaseOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Menu, Button, Avatar, Dropdown } from "antd";
import { useNavigate } from "react-router-dom";
import "../../styles/Header.css";

const Header = () => {
  const [current, setCurrent] = useState("home");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 🔹 Lấy thông tin người dùng từ localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("user");
      if (savedUser && savedUser !== "undefined") {
        setUser(JSON.parse(savedUser));
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Lỗi khi parse user:", error);
      setUser(null);
    }
  }, []);

  // 🔹 Xử lý khi click menu
  const handleMenuClick = (e) => {
    setCurrent(e.key);

    // Nếu key bắt đầu bằng "/", ta điều hướng trực tiếp
    if (e.key.startsWith("/")) {
      navigate(e.key);
      return;
    }

    // Các key đặc biệt khác
    switch (e.key) {
      case "home":
        navigate("/");
        break;
      default:
        break;
    }
  };

  // 🔹 Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  // 🔹 Cấu trúc menu chính
  const menuItems = [
    { label: "Trang chủ", key: "home", icon: <MailOutlined /> },
    {
      key: "requests",
      icon: <DatabaseOutlined />,
      label: "Yêu cầu & Duyệt",
      children: [
        { key: "/request", label: "Yêu cầu" },
        { key: "/requestapproval", label: "Duyệt yêu cầu" },
      ],
    },
    {
      key: "inventory",
      icon: <AppstoreOutlined />,
      label: "Kiểm kê",
      children: [{ key: "/stocktake", label: "Tạo kiểm kê" }],
    },
  ];

  // 🔹 Menu người dùng
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
      {/* Logo */}
      <div className="header-logo" onClick={() => navigate("/")}>
        ITAM
      </div>

      {/* Thanh menu */}
      <Menu
        onClick={handleMenuClick}
        selectedKeys={[current]}
        mode="horizontal"
        items={menuItems}
        className="header-menu"
      />

      {/* Người dùng */}
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
