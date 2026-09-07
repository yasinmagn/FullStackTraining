// This is the app's entry point: where React first attaches to the web page.
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// createRoot finds the <div id="root"> in index.html and lets React control it.
// render() draws our <App /> component tree inside that root.
// StrictMode is a dev-only helper that flags unsafe patterns (it renders nothing visible).
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
