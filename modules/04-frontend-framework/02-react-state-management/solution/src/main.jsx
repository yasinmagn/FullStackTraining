// Entry point: where React connects to the HTML page and starts rendering.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// createRoot grabs the <div id="root"> from index.html; render() draws <App /> into it.
// StrictMode is a dev-only wrapper that highlights potential problems (no visible output).
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
