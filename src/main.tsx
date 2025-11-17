import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ToastProvider } from "./components/ui/toast";
import "./index.css";

document.documentElement.classList.add("dark");

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
);
