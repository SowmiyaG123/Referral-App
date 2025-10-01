import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
// Initialize Supabase client from env vars
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Register() {
  const [form, setForm] = useState({ email: "", password: "", invite: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // ✅ Basic Invite Code Check (optional enforcement)
      if (form.invite && form.invite !== "MYSECRETINVITE") {
        setMessage("❌ Invalid invite code");
        setLoading(false);
        return;
      }

      // ✅ Sign up user with Supabase
      const { email, password } = form;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_OAUTH_REDIRECT_URI,
        },
      });

      if (error) {
        setMessage("❌ " + error.message);
      } else {
        setMessage("✅ Check your email for verification!");
        setForm({ email: "", password: "", invite: "" }); // reset form
      }
    } catch (err) {
      setMessage("❌ Something went wrong. Try again.");
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.heading}>Create your account</h2>

        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="text"
          name="invite"
          placeholder="Invite code (optional)"
          value={form.invite}
          onChange={handleChange}
          style={styles.input}
        />

        <button type="submit" disabled={loading} style={styles.submitBtn}>
          {loading ? "Creating..." : "Create Account"}
        </button>

        {message && <p style={styles.message}>{message}</p>}

        <p style={styles.backLink}>
          ← Back to{" "}
          <Link href="/" style={{ color: "#61dafb", textDecoration: "none" }}>
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 30% 10%, #363d5e, #191b27 94%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "Inter, Arial, sans-serif",
  },
  form: {
    background: "rgba(10,12,20,0.97)",
    padding: "36px 44px",
    borderRadius: "18px",
    minWidth: 360,
    boxShadow: "0 3px 24px #000b3e55",
    color: "#d7dae0",
    textAlign: "center",
  },
  heading: {
    marginBottom: 24,
    color: "#61dafb",
    fontSize: "1.6rem",
    fontWeight: "700",
  },
  input: {
    width: "100%",
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    border: "1px solid #444",
    backgroundColor: "#1f2337",
    color: "#fff",
    fontSize: 15,
    outline: "none",
  },
  submitBtn: {
    width: "100%",
    padding: 12,
    backgroundColor: "#5865F2",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: "bold",
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "0 2px 8px #5865F244",
  },
  message: {
    marginTop: 14,
    fontWeight: "500",
    color: "#80e083",
  },
  backLink: {
    marginTop: 16,
    fontSize: 14,
    color: "#aaa",
  },
};
