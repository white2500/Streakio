import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./index.css";

// Register the service worker in production (auto-updating)
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(<App />);
