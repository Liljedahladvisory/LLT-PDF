import React from "react";
import ReactDOM from "react-dom/client";
import LicenseGate from "./LicenseGate";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <LicenseGate />
  </React.StrictMode>
);
