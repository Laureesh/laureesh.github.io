import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import ThemeProvider from "./components/ThemeProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { DisplayLanguageProvider } from "./contexts/DisplayLanguageContext";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <DisplayLanguageProvider>
            <App />
          </DisplayLanguageProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
