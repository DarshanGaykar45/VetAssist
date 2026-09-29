import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  Stethoscope,
  LogOut,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { getPendingOutboxCount, clearAllLocalData } from "../db/indexedDb.js";

const NAV_ITEMS = [
  { label: "Dashboard",        path: "/dashboard",     icon: LayoutDashboard },
  { label: "Farmers & Cattle", path: "/patients",      icon: Users },
  { label: "Records",          path: "/inseminations", icon: CalendarDays },
  { label: "Reports",          path: "/reports",       icon: BarChart3 },
  { label: "Settings",         path: "/settings",      icon: Settings },
];

export default function Sidebar({ collapsed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  async function handleLogout() {
    try {
      const pending = await getPendingOutboxCount();
      if (pending > 0) {
        const proceed = window.confirm(
          `You have ${pending} record${pending > 1 ? "s" : ""} saved on this phone that have not uploaded yet.\n\nLogging out will remove local data and these pending records will be lost.\n\nDo you want to log out anyway?`
        );
        if (!proceed) return;
      }
      await clearAllLocalData();
    } catch (e) {
      console.warn("Logout cleanup error:", e);
    }
    logout();
    navigate("/login");
  }

  const doctorName  = user?.name || "Doctor";
  // Initials for the avatar hint in collapsed mode
  const initials = doctorName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <nav className={`sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Main navigation">
      {/* Logo / Brand */}
      <NavLink to="/dashboard" className="sidebar-logo" aria-label="VetAssist Dashboard">
        <motion.div
          className="sidebar-logo-icon"
          whileHover={{ rotate: 10, scale: 1.08 }}
          transition={{ type: "spring", stiffness: 380, damping: 15 }}
        >
          <Stethoscope size={20} />
        </motion.div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">VetAssist</span>
          <span className="sidebar-logo-sub">Cattle AI Clinic</span>
        </div>
      </NavLink>

      {/* Navigation */}
      <div className="sidebar-nav">
        <p className="sidebar-section-title">Clinic Menu</p>
        {NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.path}
            {...item}
            isActive={location.pathname === item.path}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* Footer — Doctor info + Logout */}
      <div className="sidebar-footer">
        {/* Doctor identity strip */}
        <div className="sidebar-user-info">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}
            >
              <div
                style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "linear-gradient(135deg, #0F766E, #14B8A6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", fontWeight: 800, color: "white", flexShrink: 0,
                  border: "1.5px solid rgba(45,212,191,0.3)",
                }}
              >
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <span className="sidebar-user-name">{doctorName}</span>
                <span className="sidebar-user-role">Veterinary Doctor</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Logout button */}
        <motion.button
          className="sidebar-item"
          onClick={handleLogout}
          aria-label="Logout"
          whileHover={{ x: collapsed ? 0 : 2 }}
          whileTap={{ scale: 0.97 }}
          style={{ color: "rgba(252,165,165,0.8)" }}
        >
          <LogOut size={17} className="sidebar-item-icon" style={{ color: "#fca5a5" }} />
          <span className="sidebar-item-label" style={{ color: "#fecaca" }}>Logout</span>
        </motion.button>
      </div>
    </nav>
  );
}

function SidebarItem({ label, path, icon: Icon, isActive }) {
  return (
    <NavLink
      to={path}
      className={`sidebar-item ${isActive ? "active" : ""}`}
      style={{ position: "relative" }}
    >
      {/* Animated sliding pill — uses layoutId so it smoothly moves between items */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="sidebarActivePill"
            className="sidebar-active-indicator"
            initial={{ opacity: 0, scaleY: 0.5 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.5 }}
            transition={{ type: "spring", stiffness: 500, damping: 34 }}
          />
        )}
      </AnimatePresence>

      <motion.div
        whileHover={{ scale: isActive ? 1 : 1.1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <Icon size={17} className="sidebar-item-icon" />
      </motion.div>
      <span className="sidebar-item-label">{label}</span>
    </NavLink>
  );
}
