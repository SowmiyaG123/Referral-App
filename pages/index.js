import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// --- Supabase client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const router = useRouter();
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", invite: "" });
  const [adminCreds, setAdminCreds] = useState({ email: "", password: "" });
  const [userCreds, setUserCreds] = useState({ email: "", password: "" });
  const [notifications, setNotifications] = useState([]);

  // --- Helper to push notifications ---
  const pushNotification = (msg) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  // --- Realtime Subscriptions (Transactions + Approvals) ---
  useEffect(() => {
    const txChannel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          console.log("🔄 Transaction change:", payload);
          pushNotification(`Transaction ${payload.eventType} detected`);
        }
      )
      .subscribe();

    const approvalChannel = supabase
      .channel("approvals-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approvals" },
        (payload) => {
          console.log("🔄 Approval change:", payload);
          pushNotification(`Approval ${payload.eventType} detected`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(approvalChannel);
    };
  }, []);

  // --- Admin Login ---
  const handleAdminLogin = () => {
    try {
      const ADMIN_EMAIL = "admin@relapp.com";
      const ADMIN_PASSWORD = "admin123";

      if (
        adminCreds.email === ADMIN_EMAIL &&
        adminCreds.password === ADMIN_PASSWORD
      ) {
        document.cookie = `oauth_role=admin; path=/; SameSite=Lax`;
        router.push("/admindash");
      } else {
        throw new Error("Invalid admin email or password");
      }
    } catch (err) {
      pushNotification("❌ " + err.message);
    }
  };

  // --- User Login ---
  const handleUserLogin = () => {
    try {
      const USER_EMAIL = "user@relapp.com";
      const USER_PASSWORD = "user123";

      if (
        userCreds.email === USER_EMAIL &&
        userCreds.password === USER_PASSWORD
      ) {
        document.cookie = `oauth_role=client; path=/; SameSite=Lax`;
        router.push("/clientdash");
      } else {
        throw new Error("Invalid user email or password");
      }
    } catch (err) {
      pushNotification("❌ " + err.message);
    }
  };

  // --- Register (Invite Flow) ---
  const handleRegister = async () => {
    try {
      const res = await fetch("http://localhost:8000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Registration failed");
      const data = await res.json();
      pushNotification(`✅ ${data.message}. Please check your email.`);
      setShowRegister(false);
    } catch (err) {
      pushNotification("❌ " + err.message);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Inter, Arial, sans-serif",
        background: "radial-gradient(circle at 30% 10%, #363d5e, #191b27 94%)",
      }}
    >
      <div
        style={{
          background: "rgba(10,12,20,0.97)",
          padding: "36px 35px 30px",
          borderRadius: "20px",
          boxShadow: "0 4px 32px #000b3e44",
          minWidth: 420,
          maxWidth: "95vw",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontWeight: 800,
            fontSize: "2rem",
            marginBottom: 10,
            color: "#fff",
          }}
        >
          Welcome to Referral Portal
        </h1>
        <div style={{ color: "#bbc1d4", marginBottom: 28 }}>
          Secure access for partners to track referrals, earnings and payouts.
        </div>

        {/* --- Admin + User Login --- */}
        {!showRegister && (
          <>
            {/* Admin Login */}
            <h2 style={{ color: "#fff", marginBottom: 10, textAlign: "left" }}>
              🔐 Admin Login
            </h2>
            <input
              type="email"
              placeholder="Admin Email"
              value={adminCreds.email}
              onChange={(e) =>
                setAdminCreds({ ...adminCreds, email: e.target.value })
              }
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={adminCreds.password}
              onChange={(e) =>
                setAdminCreds({ ...adminCreds, password: e.target.value })
              }
              style={inputStyle}
            />
            <button
              onClick={handleAdminLogin}
              style={{ ...primaryBtnStyle, marginBottom: 20 }}
            >
              Admin Login
            </button>

            {/* User Login */}
            <h2 style={{ color: "#fff", margin: "20px 0 10px", textAlign: "left" }}>
              👤 User Login
            </h2>
            <input
              type="email"
              placeholder="User Email"
              value={userCreds.email}
              onChange={(e) =>
                setUserCreds({ ...userCreds, email: e.target.value })
              }
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={userCreds.password}
              onChange={(e) =>
                setUserCreds({ ...userCreds, password: e.target.value })
              }
              style={inputStyle}
            />
            <button
              onClick={handleUserLogin}
              style={{ ...primaryBtnStyle, marginBottom: 20 }}
            >
              User Login
            </button>

            <hr style={{ border: "1px solid #2c2f44", margin: "20px 0" }} />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#aaa",
                fontSize: "15px",
                marginBottom: 7,
                marginTop: 15,
              }}
            >
              <span>
                New here?{" "}
                <span
                  style={{ color: "#57adf2", cursor: "pointer" }}
                  onClick={() => setShowRegister(true)}
                >
                  Register with invite
                </span>
              </span>
              <span>
                Need help?{" "}
                <a
                  href="mailto:support@yourdomain.com"
                  style={{ color: "#57adf2" }}
                >
                  Contact support
                </a>
              </span>
            </div>
          </>
        )}

        {/* --- Register Form --- */}
        {showRegister && (
          <div style={{ textAlign: "left", marginTop: 20 }}>
            <h2 style={{ color: "#fff", marginBottom: 12 }}>✉️ Register</h2>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Invite Code"
              value={form.invite}
              onChange={(e) => setForm({ ...form, invite: e.target.value })}
              style={inputStyle}
            />
            <button onClick={handleRegister} style={primaryBtnStyle}>
              Register & Verify Email
            </button>
            <div
              style={{
                marginTop: 12,
                color: "#57adf2",
                cursor: "pointer",
                textAlign: "center",
              }}
              onClick={() => setShowRegister(false)}
            >
              ← Back to Login
            </div>
          </div>
        )}

        <div style={{ color: "#6b7189", fontSize: "14px", marginTop: 10 }}>
          By continuing you agree to our{" "}
          <a href="#" style={{ color: "#b8c3fa" }}>
            Terms
          </a>{" "}
          and{" "}
          <a href="#" style={{ color: "#b8c3fa" }}>
            Privacy Policy
          </a>
          .
        </div>
      </div>

      {/* --- Notifications --- */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {notifications.map((n) => (
          <div
            key={n.id}
            style={{
              background: "#1f2337",
              color: "#fff",
              padding: "12px 16px",
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.5)",
              fontSize: "14px",
              maxWidth: "260px",
            }}
          >
            {n.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Shared styles ---
const primaryBtnStyle = {
  padding: "13px 16px",
  border: "none",
  borderRadius: "8px",
  background: "#5865F2",
  color: "white",
  fontWeight: "bold",
  fontSize: "16px",
  width: "100%",
  marginBottom: "6px",
  cursor: "pointer",
  marginTop: "0px",
  boxShadow: "0 2px 8px #5865F244",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "6px",
  border: "1px solid #444",
  background: "#1f2337",
  color: "#fff",
};
