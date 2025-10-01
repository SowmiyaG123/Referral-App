import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

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
  const [isLoading, setIsLoading] = useState(false);

  const pushNotification = (msg) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, msg }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  useEffect(() => {
    const txChannel = supabase
      .channel("transactions-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        (payload) => {
          console.log("Transaction change:", payload);
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
          console.log("Approval change:", payload);
          pushNotification(`Approval ${payload.eventType} detected`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(approvalChannel);
    };
  }, []);

  const handleAdminLogin = async () => {
    const ADMIN_EMAIL = "admin@relapp.com";
    const ADMIN_PASSWORD = "admin123";

    if (!adminCreds.email || !adminCreds.password) {
      pushNotification("❌ Please enter email and password");
      return;
    }

    if (adminCreds.email !== ADMIN_EMAIL || adminCreds.password !== ADMIN_PASSWORD) {
      pushNotification("❌ Invalid admin credentials");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting admin login with Supabase...");
      
      let authResult = await supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      // If login fails because user doesn't exist, create the user
      if (authResult.error && authResult.error.message.includes("Invalid login credentials")) {
        console.log("Admin user doesn't exist, creating...");
        
        const signUpResult = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          options: {
            data: {
              role: 'admin',
              name: 'Admin'
            },
            emailRedirectTo: undefined
          }
        });

        if (signUpResult.error) {
          throw new Error("Failed to create admin: " + signUpResult.error.message);
        }

        // Try signing in again
        authResult = await supabase.auth.signInWithPassword({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
        });
      }

      if (authResult.error) {
        throw new Error(authResult.error.message);
      }

      console.log("Admin login successful");
      document.cookie = `oauth_role=admin; path=/; SameSite=Lax`;
      pushNotification("✅ Admin login successful!");
      
      setTimeout(() => {
        router.push("/admindash");
      }, 500);
    } catch (err) {
      console.error("Admin login error:", err);
      pushNotification("❌ " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserLogin = async () => {
    const VALID_EMAIL = "user@relapp.com";
    const VALID_PASSWORD = "user123";

    if (!userCreds.email || !userCreds.password) {
      pushNotification("❌ Please enter email and password");
      return;
    }

    if (userCreds.email !== VALID_EMAIL || userCreds.password !== VALID_PASSWORD) {
      pushNotification("❌ Invalid user credentials");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Attempting user login with Supabase...");
      
      let authResult = await supabase.auth.signInWithPassword({
        email: VALID_EMAIL,
        password: VALID_PASSWORD,
      });

      // If login fails because user doesn't exist, create the user
      if (authResult.error && authResult.error.message.includes("Invalid login credentials")) {
        console.log("User doesn't exist, creating...");
        
        const signUpResult = await supabase.auth.signUp({
          email: VALID_EMAIL,
          password: VALID_PASSWORD,
          options: {
            data: {
              role: 'user',
              name: 'User'
            },
            emailRedirectTo: undefined
          }
        });

        if (signUpResult.error) {
          throw new Error("Failed to create user: " + signUpResult.error.message);
        }

        // Try signing in again
        authResult = await supabase.auth.signInWithPassword({
          email: VALID_EMAIL,
          password: VALID_PASSWORD,
        });
      }

      if (authResult.error) {
        throw new Error(authResult.error.message);
      }

      console.log("User login successful, session created");
      pushNotification("✅ Login successful! Redirecting...");
      
      setTimeout(() => {
        router.push("/clientdash");
      }, 500);
    } catch (err) {
      console.error("User login error:", err);
      pushNotification("❌ " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

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

        {!showRegister && (
          <>
            <h2 style={{ color: "#fff", marginBottom: 10, textAlign: "left" }}>
              Admin Login
            </h2>
            <input
              type="email"
              placeholder="Admin Email"
              value={adminCreds.email}
              onChange={(e) =>
                setAdminCreds({ ...adminCreds, email: e.target.value })
              }
              onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
              style={inputStyle}
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Password"
              value={adminCreds.password}
              onChange={(e) =>
                setAdminCreds({ ...adminCreds, password: e.target.value })
              }
              onKeyPress={(e) => e.key === "Enter" && handleAdminLogin()}
              style={inputStyle}
              disabled={isLoading}
            />
            <button
              onClick={handleAdminLogin}
              style={{ ...primaryBtnStyle, marginBottom: 20, opacity: isLoading ? 0.6 : 1 }}
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "Admin Login"}
            </button>

            <h2 style={{ color: "#fff", margin: "20px 0 10px", textAlign: "left" }}>
              User Login
            </h2>
            <input
              type="email"
              placeholder="User Email"
              value={userCreds.email}
              onChange={(e) =>
                setUserCreds({ ...userCreds, email: e.target.value })
              }
              onKeyPress={(e) => e.key === "Enter" && handleUserLogin()}
              style={inputStyle}
              disabled={isLoading}
            />
            <input
              type="password"
              placeholder="Password"
              value={userCreds.password}
              onChange={(e) =>
                setUserCreds({ ...userCreds, password: e.target.value })
              }
              onKeyPress={(e) => e.key === "Enter" && handleUserLogin()}
              style={inputStyle}
              disabled={isLoading}
            />
            <button
              onClick={handleUserLogin}
              style={{ ...primaryBtnStyle, marginBottom: 20, opacity: isLoading ? 0.6 : 1 }}
              disabled={isLoading}
            >
              {isLoading ? "Logging in..." : "User Login"}
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

        {showRegister && (
          <div style={{ textAlign: "left", marginTop: 20 }}>
            <h2 style={{ color: "#fff", marginBottom: 12 }}>Register</h2>
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
              onKeyPress={(e) => e.key === "Enter" && handleRegister()}
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
              Back to Login
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

      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 1000,
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
  transition: "background 0.2s, opacity 0.2s",
};

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "12px",
  borderRadius: "6px",
  border: "1px solid #444",
  background: "#1f2337",
  color: "#fff",
  boxSizing: "border-box",
};