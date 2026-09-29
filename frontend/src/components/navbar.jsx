import { useState } from "react";
import { Bell, Menu, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth.js";
import { getInitials } from "../utils/helpers.js";

import SyncStatus from "./syncStatus.jsx";

export default function Navbar({ onToggle, pageTitle }) {
  const { user } = useAuth();
  const userName = user?.name || "Clinic Staff";

  // Track theme state reactively so icon updates immediately
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark"
  );

  function toggleTheme() {
    const html = document.documentElement;
    const next = isDark ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("vetassist_theme", next);
    setIsDark(!isDark);
  }

  return (
    <header className="navbar">
      {/* Sidebar toggle */}
      <motion.button
        className="navbar-toggle"
        onClick={onToggle}
        aria-label="Toggle sidebar"
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <Menu size={19} />
      </motion.button>

      {/* Page title with subtle emoji accent */}
      <div className="navbar-breadcrumb">
        <span style={{ opacity: 0.5, marginRight: "0.45rem", fontSize: "0.875rem" }}>
          🐄
        </span>
        {pageTitle}
      </div>

      {/* Right-side actions */}
      <div className="navbar-actions">
        <SyncStatus />
        {/* Theme toggle */}
        <motion.button
          className="navbar-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          whileHover={{ scale: 1.08, rotate: isDark ? -15 : 15 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </motion.button>

        {/* Notifications (cosmetic) */}
        <motion.button
          className="navbar-btn"
          aria-label="Notifications"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.9 }}
        >
          <Bell size={17} />
          <span className="navbar-badge" />
        </motion.button>

        {/* Avatar */}
        <div
          className="navbar-avatar"
          title={`${userName} — ${user?.role || "User"}`}
          aria-label={`Logged in as ${userName}`}
        >
          {getInitials(userName)}
        </div>
      </div>
    </header>
  );
}
