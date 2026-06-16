import React from "react";
import { createRoot } from "react-dom/client";
import SmartSafetyApp from "./SmartSafetyApp.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SmartSafetyApp />
  </React.StrictMode>
);
