import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  CalendarDays,
  Clock,
  Plus,
  CalendarPlus,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import StatCard from "../components/statcard.jsx";
import Card, { CardHeader, CardBody } from "../components/card.jsx";
import Badge from "../components/badge.jsx";
import Button from "../components/button.jsx";
import PageLayout from "../components/pagelayout.jsx";
import EmptyState from "../components/emptystate.jsx";
import Loader from "../components/loader.jsx";
import dashboardService from "../services/dashboard.service.js";
import { formatDate, CHART_COLORS } from "../utils/helpers.js";

/* ── Framer Motion variants ── */
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.09 },
  },
};

const itemVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] },
  },
};

/* ── Animated Gradient Mesh background ── */
function MeshBackground() {
  return (
    <div className="dash-mesh-bg" aria-hidden="true">
      <div className="mesh-blob mesh-blob-1" />
      <div className="mesh-blob mesh-blob-2" />
      <div className="mesh-blob mesh-blob-3" />
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (err) {
        setError(err.message || "Failed to load clinic statistics from backend.");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <>
        <MeshBackground />
        <PageLayout title="Dashboard" subtitle="Loading live clinic statistics...">
          <div style={{ display: "flex", justifyContent: "center", padding: "6rem" }}>
            <Loader size="lg" />
          </div>
        </PageLayout>
      </>
    );
  }

  if (error) {
    return (
      <>
        <MeshBackground />
        <PageLayout title="Dashboard" subtitle="Clinic Overview">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="alert-banner alert-error"
            style={{ marginBottom: "1.5rem" }}
          >
            <AlertTriangle size={18} />
            <span>{error}</span>
          </motion.div>
        </PageLayout>
      </>
    );
  }

  const {
    totalFarmers = 0,
    totalCows = 0,
    inseminationsToday = 0,
    cowsInseminatedToday = 0,
    inseminationsThisMonth = 0,
    cowsInseminatedThisMonth = 0,
    inseminationsTrend = [],
    breedDistribution = [],
    recentInseminations = [],
    recentFarmers = [],
  } = stats || {};

  return (
    <>
      <MeshBackground />
      <PageLayout
        title="Clinic Dashboard"
        subtitle="VetAssist Cattle Insemination Clinic — Real-time persistent metrics."
        actions={
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <Button variant="outline" onClick={() => navigate("/patients")}>
              <Users size={15} /> Farmers
            </Button>
            <Button variant="primary" onClick={() => navigate("/inseminations")}>
              <CalendarPlus size={15} /> New Insemination
            </Button>
          </div>
        }
      >
        {/* ── Welcome Banner ── */}
        <motion.div
          className="dash-welcome"
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ marginBottom: "1.75rem" }}
        >
          <div className="dash-welcome-cow" aria-hidden="true">🐄</div>
          <h2 style={{ fontWeight: 800, fontSize: "1.375rem", marginBottom: "0.375rem", position: "relative", zIndex: 1 }}>
            Bovine Reproduction &amp; AI Management
          </h2>
          <p style={{ opacity: 0.85, fontSize: "0.9375rem", maxWidth: 600, position: "relative", zIndex: 1, lineHeight: 1.55 }}>
            Manage farmer herds, record artificial insemination visits, and deliver instant WhatsApp receipts.
          </p>
        </motion.div>

        {/* ── Primary Stat Cards — staggered entrance ── */}
        <motion.div
          className="grid-4"
          style={{ marginBottom: "1.75rem" }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <StatCard
              label="Total Registered Farmers"
              value={totalFarmers}
              icon={Users}
              color="#0F766E"
              bgColor="rgba(15,118,110,0.12)"
              glowColor="rgba(15,118,110,0.35)"
              index={0}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label="Total Bovine Herd"
              value={totalCows}
              icon={TrendingUp}
              color="#D97706"
              bgColor="rgba(245,158,11,0.12)"
              glowColor="rgba(245,158,11,0.35)"
              index={1}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label="Inseminations Today"
              value={inseminationsToday}
              trendLabel={`${cowsInseminatedToday} cows served`}
              icon={CalendarDays}
              color="#0369A1"
              bgColor="rgba(3,105,161,0.1)"
              glowColor="rgba(3,105,161,0.3)"
              index={2}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label="This Month Visits"
              value={inseminationsThisMonth}
              trendLabel={`${cowsInseminatedThisMonth} cows total`}
              icon={Clock}
              color="#059669"
              bgColor="rgba(5,150,105,0.1)"
              glowColor="rgba(5,150,105,0.3)"
              index={3}
            />
          </motion.div>
        </motion.div>

        {/* ── Trend Chart & Breed Breakdown ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 0.65fr",
            gap: "1.25rem",
            marginBottom: "1.5rem",
          }}
          className="dash-chart-grid"
        >
          {/* Inseminations Trend */}
          <Card>
            <CardHeader title="Insemination Trend (Last 14 Days)">
              <Badge variant="primary">
                {cowsInseminatedThisMonth} cows this month
              </Badge>
            </CardHeader>
            <CardBody>
              {inseminationsTrend.length === 0 || inseminationsTrend.every((t) => t.count === 0) ? (
                <EmptyState
                  title="No recent inseminations"
                  text="Trend will plot automatically as visits are recorded."
                  emoji="📈"
                />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={inseminationsTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0F766E" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }}
                      axisLine={false} tickLine={false} allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10, border: "1px solid var(--color-border)",
                        fontSize: 13, background: "var(--color-surface)",
                        boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                      }}
                    />
                    <Area
                      type="monotone" dataKey="count" name="Cows Inseminated"
                      stroke="#0F766E" strokeWidth={2.5}
                      fill="url(#aiGrad)"
                      dot={{ fill: "#0F766E", strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5, fill: "#0F766E", strokeWidth: 2, stroke: "white" }}
                      isAnimationActive={true}
                      animationDuration={1400}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>

          {/* Breed Breakdown */}
          <Card>
            <CardHeader title="Cattle by Breed" />
            <CardBody>
              {breedDistribution.length === 0 ? (
                <EmptyState
                  title="No cattle registered"
                  text="Add cows to see breed distribution."
                  emoji="🐄"
                />
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={breedDistribution}
                      cx="50%" cy="50%"
                      innerRadius={52}
                      outerRadius={80}
                      dataKey="value"
                      paddingAngle={3}
                      isAnimationActive={true}
                      animationDuration={1400}
                      animationEasing="ease-out"
                    >
                      {breedDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10, fontSize: 13,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        </motion.div>

        {/* ── Recent Records & Quick Actions ── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.6fr",
            gap: "1.25rem",
          }}
          className="dash-chart-grid"
        >
          {/* Recent Inseminations */}
          <Card>
            <CardHeader title="Recent Insemination Records">
              <Button variant="ghost" size="sm" onClick={() => navigate("/inseminations")}>
                View all →
              </Button>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {recentInseminations.length === 0 ? (
                <EmptyState
                  title="No inseminations yet"
                  text="Click 'New Insemination' to record your first visit."
                  emoji="💉"
                />
              ) : (
                <AnimatePresence initial={false}>
                  {recentInseminations.map((r, i) => (
                    <motion.div
                      key={r.id}
                      className="dash-recent-row"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.875rem",
                        padding: "0.875rem 1.5rem",
                        borderBottom: "1px solid var(--color-border-light)",
                        transition: "background 150ms ease",
                        cursor: "default",
                      }}
                      whileHover={{ backgroundColor: "var(--color-primary-alpha)" }}
                    >
                      <div
                        style={{
                          width: 36, height: 36,
                          borderRadius: "var(--radius-md)",
                          background: "var(--color-primary-alpha)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "1.05rem", flexShrink: 0,
                          border: "1px solid rgba(15,118,110,0.15)",
                        }}
                      >
                        🐄
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0, color: "var(--color-text)" }}>
                            {r.farmerName}
                          </p>
                          <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
                            {r.receiptNumber}
                          </span>
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", margin: 0 }}>
                          {formatDate(r.date)} · {r.time} · {r.cowCount} cow{r.cowCount > 1 ? "s" : ""}
                        </p>
                      </div>
                      <div>
                        {r.whatsappStatus === "sent" ? (
                          <Badge variant="success">Sent ✓</Badge>
                        ) : r.whatsappStatus === "failed" ? (
                          <Badge variant="error">Failed</Badge>
                        ) : (
                          <Badge variant="warning">Pending</Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </CardBody>
          </Card>

          {/* Quick Actions + Recent Farmers */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Quick Actions */}
            <Card>
              <CardHeader title="Quick Actions" />
              <CardBody>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <Button variant="primary" onClick={() => navigate("/inseminations")}>
                    <CalendarPlus size={15} /> New Insemination Visit
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/patients")}>
                    <Plus size={15} /> Register New Farmer
                  </Button>
                  <Button variant="ghost" onClick={() => navigate("/reports")}>
                    <TrendingUp size={15} /> View Reports &amp; Analytics
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Recent Farmers */}
            <Card>
              <CardHeader title="Recent Farmers">
                <Button variant="ghost" size="sm" onClick={() => navigate("/patients")}>
                  Directory →
                </Button>
              </CardHeader>
              <CardBody style={{ padding: 0 }}>
                {recentFarmers.length === 0 ? (
                  <EmptyState title="No farmers registered" emoji="👨‍🌾" />
                ) : (
                  recentFarmers.map((f, i) => (
                    <motion.div
                      key={f.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "0.75rem 1.25rem",
                        borderBottom: "1px solid var(--color-border-light)",
                      }}
                      whileHover={{ backgroundColor: "var(--color-primary-alpha)" }}
                    >
                      <div>
                        <p style={{ fontWeight: 700, fontSize: "0.875rem", margin: 0 }}>{f.name}</p>
                        <p style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", margin: 0 }}>
                          {f.village || f.mobile}
                        </p>
                      </div>
                      <Badge variant="neutral">{f.cowsOwned || 0} cows</Badge>
                    </motion.div>
                  ))
                )}
              </CardBody>
            </Card>
          </div>
        </motion.div>
      </PageLayout>
    </>
  );
}
