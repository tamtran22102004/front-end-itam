import React from "react";
import { Layout, Breadcrumb, theme } from "antd";
import { Outlet, useLocation, Link } from "react-router-dom";
import HeaderBar from "./Header";
import SiderNav from "./Sider";
import "../../styles/layout.css";

const { Content, Footer } = Layout;
const makeCrumbs = (pathname) => {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = [{ path: "/", label: "Home" }];
  let acc = "";
  parts.forEach((p) => {
    acc += `/${p}`;
    crumbs.push({ path: acc, label: p.charAt(0).toUpperCase() + p.slice(1) });
  });
  return crumbs;
};

const AppLayout = () => {
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const location = useLocation();
  const crumbs = makeCrumbs(location.pathname);

  return (
    <Layout className="app-layout">
      <HeaderBar />

      <div className="app-main">
        <Breadcrumb
          className="app-breadcrumb"
          items={crumbs.map((c, idx) => ({
            title:
              idx === crumbs.length - 1 ? (
                c.label
              ) : (
                <Link to={c.path}>{c.label}</Link>
              ),
          }))}
        />

        <Layout className="app-shell">
          <SiderNav />
          <Content
            style={{
              padding: "24px",
              minHeight: 360,
              background: "#fff",
              flex: 1,
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </div>
    </Layout>
  );
};

export default AppLayout;
