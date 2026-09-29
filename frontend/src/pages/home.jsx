import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Users,
  Send,
  BarChart3,
  Stethoscope,
  Shield,
  ArrowRight,
  CheckCircle2,
  Star,
  ChevronDown,
} from "lucide-react";

const FEATURES = [
  { icon: CalendarDays, title: "Insemination Visits", desc: "Record artificial inseminations with date, time, cow count, and bull/straw pedigree details.", color: "#2d6a4f" },
  { icon: Send, title: "Instant WhatsApp Receipts", desc: "Official receipts sent directly to the farmer's WhatsApp number from the doctor's personal phone.", color: "#40916c" },
  { icon: Users, title: "Farmer-First Directory", desc: "Organized around dairy farmers with expandable cow tags, breeds, and lactation counts.", color: "#52b788" },
  { icon: BarChart3, title: "Insemination Analytics", desc: "Daily & monthly AI performance, top farmers by volume, and breed distributions.", color: "#1b4332" },
  { icon: Shield, title: "Single-Doctor Security", desc: "Zero public registration, bcrypt password hashing, and encrypted JWT doctor authentication.", color: "#74c69d" },
  { icon: CheckCircle2, title: "Permanent Relational Records", desc: "Persistent SQLite database that tracks full lifetime reproductive histories per farmer.", color: "#b5832a" },
];

const STATS = [
  { value: "500+", label: "Cows Inseminated" },
  { value: "98%", label: "WhatsApp Delivery Rate" },
  { value: "100%", label: "Farmer Satisfaction" },
  { value: "12+", label: "Years Field Experience" },
];

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?w=1600&q=80",
  "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=1600&q=80",
  "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1600&q=80",
];

export default function Home() {
  const [bgIndex, setBgIndex] = useState(0);
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const timer = setInterval(() => setBgIndex((i) => (i + 1) % BG_IMAGES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setVisible((p) => ({ ...p, [e.target.id]: true })); }),
      { threshold: 0.1 }
    );
    document.querySelectorAll("[data-animate]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>
      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 2rem", background: "rgba(11,31,13,0.88)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(82,183,136,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#2d6a4f,#52b788)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(45,106,79,0.4)" }}>
            <Stethoscope size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>VetAssist</div>
            <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Cattle AI Clinic</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.625rem" }}>
          <Link to="/login" style={{ padding: "0.5rem 1.25rem", background: "rgba(255,255,255,0.1)", color: "white", borderRadius: 9999, fontSize: "0.875rem", fontWeight: 500, border: "1px solid rgba(255,255,255,0.2)" }}>Doctor Login</Link>
          <Link to="/login" style={{ padding: "0.5rem 1.25rem", background: "linear-gradient(135deg,#2d6a4f,#52b788)", color: "white", borderRadius: 9999, fontSize: "0.875rem", fontWeight: 700, boxShadow: "0 4px 14px rgba(45,106,79,0.5)" }}>Access Portal</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {BG_IMAGES.map((src, i) => (
          <div key={i} style={{ position: "absolute", inset: 0, backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center", transition: "opacity 1.5s ease", opacity: i === bgIndex ? 1 : 0 }} />
        ))}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(11,31,13,0.88) 0%,rgba(27,67,50,0.78) 50%,rgba(45,106,79,0.65) 100%)" }} />

        <div style={{ position: "relative", zIndex: 2, textAlign: "center", padding: "8rem 2rem 5rem", maxWidth: 820, margin: "0 auto", animation: "slideUp 800ms ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem 1rem", background: "rgba(116,198,157,0.18)", border: "1px solid rgba(116,198,157,0.4)", borderRadius: 9999, marginBottom: "2rem" }}>
            <span>🐄</span>
            <span style={{ fontSize: "0.7rem", color: "#95d5b2", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Artificial Insemination Management</span>
          </div>
          <h1 style={{ fontSize: "clamp(2.25rem,6vw,4rem)", fontWeight: 800, color: "white", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1.5rem" }}>
            Precision AI Care for<br />
            <span style={{ background: "linear-gradient(135deg,#74c69d,#95d5b2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Dairy Farmers</span>
          </h1>
          <p style={{ fontSize: "clamp(1rem,2.5vw,1.175rem)", color: "rgba(255,255,255,0.78)", maxWidth: 600, margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
            A dedicated system built for single-practitioner veterinarians. Record cattle inseminations, maintain farmer herds, and send automated WhatsApp receipts in seconds.
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.875rem 2.25rem", background: "linear-gradient(135deg,#2d6a4f,#52b788)", color: "white", borderRadius: 9999, fontWeight: 700, fontSize: "1rem", boxShadow: "0 8px 24px rgba(45,106,79,0.55)", transition: "all 200ms ease" }}>
              Sign In to Clinic <ArrowRight size={16} />
            </Link>
            <a href="#features" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.875rem 2.25rem", background: "transparent", color: "white", borderRadius: 9999, fontWeight: 600, fontSize: "1rem", border: "2px solid rgba(255,255,255,0.35)" }}>
              Explore Features <ChevronDown size={16} />
            </a>
          </div>
        </div>

        <div style={{ position: "absolute", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.5rem", zIndex: 2 }}>
          {BG_IMAGES.map((_, i) => (
            <button key={i} onClick={() => setBgIndex(i)} style={{ width: i === bgIndex ? 24 : 8, height: 8, borderRadius: 9999, background: i === bgIndex ? "#74c69d" : "rgba(255,255,255,0.35)", border: "none", transition: "all 400ms ease", cursor: "pointer", padding: 0 }} />
          ))}
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: "linear-gradient(135deg,#1b4332,#2d6a4f)", padding: "3rem 2rem" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "2rem", textAlign: "center" }}>
          {STATS.map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: "clamp(2rem,4vw,2.75rem)", fontWeight: 800, color: "#74c69d", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)", marginTop: "0.5rem", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ background: "#f4f7f4", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "4rem" }}>
            <span style={{ display: "inline-block", padding: "0.25rem 1rem", background: "#d8f3dc", color: "#2d6a4f", borderRadius: 9999, fontSize: "0.8rem", fontWeight: 700, marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Tailored Workflow</span>
            <h2 style={{ fontSize: "clamp(1.75rem,4vw,2.5rem)", fontWeight: 800, color: "#1a2e1c", letterSpacing: "-0.02em" }}>Focused on Artificial Insemination</h2>
            <p style={{ marginTop: "0.75rem", color: "#4a6651", fontSize: "1.0625rem", maxWidth: 520, margin: "0.75rem auto 0" }}>Zero clutter. Built specifically around client farmers and automated receipts.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "1.5rem" }}>
            {FEATURES.map(({ icon: Icon, title, desc, color }, i) => (
              <div id={`feat-${i}`} data-animate="true" key={title}
                style={{ background: "white", borderRadius: 18, padding: "2rem", border: "1px solid #d8e4da", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 300ms ease", animation: visible[`feat-${i}`] ? `slideUp 600ms ease ${i * 80}ms both` : "none", opacity: visible[`feat-${i}`] ? 1 : 0 }}
                onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.10)"; e.currentTarget.style.borderColor = color; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; e.currentTarget.style.borderColor = "#d8e4da"; }}
              >
                <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
                  <Icon size={24} color={color} />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: "1.0625rem", color: "#1a2e1c", marginBottom: "0.5rem" }}>{title}</h3>
                <p style={{ color: "#4a6651", fontSize: "0.9rem", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section style={{ background: "white", padding: "6rem 2rem" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", gap: "0.25rem", marginBottom: "1.5rem" }}>
            {[...Array(5)].map((_, i) => <Star key={i} size={22} color="#b5832a" fill="#b5832a" />)}
          </div>
          <blockquote style={{ fontSize: "clamp(1.1rem,3vw,1.375rem)", fontWeight: 600, color: "#1a2e1c", lineHeight: 1.55, fontStyle: "italic", marginBottom: "1.5rem" }}>
            "Now when I finish an insemination in the field, the farmer immediately receives their official receipt on WhatsApp. It builds trust and keeps our records spotless."
          </blockquote>
          <p style={{ color: "#4a6651", fontWeight: 700 }}>Field Veterinarian</p>
          <p style={{ color: "#7a9980", fontSize: "0.875rem" }}>Bovine Reproduction Specialist</p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "linear-gradient(135deg,#0d1f0f 0%,#1b4332 50%,#2d6a4f 100%)", padding: "6rem 2rem", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "1.5rem" }}>🐄</div>
          <h2 style={{ fontSize: "clamp(1.75rem,4vw,2.75rem)", fontWeight: 800, color: "white", marginBottom: "1rem", letterSpacing: "-0.02em" }}>Ready to manage your clinic?</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "1.0625rem", maxWidth: 460, margin: "0 auto 2.5rem", lineHeight: 1.6 }}>Sign in to access your farmer records and log insemination visits.</p>
          <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: "0.625rem", padding: "1rem 2.5rem", background: "white", color: "#2d6a4f", borderRadius: 9999, fontWeight: 700, fontSize: "1.0625rem", boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>
            Open Doctor Portal <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: "#0d1f0f", padding: "2rem", textAlign: "center", borderTop: "1px solid rgba(82,183,136,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.625rem", marginBottom: "0.625rem" }}>
          <Stethoscope size={16} color="#52b788" />
          <span style={{ color: "white", fontWeight: 700, fontSize: "0.9375rem" }}>VetAssist Cattle AI Clinic</span>
        </div>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8125rem" }}>
          &copy; {new Date().getFullYear()} VetAssist. Purpose-built for bovine veterinary artificial insemination.
        </p>
      </footer>
    </div>
  );
}
