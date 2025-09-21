import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
// --- Supabase client ---
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


export default function ClientDash() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [notif, setNotif] = useState(null);
  const [showReferForm, setShowReferForm] = useState(false);
  const [referForm, setReferForm] = useState({
    clientName: "",
    companyName: "",
    githubLink: ""
  });
  const fileInputRef = useRef(null);


  // Load or bootstrap user profile
  useEffect(() => {
    async function fetchProfile() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user || authError) {
        setNotif("❌ Failed to fetch user");
        return;
      }
      // Try to fetch existing user row
      let { data: userRow, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      // If not found, insert user row
      if (!userRow) {
        const insertPayload = {
          id: user.id,
          username: user.user_metadata?.name || "",
          email: user.email,
          avatar_url: user.user_metadata?.avatar_url || "",
          provider: user.app_metadata?.provider || "manual",
          provider_user_id: user.user_metadata?.provider_user_id || user.id,
          telegram_id: "tg_" + user.id.slice(0, 8),
          is_anonymous: false,
          referral_code: "AUTO_" + user.id.slice(0, 6),
          is_sso_user: false,
        };
        const { error: insertError } = await supabase
          .from("users")
          .insert([insertPayload]);
        if (insertError) {
          setNotif("❌ Failed to initialize profile: " + insertError.message);
          return;
        }
        userRow = insertPayload;
      }
      setProfile({
        id: user.id,
        name: userRow?.username || user.user_metadata?.name || "",
        email: userRow?.email || user.email,
        avatar_url: userRow?.avatar_url || "",
      });
    }
    fetchProfile();
  }, []);


  // Handle avatar selection
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setEditedProfile((prev) => ({
        ...prev,
        avatar_url: URL.createObjectURL(file),
      }));
    }
  };


  // Save profile changes
  const handleSave = async () => {
    let avatarUrl = profile.avatar_url;
    // Upload avatar if changed
    if (avatarFile) {
      const fname = `${profile.id}_${Date.now()}_${avatarFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars") // ✅ bucket name
        .upload(fname, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
        });
      if (uploadError) {
        setNotif("❌ Failed to upload avatar: " + uploadError.message);
        return;
      }
      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fname);
      avatarUrl = publicData?.publicUrl || avatarUrl;
    }
    // ✅ Update only valid columns from your schema
    const updates = {
      username: editedProfile.name || profile.name,
      avatar_url: avatarUrl,
    };
    const { error: updateError } = await supabase
      .from("users")
      .update(updates)
      .eq("id", profile.id);
    if (updateError) {
      setNotif("❌ Failed to update profile: " + updateError.message);
    } else {
      setNotif("✅ Profile updated!");
      setProfile({ ...profile, ...updates });
      setEditing(false);
      setAvatarFile(null);
    }
  };


  // Handle refer form submission
  const handleReferSubmit = async (e) => {
  e.preventDefault();
  if (
    !referForm.clientName ||
    !referForm.companyName ||
    !referForm.protocolName ||
    !referForm.githubLink
  ) {
    setNotif("❌ Please fill all referral details");
    return;
  }


  const { error } = await supabase.from("referrals").insert([
    {
      user_id: profile.id,
      client_name: referForm.clientName,
      telegram_username: referForm.companyName,
      protocol_name: referForm.protocolName,
      website_url: referForm.websiteUrl,
      audit_date: referForm.auditDate,
      github_link: referForm.githubLink,
      scope: referForm.scope,
      created_at: new Date(),
    },
  ]);


  if (error) {
    setNotif("❌ Failed to submit referral: " + error.message);
  } else {
    setNotif("✅ Referral submitted successfully!");
    setReferForm({
      clientName: "",
      companyName: "",
      protocolName: "",
      websiteUrl: "",
      auditDate: "",
      githubLink: "",
      scope: "",
    });
    setShowReferForm(false);
  }
};


  // --- UI Styles ---
  const container = { fontFamily: "Arial, sans-serif", padding: "20px", backgroundColor: "#f0fdf4", minHeight: "100vh" };
  const header = { backgroundColor: "#047857", color: "#fff", padding: "15px", borderRadius: "8px", textAlign: "center", marginBottom: "20px" };
  const section = { backgroundColor: "#fff", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.1)", marginBottom: "20px" };
  const table = { width: "100%", borderCollapse: "collapse" };
  const th = { backgroundColor: "#059669", color: "#fff", padding: "10px", textAlign: "left" };
  const td = { padding: "10px", borderBottom: "1px solid #ddd" };
  const avatar = { width: 70, height: 70, borderRadius: "50%", border: "2px solid #047857", objectFit: "cover", background: "#e5e7eb", marginBottom: 8 };
  const notifStyle = { background: "#134e4a", color: "#fff", padding: "10px 18px", borderRadius: "8px", boxShadow: "0 2px 8px #0596693c", fontSize: "15px", position: "fixed", bottom: 36, right: 36, zIndex: 50, maxWidth: 260 };
  const buttonPrimary = {
    padding: "8px 20px",
    borderRadius: "8px",
    border: "none",
    background: "#047857",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "15px",
    cursor: "pointer",
    marginBottom: 15,
  };
  const inputStyle = {
    width: "100%",
    padding: "8px",
    borderRadius: "6px",
    border: "1px solid #d1fae5",
    marginBottom: 12,
    fontSize: "14px",
  };


  // Modern Glass styles for overlay/modal


const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(30, 41, 59, 0.30)", // Slate with more dark depth
  backdropFilter: "blur(7px)",
  zIndex: 100,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};


const modalStyle = {
  background: "rgba(255, 255, 255, 0.28)",
  borderRadius: "18px",
  padding: "32px 36px",
  boxShadow: "0 12px 40px 2px rgba(30, 41, 59, 0.18)",
  border: "1.5px solid rgba(255,255,255,0.35)",
  maxWidth: "95vw",
  width: 390,
  fontWeight: 500,
  fontFamily: "Inter, Arial, sans-serif",
  textAlign: "center",
  color: "#12263A",
  backdropFilter: "blur(12px)", // Stronger blur for contrast
  WebkitBackdropFilter: "blur(12px)",
};


const inputGlassStyle = {
  width: "100%",
  padding: "14px",
  marginBottom: "18px",
  borderRadius: "8px",
  border: "1.5px solid #b5bbc7",
  background: "rgba(255,255,255,0.65)",
  color: "#16213e", // Nearly black for readability
  fontWeight: 500,
  fontSize: "16px",
  outline: "none",
  boxShadow: "0 2px 12px rgba(30,41,59,0.04)",
  transition: "border 0.2s, box-shadow 0.2s",
};


const placeholderStyle = `
  ::placeholder {
    color: #354364;
    opacity: 0.7;
    font-weight: 400;
    font-size: 15px;
  }
`;


  return (
    <div style={container}>
      <div style={header}>
        <h1>👤 Client Dashboard</h1>
        <p>View your tasks, approvals, and wallet</p>
      </div>


      {/* Refer button */}
      <div style={{ marginBottom: 20, textAlign: "center" }}>
        {!showReferForm && (
          <button
            style={buttonPrimary}
            onClick={() => setShowReferForm(true)}
          >
            Refer
          </button>
        )}
      </div>


      {/* Glass-style referral form modal */}
      {showReferForm && (
        <div style={overlayStyle} onClick={() => setShowReferForm(false)}>
          <form
            onSubmit={handleReferSubmit}
            style={modalStyle}
            onClick={(e) => e.stopPropagation()} // Prevent closing modal on form click
          >
            <h3 style={{ marginBottom: "16px" }}>Refer a Client</h3>
            <input
              type="text"
              placeholder="Your Name"
              value={referForm.clientName}
              onChange={(e) => setReferForm({ ...referForm, clientName: e.target.value })}
              style={inputGlassStyle}
              required
            />
            <input
              type="text"
              placeholder="Telegram UserName"
              value={referForm.companyName}
              onChange={(e) => setReferForm({ ...referForm, companyName: e.target.value })}
              style={inputGlassStyle}
              required
            />
            <input
  type="text"
  placeholder="Protocol Name"
  value={referForm.protocolName}
  onChange={(e) => setReferForm({ ...referForm, protocolName: e.target.value })}
  style={inputGlassStyle}
  required
/>


             <input
              type="url"
              placeholder="Website URL"
              value={referForm.githubLink}
              onChange={(e) => setReferForm({ ...referForm, githubLink: e.target.value })}
              style={inputGlassStyle}
              required
            />
            <select
  value={referForm.auditDate}
  onChange={(e) => setReferForm({ ...referForm, auditDate: e.target.value })}
  style={inputGlassStyle}


>
  <option value="">Preferred Audit Completion Date</option>
  <option value="1 week">1 week</option>
  <option value="2 weeks">2 weeks</option>
  <option value="1 month">1 month</option>
</select>
            <input
              type="url"
              placeholder="GitHub Repo Link"
              value={referForm.githubLink}
              onChange={(e) => setReferForm({ ...referForm, githubLink: e.target.value })}
              style={inputGlassStyle}
            />
            <input
  type="text"
  placeholder="Scope and Additional Information"
  value={referForm.scope}
  onChange={(e) => setReferForm({ ...referForm, scope: e.target.value })}
  style={inputGlassStyle}
/>


            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
              <button
                type="submit"
                style={{
                  ...buttonPrimary,
                  flex: 1,
                  marginBottom: 0,
                }}
              >
                Submit
              </button>
              <button
                type="button"
                style={{
                  ...buttonPrimary,
                  background: "rgba(255, 255, 255, 0.3)",
                  color: "#222",
                  flex: 1,
                  marginBottom: 0,
                }}
                onClick={() => setShowReferForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}


      {/* Tasks */}
      <div style={section}>
        <h2>📋 My Tasks</h2>
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Task</th>
              <th style={th}>Status</th>
              <th style={th}>Approval</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={td}>Logo Design</td>
              <td style={td}>In Progress</td>
              <td style={td}>Pending</td>
            </tr>
            <tr>
              <td style={td}>App Deployment</td>
              <td style={td}>Completed</td>
              <td style={td}>Approved</td>
            </tr>
          </tbody>
        </table>
      </div>


      {/* Wallet */}
      <div style={section}>
        <h2>💳 Wallet</h2>
        <p>Status: Connected ✅</p>
        <p>Total Value: $2,300</p>
        <p>Pending: $200</p>
      </div>


      {/* Profile */}
      <div style={section}>
        <h2>📝 Profile</h2>
        {profile && !editing && (
          <div style={{ textAlign: "center" }}>
            <img
              src={profile.avatar_url || "/default-avatar.png"}
              alt="Avatar"
              style={avatar}
            />
            <div style={{ fontWeight: "bold", fontSize: "1.09em" }}>
              {profile.name || "Unnamed User"}
            </div>
            <div style={{ color: "#4b5563", margin: "4px 0 12px" }}>
              {profile.email}
            </div>
            <button
              onClick={() => {
                setEditedProfile(profile);
                setEditing(true);
              }}
              style={{
                marginTop: 12,
                padding: "7px 22px",
                borderRadius: "8px",
                border: "none",
                background: "#047857",
                color: "#fff",
                fontWeight: "bold",
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              Edit
            </button>
          </div>
        )}
        {/* Edit Mode */}
        {profile && editing && (
          <div style={{ textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={editedProfile.avatar_url || "/default-avatar.png"}
                alt="Avatar"
                style={avatar}
              />
              <button
                type="button"
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  background: "#059669",
                  border: "none",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  color: "#fff",
                  fontSize: 17,
                  cursor: "pointer",
                  boxShadow: "0 1px 6px #05966943",
                }}
                onClick={() => fileInputRef.current.click()}
              >
                ✏️
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <input
                style={{
                  marginTop: 15,
                  width: "85%",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #d1fae5",
                  marginBottom: 10,
                }}
                value={editedProfile.name}
                onChange={(e) =>
                  setEditedProfile({ ...editedProfile, name: e.target.value })
                }
                placeholder="Username"
              />
            </div>
            <div>
              <input
                style={{
                  width: "85%",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "1px solid #d1fae5",
                  marginBottom: 10,
                  color: "#555",
                }}
                value={profile.email}
                disabled
                placeholder="Email"
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                marginTop: 10,
              }}
            >
              <button
                onClick={handleSave}
                style={{
                  padding: "7px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#059669",
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                style={{
                  padding: "7px 24px",
                  borderRadius: "8px",
                  border: "none",
                  background: "#d1fae5",
                  color: "#222",
                  fontWeight: "bold",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Notification */}
      {notif && <div style={notifStyle}>{notif}</div>}
    </div>
  );
}
