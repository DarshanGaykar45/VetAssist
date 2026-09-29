import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Printer,
  AlertTriangle,
  Award,
  TrendingUp,
  Syringe,
  Users,
  WifiOff,
} from "lucide-react";
import PageLayout from "../components/pagelayout.jsx";
import Card, { CardHeader, CardBody } from "../components/card.jsx";
import Button from "../components/button.jsx";
import Badge from "../components/badge.jsx";
import EmptyState from "../components/emptystate.jsx";
import Loader from "../components/loader.jsx";
import AnimatedNumber from "../components/AnimatedNumber.jsx";
import reportsService from "../services/reports.service.js";
import { useSync } from "../hooks/useSync.js";
import { formatDate, formatTime } from "../utils/helpers.js";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  },
};

/* Custom Glass Tooltip for Charts */
function CustomChartTooltip({ active, payload, label, unit = "cows" }) {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-lg)",
          padding: "0.625rem 0.875rem",
          boxShadow: "var(--shadow-xl)",
          backdropFilter: "blur(12px)",
          fontSize: "0.8125rem",
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--color-text)", marginBottom: "0.25rem" }}>
          {label}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: "var(--color-primary)", fontWeight: 700 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-primary)" }} />
          <span>
            {payload[0].value} {unit}
          </span>
        </div>
      </div>
    );
  }
  return null;
}

export default function Reports() {
  const { isOnline } = useSync();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReports() {
      if (!navigator.onLine) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const analytics = await reportsService.getAnalytics();
        setData(analytics);
      } catch (err) {
        setError(err.message || "Failed to load insemination reports from database.");
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [isOnline]);

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <PageLayout title="Insemination Reports" subtitle="Loading analytics from database...">
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <Loader size="lg" />
        </div>
      </PageLayout>
    );
  }

  if (!isOnline && !data) {
    return (
      <PageLayout
        title="Insemination Reports & Analytics"
        subtitle="Comprehensive daily and monthly bovine artificial insemination performance."
        actions={
          <Button variant="outline" disabled className="no-print" title="Needs internet connection">
            <Printer size={16} /> Print Report
          </Button>
        }
      >
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)", padding: "3rem 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 460, margin: "0 auto", gap: "1rem" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fef3c7", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <WifiOff size={28} />
            </div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
              Reports Need Internet Connection
            </h2>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem", lineHeight: 1.5, margin: 0 }}>
              Live reporting and veterinary analytics require an active internet connection to compute server-side summaries. Please reconnect to cellular or Wi-Fi to view charts and statistics.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error && !data) {
    return (
      <PageLayout title="Insemination Reports" subtitle="Analytics error">
        <div className="alert-banner alert-error" style={{ margin: "2rem auto", maxWidth: 600 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      </PageLayout>
    );
  }

  const {
    dailySummary = {},
    monthTotals = [],
    dailyTrend = [],
    topFarmers = [],
    whatsappMetrics = {},
    summary = {},
  } = data || {};

  const hasData = (summary.totalInseminations || 0) > 0;

  return (
    <PageLayout
      title="Insemination Reports & Analytics"
      subtitle="Comprehensive daily and monthly bovine artificial insemination performance."
      actions={
        <Button variant="outline" onClick={handlePrint} className="no-print">
          <Printer size={16} /> Print Report
        </Button>
      }
    >
      {!isOnline && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1.25rem",
            borderRadius: "var(--radius-lg)",
            background: "#fef3c7",
            color: "#92400e",
            border: "1px solid #fde68a",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            fontSize: "0.875rem",
          }}
        >
          <WifiOff size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Offline Mode:</strong> Showing previously loaded analytics. Connect to internet for live updates.
          </span>
        </div>
      )}

      {!hasData ? (
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-card)" }}>
          <EmptyState
            title="No insemination records yet"
            text="Reports will populate automatically as you record artificial insemination visits."
            emoji="📊"
          />
        </div>
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Summary Metric Cards */}
          <div className="reports-metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1.25rem", marginBottom: "1.75rem" }}>
            {[
              { label: "Total Insemination Visits", value: summary.totalInseminations || 0, icon: Syringe, color: "#0F766E", bgAlpha: "rgba(15, 118, 110, 0.1)" },
              { label: "Total Cows Inseminated", value: summary.totalCowsInseminated || 0, icon: TrendingUp, color: "#0284C7", bgAlpha: "rgba(2, 132, 199, 0.1)" },
              { label: "Active Farmers Served", value: summary.totalFarmers || 0, icon: Users, color: "#F59E0B", bgAlpha: "rgba(245, 158, 11, 0.1)" },
              { label: "WhatsApp Receipts Sent", value: whatsappMetrics.sent || 0, icon: Award, color: "#10B981", bgAlpha: "rgba(16, 185, 129, 0.1)" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  variants={itemVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-xl)",
                    padding: "1.25rem 1.5rem",
                    boxShadow: "var(--shadow-card)",
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "var(--radius-lg)",
                      background: item.bgAlpha,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: item.color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text)", letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                      <AnimatedNumber value={item.value} />
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", fontWeight: 600, marginTop: "0.25rem" }}>
                      {item.label}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Daily Insemination Report (Today) */}
          <motion.div variants={itemVariants}>
            <Card style={{ marginBottom: "1.75rem" }}>
              <CardHeader title={`Daily Insemination Report — Today (${formatDate(dailySummary.date)})`}>
                <Badge variant="primary">
                  {dailySummary.totalCows || 0} cows served today across {dailySummary.totalVisits || 0} visits
                </Badge>
              </CardHeader>
              <CardBody style={{ padding: 0 }}>
                {(!dailySummary.records || dailySummary.records.length === 0) ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                    No inseminations recorded for today yet.
                  </div>
                ) : (
                  <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
                    <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                          <th style={{ padding: "0.75rem 1rem" }}>Receipt #</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Time</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Farmer Name</th>
                          <th style={{ padding: "0.75rem 1rem" }}>WhatsApp</th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Cows Inseminated</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Semen Straw</th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Receipt Delivery</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailySummary.records.map((r) => (
                          <tr key={r.id} className="table-hover-row" style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                            <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--color-primary)", fontFamily: "monospace" }}>
                              {r.receiptNumber}
                            </td>
                            <td style={{ padding: "0.75rem 1rem" }}>{formatTime(r.time)}</td>
                            <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{r.farmerName}</td>
                            <td style={{ padding: "0.75rem 1rem" }}>{r.farmerMobile}</td>
                            <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 800 }}>{r.cowCount}</td>
                            <td style={{ padding: "0.75rem 1rem" }}>{r.strawCode || "Standard"}</td>
                            <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                              <Badge variant={r.whatsappStatus === "sent" ? "success" : "warning"}>
                                {r.whatsappStatus === "sent" ? "Sent ✓" : r.whatsappStatus}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>

          {/* Monthly Insemination Trend Charts */}
          <motion.div
            variants={itemVariants}
            className="reports-chart-grid dash-chart-grid"
            style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "1.25rem", marginBottom: "1.75rem" }}
          >
            {/* Day-by-Day Activity Chart */}
            <Card>
              <CardHeader title="Daily Insemination Trend (This Month)">
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                  Activity per day
                </span>
              </CardHeader>
              <CardBody>
                {dailyTrend.length === 0 ? (
                  <EmptyState title="No data for this month" emoji="📅" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tealBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#0F766E" stopOpacity={0.95} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
                      <XAxis dataKey="day" label={{ value: "Day of Month", position: "insideBottom", offset: -5, fontSize: 11, fill: "var(--color-text-secondary)" }} tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={{ stroke: "var(--color-border)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} allowDecimals={false} axisLine={{ stroke: "var(--color-border)" }} />
                      <Tooltip content={<CustomChartTooltip label="Day" unit="cows" />} />
                      <Bar
                        dataKey="count"
                        fill="url(#tealBarGrad)"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            {/* Month-over-Month Totals */}
            <Card>
              <CardHeader title="Month-by-Month Insemination Volume">
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                  Monthly total cows
                </span>
              </CardHeader>
              <CardBody>
                {monthTotals.length === 0 ? (
                  <EmptyState title="No monthly data" emoji="📈" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthTotals} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="amberBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.9} />
                          <stop offset="100%" stopColor="#D97706" stopOpacity={0.95} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-light)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} axisLine={{ stroke: "var(--color-border)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--color-text-secondary)" }} allowDecimals={false} axisLine={{ stroke: "var(--color-border)" }} />
                      <Tooltip content={<CustomChartTooltip unit="cows" />} />
                      <Bar
                        dataKey="cows"
                        name="Cows Inseminated"
                        fill="url(#amberBarGrad)"
                        radius={[6, 6, 0, 0]}
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </motion.div>

          {/* Top Farmers Table */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader title="Top Farmers by Insemination Volume">
                <span style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)" }}>
                  Ranked by total cows served
                </span>
              </CardHeader>
              <CardBody style={{ padding: 0 }}>
                {topFarmers.length === 0 ? (
                  <EmptyState title="No farmer history" emoji="👨‍🌾" />
                ) : (
                  <div className="table-wrapper" style={{ border: "none", borderRadius: 0 }}>
                    <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ background: "var(--color-bg-secondary)", borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
                          <th style={{ padding: "0.75rem 1rem", width: 80 }}>Rank</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Farmer Name</th>
                          <th style={{ padding: "0.75rem 1rem" }}>Mobile Number</th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "center" }}>Total Visits</th>
                          <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Total Cows Inseminated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topFarmers.map((f, i) => {
                          const rankColor = i === 0 ? "#F59E0B" : i === 1 ? "#94A3B8" : i === 2 ? "#B45309" : "var(--color-text-secondary)";
                          return (
                            <tr key={f.farmerId || i} className="table-hover-row" style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                              <td style={{ padding: "0.75rem 1rem" }}>
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: 26,
                                    height: 26,
                                    borderRadius: "50%",
                                    background: i < 3 ? `${rankColor}20` : "transparent",
                                    color: rankColor,
                                    fontWeight: 800,
                                    fontSize: "0.8125rem",
                                  }}
                                >
                                  #{i + 1}
                                </span>
                              </td>
                              <td style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>{f.farmerName}</td>
                              <td style={{ padding: "0.75rem 1rem", color: "var(--color-text-secondary)" }}>{f.farmerMobile}</td>
                              <td style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 600 }}>{f.visits}</td>
                              <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 800, color: "var(--color-primary)" }}>
                                {f.cowsInseminated} cows
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </PageLayout>
  );
}
