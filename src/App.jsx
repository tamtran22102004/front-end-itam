import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./components/layouts/Header";

const App = () => {
  return (
    <div>
      <Outlet /> {/* Render các trang con */}
    </div>
  );
};

export default App;
