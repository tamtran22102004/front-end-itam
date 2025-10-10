import React, { useState, useEffect } from "react";
import {
  AppstoreOutlined,
  MailOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Menu, Button, Avatar, Dropdown } from "antd";
import { useNavigate } from "react-router-dom";

// Import CSS từ thư mục styles
import "../../styles/Header.css";

const Header = () => {
  const [current, setCurrent] = useState("mail");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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


  const onClick = (e) => {
    setCurrent(e.key);
    if (e.key === "home") navigate("/home");
    if (e.key === "services") navigate("/services");
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
    navigate("/login");
  };

  const items = [
    { label: "Trang chủ", key: "home", icon: <MailOutlined /> },
    { label: "Dịch vụ", key: "services", icon: <AppstoreOutlined /> },
    {
      label: "Cài đặt",
      key: "settings",
      icon: <SettingOutlined />,
      children: [
        {
          type: "group",
          label: "Nhóm 1",
          children: [
            { label: "Option 1", key: "setting:1" },
            { label: "Option 2", key: "setting:2" },
          ],
        },
        {
          type: "group",
          label: "Nhóm 2",
          children: [
            { label: "Option 3", key: "setting:3" },
            { label: "Option 4", key: "setting:4" },
          ],
        },
      ],
    },
  ];

  const userMenu = (
    <Menu>
      <Menu.Item key="profile">Hồ sơ</Menu.Item>
      <Menu.Item key="logout" onClick={handleLogout}>
        Đăng xuất
      </Menu.Item>
    </Menu>
  );

  return (
    <header className="header">
      <div className="header-logo" onClick={() => navigate("/home")}>
        ITAM
      </div>

      <Menu
        onClick={onClick}
        selectedKeys={[current]}
        mode="horizontal"
        items={items}
        className="header-menu"
      />

      <div className="header-user">
        {user ? (
          <Dropdown overlay={userMenu} placement="bottomRight">
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
