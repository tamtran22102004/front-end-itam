import React from "react";
import { createBrowserRouter } from "react-router-dom";

import App from "../App";
import PrivateRoute from "../components/PrivateRoute";
import AppLayout from "../components/layouts/AppLayout";
import MaintenanceApprovalPage from "../pages/MaintenanceApproval";
import LoginPage from "../pages/Login";
import RegisterPage from "../pages/Register";
import CategoryPage from "../pages/Category";
import AttributePage from "../pages/Attribute";
import CategoryAttributePage from "../pages/CategoryAttribute";
import ItemMasterPage from "../pages/ItemMaster";
import AssetPage from "../pages/Asset";
import AssetConfigPage from "../pages/AssetConfig";
import AssetDetailPage from "../pages/AssetDetail";
import AllocationApprovalPage from "../pages/AllocationApproval";
import RequestPage from "../pages/Request";
import AssetHistoryPage from "../pages/AssetHistory";
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      {
        path: "category",
        element: (
          <PrivateRoute>
            <CategoryPage />
          </PrivateRoute>
        ),
      },
      {
        path: "category/attribute",
        element: (
          <PrivateRoute>
            <AttributePage />
          </PrivateRoute>
        ),
      },
      {
        path: "category/categoryattribute",
        element: (
          <PrivateRoute>
            <CategoryAttributePage />
          </PrivateRoute>
        ),
      },
      {
        path: "item",
        element: (
          <PrivateRoute>
            < ItemMasterPage/>
          </PrivateRoute>
        ),
      },
      {
        path: "asset",
        element: (
          <PrivateRoute>
            < AssetPage/>
          </PrivateRoute>
        ),
      },
      {
        path: "assetconfig",
        element: (
          <PrivateRoute>
            < AssetConfigPage/>
          </PrivateRoute>
        ),
      },
      {
        path: "assetdetail/:id",
        element: (
          <PrivateRoute>
            < AssetDetailPage/>
          </PrivateRoute>
        ),
      },
      {
        path: "requestapproval",
        element: (
          <PrivateRoute>
            < AllocationApprovalPage/>
          </PrivateRoute>
        ),
      },
      {
        path: "request",
        element: (
          <PrivateRoute>
            < RequestPage/>
          </PrivateRoute>
        ),
      },
      {
        path: "assethistory",
        element: (
          <PrivateRoute>
            < AssetHistoryPage/>
          </PrivateRoute>
        ),
      },
      { path: "requestmaintenance", element:
        <PrivateRoute>
          <MaintenanceApprovalPage />
        </PrivateRoute>
      },
    ],
  },
]);

export default router;
