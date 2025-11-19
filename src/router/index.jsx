// src/router/index.jsx (hoặc file router của bạn)
import React from "react";
import { createHashRouter } from "react-router-dom";

import PrivateRoute from "../components/PrivateRoute";
import AppLayout from "../components/layouts/AppLayout";

import LoginPage from "../pages/Login";
import RegisterPage from "../pages/Register";
import CategoryPage from "../pages/Category";
import AttributePage from "../pages/Attribute";
import CategoryAttributePage from "../pages/CategoryAttribute";
import ItemMasterPage from "../pages/ItemMaster";
import AssetPage from "../pages/Asset";
import AssetDetailPage from "../pages/AssetDetail";
import RequestPage from "../pages/Request";
import AssetHistoryPage from "../pages/AssetHistory";
import ScheduleMaintenancePage from "../pages/ScheduleMaintenance";
import ScheduleWorkOrderPage from "../pages/ScheduleWorkOrder";
import RequestApprovalPage from "../pages/RequestApproval";
import StocktakeWizardPage from "../pages/StocktakeWizard";
import StocktakeSessionDetailPage from "../pages/StocktakeSessionDetail";
import HomePage from "../pages/Home";
import DashboardPage from "../pages/Dashboard";
import NotFound from "../pages/NotFound";

const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    // KHÔNG còn errorElement ở đây nữa
    children: [
      {
        index: true,
        element: (
          <PrivateRoute>
            <DashboardPage />
          </PrivateRoute>
        ),
      },

      // public
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },

      // protected
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
            <ItemMasterPage />
          </PrivateRoute>
        ),
      },
      {
        path: "asset",
        element: (
          <PrivateRoute>
            <AssetPage />
          </PrivateRoute>
        ),
      },
      {
        path: "assetdetail/:id",
        element: (
          <PrivateRoute>
            <AssetDetailPage />
          </PrivateRoute>
        ),
      },
      {
        path: "request",
        element: (
          <PrivateRoute>
            <RequestPage />
          </PrivateRoute>
        ),
      },
      {
        path: "assethistory",
        element: (
          <PrivateRoute>
            <AssetHistoryPage />
          </PrivateRoute>
        ),
      },
      {
        path: "schedulemaintenance",
        element: (
          <PrivateRoute>
            <ScheduleMaintenancePage />
          </PrivateRoute>
        ),
      },
      {
        path: "scheduleworkorder",
        element: (
          <PrivateRoute>
            <ScheduleWorkOrderPage />
          </PrivateRoute>
        ),
      },
      {
        path: "requestapproval",
        element: (
          <PrivateRoute>
            <RequestApprovalPage />
          </PrivateRoute>
        ),
      },
      {
        path: "stocktake",
        element: (
          <PrivateRoute>
            <StocktakeWizardPage />
          </PrivateRoute>
        ),
      },
      {
        path: "stocktake/:id",
        element: (
          <PrivateRoute>
            <StocktakeSessionDetailPage />
          </PrivateRoute>
        ),
      },
      {
        path: "home",
        element: (
          <PrivateRoute>
            <HomePage />
          </PrivateRoute>
        ),
      },

      // ⬇️ CATCH-ALL phải để CUỐI cùng
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

export default router;
