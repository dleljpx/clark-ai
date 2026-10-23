import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Initialize theme
const savedTheme = localStorage.getItem('theme');

if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  // Default to light mode
  document.documentElement.classList.remove('dark');
  if (!savedTheme) {
    localStorage.setItem('theme', 'light');
  }
}

createRoot(document.getElementById("root")!).render(<App />);
