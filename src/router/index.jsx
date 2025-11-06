import React from "react";
import { createBrowserRouter } from "react-router-dom";

import App from "../App";
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
import HomePage from"../pages/Home";
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
      // router
      {
        path: "/stocktake/:id",
        element: (
          <PrivateRoute>
            <StocktakeSessionDetailPage />
          </PrivateRoute>
        ),
      },
      {
        path:"/",
        element:(
          <PrivateRoute>
            <HomePage/>
          </PrivateRoute>
        )
      }
      
    ],
  },
]);

export default router;
