/**
 * Ebb MVP — Entry Point
 *
 * This is where React mounts into the DOM.
 * We import our global CSS (Tailwind + custom theme) here.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);