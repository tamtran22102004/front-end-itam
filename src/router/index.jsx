import React from "react";
import { createBrowserRouter } from "react-router-dom";

import App from "../App";
import PrivateRoute from "../components/PrivateRoute";
import AppLayout from "../components/layouts/AppLayout";
import HomePage from "../pages/Home";
import LoginPage from "../pages/Login";
import RegisterPage from "../pages/Register";
import CategoryPage from "../pages/Category";
import AttributePage from "../pages/Attribute";
import CategoryAttributePage from "../pages/CategoryAttribute";
import ItemMasterPage from "../pages/ItemMaster";
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "home", element: <HomePage /> },
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
    ],
  },
]);

export default router;
