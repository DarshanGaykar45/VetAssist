import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
} from "lucide-react";

import "./styles/global.css";
import "./styles/components.css";

import Sidebar from "./components/sidebar.jsx";
import Navbar from "./components/navbar.jsx";
import Footer from "./components/footer.jsx";
import Loader from "./components/loader.jsx";
import HomeScreenBanner from "./components/homeScreenBanner.jsx";
import { initSyncEngine } from "./services/syncEngine.js";

import Home from "./pages/home.jsx";
import Login from "./pages/login.jsx";
import Dashboard from "./pages/dashboard.jsx";
import Patients from "./pages/patients.jsx";
import Inseminations from "./pages/inseminations.jsx";
import Reports from "./pages/reports.jsx";
import Settings from "./pages/settings.jsx";

import { AuthProvider } from "./context/AuthContext.jsx";
import { useAuth } from "./hooks/useAuth.js";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/patients": "Farmers & Cattle",
  "/inseminations": "Records",
  "/reports": "Reports",
  "/settings": "Settings",
};

const MOBILE_TABS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Farmers",   path: "/patients",  icon: Users },
  { label: "Records",   path: "/inseminations", icon: CalendarDays },
  { label: "Reports",   path: "/reports",   icon: BarChart3 },
  { label: "Settings",  path: "/settings",  icon: SettingsIcon },
];

function MobileTabBar() {
  const location = useLocation();
  return (
    <nav className="mobile-tab-bar" aria-label="Mobile navigation">
      {MOBILE_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = location.pathname === tab.path;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={`mobile-tab-item ${isActive ? "active" : ""}`}
            aria-label={tab.label}
          >
            <Icon size={20} className="tab-icon" />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

function MobileFAB() {
  const navigate = useNavigate();
  const location = useLocation();

  function handleClick() {
    if (location.pathname === "/inseminations") {
      window.dispatchEvent(new CustomEvent("open-new-insemination"));
    } else {
      navigate("/inseminations", { state: { openNew: true } });
    }
  }

  return (
    <button
      className="mobile-fab"
      onClick={handleClick}
      aria-label="New Insemination"
      title="New Insemination"
    >
      <Plus size={24} />
    </button>
  );
}

function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] || "VetAssist";

  return (
    <div className="app-shell">
      <div className={"app-sidebar " + (collapsed ? "collapsed" : "")}>
        <Sidebar collapsed={collapsed} />
      </div>
      <div className="app-main">
        <Navbar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          pageTitle={pageTitle}
        />
        <main className="app-content" id="main-content">
          <HomeScreenBanner />
          {children}
        </main>
        <Footer />
      </div>
      {/* Mobile-only: bottom tab bar + FAB (CSS hides on desktop) */}
      <MobileTabBar />
      <MobileFAB />
    </div>
  );
}

function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <AppShell>
              <Dashboard />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/patients"
        element={
          <RequireAuth>
            <AppShell>
              <Patients />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/inseminations"
        element={
          <RequireAuth>
            <AppShell>
              <Inseminations />
            </AppShell>
          </RequireAuth>
        }
      />
      {/* Route alias: redirect legacy /appointments to /inseminations */}
      <Route path="/appointments" element={<Navigate to="/inseminations" replace />} />

      <Route
        path="/reports"
        element={
          <RequireAuth>
            <AppShell>
              <Reports />
            </AppShell>
          </RequireAuth>
        }
      />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <AppShell>
              <Settings />
            </AppShell>
          </RequireAuth>
        }
      />
      {/* Fallback to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  // Sync <meta name="theme-color"> with dark/light mode for iOS Safari status bar
  useEffect(() => {
    function updateThemeColor() {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute("content", isDark ? "#0F172A" : "#0F766E");
      }
    }
    updateThemeColor();
    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Initialize offline sync engine, persistent storage & service worker
  useEffect(() => {
    // 1. Request persistent storage for iOS / Safari
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    // 2. Register Service Worker for static App Shell caching
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.info("Service worker registration:", err.message);
      });
    }

    // 3. Start sync engine listeners
    const cleanupSync = initSyncEngine();
    return () => {
      if (cleanupSync) cleanupSync();
    };
  }, []);

  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
