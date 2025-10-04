import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function ClientDash() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [notif, setNotif] = useState(null);
  const [showReferForm, setShowReferForm] = useState(false);
  const [activeSection, setActiveSection] = useState("tasks"); // Default to tasks view
  const [referForm, setReferForm] = useState({
    clientName: "",
    companyName: "",
    protocolName: "",
    websiteUrl: "",
    githubLink: "",
    auditDate: "",
    scope: "",
  });

  const fileInputRef = useRef(null);
  const router = useRouter();

  // Auto-clear notifications after 5 seconds
  useEffect(() => {
    if (notif) {
      const timer = setTimeout(() => setNotif(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notif]);

  // Load profile on mount
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        console.log("Starting profile load...");
        
        // Get session from Supabase auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log("Session data:", session?.user?.email);
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          if (isMounted) {
            setLoading(false);
            router.replace("/");
          }
          return;
        }

        if (!session?.user) {
          console.log("No active session found");
          if (isMounted) {
            setLoading(false);
            router.replace("/");
          }
          return;
        }

        const user = session.user;
        console.log("User authenticated:", user.email);

        // First, ensure user exists in the database with correct schema
        await ensureUserExists(user);

        // Fetch user profile from database
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        console.log("Profile query result:", userProfile, profileError);

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          if (isMounted) {
            setProfile({
              id: user.id,
              name: user.user_metadata?.name || user.email.split('@')[0] || "User",
              email: user.email,
              avatar_url: user.user_metadata?.avatar_url || null,
            });
            setLoading(false);
          }
        } else {
          // Profile exists, use it
          if (isMounted && userProfile) {
            setProfile({
              id: userProfile.id,
              name: userProfile.username,
              email: userProfile.email,
              avatar_url: userProfile.avatar_url,
            });
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Unexpected error loading profile:", error);
        if (isMounted) {
          setNotif("❌ Error loading profile");
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Ensure user exists in database with correct schema
  const ensureUserExists = async (user) => {
    try {
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        // User doesn't exist, create them with correct schema for your table
        console.log("Creating user in database:", user.email);
        const newProfile = {
          id: user.id,
          email: user.email,
          username: user.user_metadata?.name || user.email.split('@')[0] || "User",
          avatar_url: user.user_metadata?.avatar_url || null,
          provider: user.app_metadata?.provider || "email",
          provider_user_id: user.id,
          telegram_id: `tg_${user.id.substring(0, 8)}`,
          status: "Active",
          role: "client",
          is_bot_user: false,
          is_anonymous: false,
          is_sso_user: false,
          balance: 0,
          referrals: 0,
          earned_xp: 0,
          xp: 0,
          level: 1,
          total_earned: 0,
          pending_payouts: 0,
          referrals_in_progress: 0,
          milestone_level: 0
        };

        const { error: insertError } = await supabase
          .from("users")
          .insert([newProfile]);

        if (insertError) {
          console.error("Failed to create user:", insertError);
          return false;
        }
        console.log("User created successfully in database");
        return true;
      } else if (checkError) {
        console.error("Error checking user:", checkError);
        return false;
      }

      console.log("User already exists in database");
      return true;
    } catch (error) {
      console.error("Error ensuring user exists:", error);
      return false;
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
        setNotif("❌ Logout failed");
      } else {
        setProfile(null);
        router.replace("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
      setNotif("❌ Logout failed");
    }
  };

  // Handle avatar change
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setNotif("❌ Image size should be less than 5MB");
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setNotif("❌ Please select an image file");
        return;
      }

      setAvatarFile(file);
      setEditedProfile((prev) => ({
        ...prev,
        avatar_url: URL.createObjectURL(file),
      }));
    }
  };

  // Generate default avatar with initials
  const generateDefaultAvatar = (name) => {
    const initials = name ? name.charAt(0).toUpperCase() : 'U';
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23047857'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='32' fill='%23ffffff'%3E${initials}%3C/text%3E%3C/svg%3E`;
  };

  // Save profile edits
  const handleSave = async () => {
    if (!profile) return;

    try {
      let avatarUrl = editedProfile.avatar_url || profile.avatar_url;

      // Upload avatar if changed
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
        
        console.log("Uploading avatar:", fileName);
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error("Avatar upload error:", uploadError);
          setNotif("❌ Failed to upload avatar");
          return;
        }

        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        
        avatarUrl = urlData.publicUrl;
        console.log("Avatar uploaded to:", avatarUrl);
      }

      // Update profile with correct column names for your schema
      const updateData = {
        username: editedProfile.name || profile.name,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      console.log("Updating profile with:", updateData);

      const { error: updateError } = await supabase
        .from("users")
        .update(updateData)
        .eq("id", profile.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
        setNotif("❌ Failed to update profile");
        return;
      }

      setProfile({
        ...profile,
        name: editedProfile.name || profile.name,
        avatar_url: avatarUrl,
      });

      setNotif("✅ Profile updated successfully!");
      setEditing(false);
      setAvatarFile(null);
    } catch (error) {
      console.error("Save profile error:", error);
      setNotif("❌ Failed to save profile");
    }
  };

  // Handle referral form submission - UPDATED TO MATCH YOUR SCHEMA
  const handleReferSubmit = async (e) => {
    e.preventDefault();

    if (
      !referForm.clientName.trim() ||
      !referForm.companyName.trim() ||
      !referForm.protocolName.trim() ||
      !referForm.websiteUrl.trim()
    ) {
      setNotif("❌ Please fill all required fields");
      return;
    }

    try {
      // Double-check user exists before submitting referral
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await ensureUserExists(session.user);
      }

      // Create referral data that matches your actual table schema
      const referralData = {
        user_id: profile.id,
        client_name: referForm.clientName.trim(),
        telegram_username: referForm.companyName.trim(),
        protocol_name: referForm.protocolName.trim(),
        website_url: referForm.websiteUrl.trim(),
        github_link: referForm.githubLink.trim() || null,
        audit_date: referForm.auditDate || null,
        scope: referForm.scope.trim() || null,
        status: "Just Referred", // Default status
        description: `Client referral for ${referForm.protocolName}`,
      };

      console.log("Submitting referral with correct schema:", referralData);

      const { error } = await supabase.from("referrals").insert([referralData]);

      if (error) {
        console.error("Referral submission error:", error);
        
        if (error.code === '23503') {
          setNotif("❌ Database error: User not found");
        } else if (error.code === '42501') {
          setNotif("❌ Permission denied: RLS policy issue");
        } else {
          setNotif(`❌ Failed to submit referral: ${error.message}`);
        }
        return;
      }

      // Send notification to admin
      await sendAdminNotification(profile.name, referForm.protocolName);

      setNotif("✅ Referral submitted successfully! Admin has been notified.");
      
      // Reset form
      setReferForm({
        clientName: "",
        companyName: "",
        protocolName: "",
        websiteUrl: "",
        githubLink: "",
        auditDate: "",
        scope: "",
      });
      
      setShowReferForm(false);
    } catch (error) {
      console.error("Referral submission error:", error);
      setNotif("❌ Failed to submit referral");
    }
  };

  // Send notification to admin
  const sendAdminNotification = async (userName, protocolName) => {
    try {
      // Store in notifications table if it exists
      const notificationData = {
        type: "new_referral",
        title: "New Client Referral",
        message: `${userName} referred a new client: ${protocolName}`,
        user_id: profile.id,
        created_at: new Date().toISOString(),
        read: false
      };

      // Try to insert into notifications table (if it exists)
      const { error } = await supabase
        .from("notifications")
        .insert([notificationData]);

      if (error) {
        console.log("Notifications table doesn't exist or error:", error);
        // Continue without error - this is optional
      }

      console.log("Admin notification sent for new referral");
    } catch (error) {
      console.error("Error sending admin notification:", error);
      // Don't show error to user - this is background process
    }
  };

  // Styles
  const container = {
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f0fdf4",
    minHeight: "100vh",
    display: "flex",
  };

  const sidebar = {
    width: "250px",
    backgroundColor: "#047857",
    color: "#fff",
    padding: "20px 0",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  };

  const sidebarHeader = {
    padding: "0 20px 20px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.2)",
    textAlign: "center",
  };

  const avatar = {
    width: 80,
    height: 80,
    borderRadius: "50%",
    border: "3px solid #fff",
    objectFit: "cover",
    background: "#e5e7eb",
    marginBottom: 12,
  };

  const sidebarMenu = {
    flex: 1,
    padding: "20px 0",
  };

  const menuItem = {
    display: "flex",
    alignItems: "center",
    padding: "12px 20px",
    cursor: "pointer",
    transition: "background 0.2s",
    borderLeft: "4px solid transparent",
  };

  const activeMenuItem = {
    ...menuItem,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderLeft: "4px solid #fff",
  };

  const menuIcon = {
    marginRight: "12px",
    fontSize: "18px",
  };

  const mainContent = {
    flex: 1,
    padding: "20px",
    overflowY: "auto",
  };

  const header = {
    backgroundColor: "#047857",
    color: "#fff",
    padding: "15px 20px",
    borderRadius: "8px",
    textAlign: "center",
    marginBottom: "20px",
  };

  const section = {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    marginBottom: "20px",
  };

  const table = {
    width: "100%",
    borderCollapse: "collapse",
  };

  const th = {
    backgroundColor: "#059669",
    color: "#fff",
    padding: "10px",
    textAlign: "left",
  };

  const td = {
    padding: "10px",
    borderBottom: "1px solid #ddd",
  };

  const notifStyle = {
    background: "#134e4a",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)",
    fontSize: "15px",
    position: "fixed",
    bottom: 30,
    right: 30,
    zIndex: 1000,
    maxWidth: 300,
  };

  const buttonPrimary = {
    padding: "10px 24px",
    borderRadius: "8px",
    border: "none",
    background: "#047857",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "15px",
    cursor: "pointer",
    transition: "background 0.2s",
  };

  const overlayStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    background: "rgba(30, 41, 59, 0.4)",
    backdropFilter: "blur(8px)",
    zIndex: 999,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const modalStyle = {
    background: "rgba(255, 255, 255, 0.95)",
    borderRadius: "16px",
    padding: "32px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    border: "1px solid rgba(255,255,255,0.5)",
    maxWidth: "90vw",
    width: 420,
    maxHeight: "90vh",
    overflowY: "auto",
    fontFamily: "Arial, sans-serif",
  };

  const inputGlassStyle = {
    width: "100%",
    padding: "12px",
    marginBottom: "16px",
    borderRadius: "8px",
    border: "2px solid #d1d5db",
    background: "#fff",
    color: "#1f2937",
    fontSize: "15px",
    outline: "none",
    transition: "border 0.2s",
    boxSizing: "border-box",
  };

  // Render different sections based on active section
  const renderMainContent = () => {
    switch (activeSection) {
      case "tasks":
        return (
          <div style={section}>
            <h2 style={{ marginTop: 0, color: "#047857" }}>My Tasks</h2>
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
                  <td style={td}>
                    <span style={{ color: "#f59e0b", fontWeight: "500" }}>
                      In Progress
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ color: "#6b7280" }}>Pending</span>
                  </td>
                </tr>
                <tr>
                  <td style={td}>App Deployment</td>
                  <td style={td}>
                    <span style={{ color: "#10b981", fontWeight: "500" }}>
                      Completed
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ color: "#10b981" }}>Approved</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      
      case "wallet":
        return (
          <div style={section}>
            <h2 style={{ marginTop: 0, color: "#047857" }}>Wallet</h2>
            <p style={{ fontSize: "15px", margin: "8px 0" }}>
              <strong>Status:</strong>{" "}
              <span style={{ color: "#10b981" }}>Connected</span>
            </p>
            <p style={{ fontSize: "15px", margin: "8px 0" }}>
              <strong>Total Value:</strong> $2,300
            </p>
            <p style={{ fontSize: "15px", margin: "8px 0" }}>
              <strong>Pending:</strong> $200
            </p>
            <p style={{ fontSize: "15px", margin: "8px 0" }}>
              <strong>Available Balance:</strong> $2,100
            </p>
          </div>
        );
      
      case "profile":
        return (
          <div style={section}>
            <h2 style={{ marginTop: 0, color: "#047857" }}>Profile</h2>
            <div style={{ textAlign: "center" }}>
              {!editing ? (
                <>
                  <img
                    src={profile.avatar_url || generateDefaultAvatar(profile.name)}
                    alt="Avatar"
                    style={avatar}
                    onError={(e) => {
                      e.target.src = generateDefaultAvatar(profile.name);
                    }}
                  />
                  <div style={{ fontWeight: "bold", fontSize: "20px", marginBottom: "4px" }}>
                    {profile.name || "Unnamed User"}
                  </div>
                  <div style={{ color: "#6b7280", marginBottom: "16px", fontSize: "15px" }}>
                    {profile.email}
                  </div>
                  <button
                    onClick={() => {
                      setEditedProfile({
                        name: profile.name,
                        avatar_url: profile.avatar_url,
                      });
                      setEditing(true);
                    }}
                    style={buttonPrimary}
                  >
                    Edit Profile
                  </button>
                </>
              ) : (
                <>
                  <div style={{ position: "relative", display: "inline-block" }}>
                    <img
                      src={editedProfile.avatar_url || profile.avatar_url || generateDefaultAvatar(profile.name)}
                      alt="Avatar"
                      style={avatar}
                      onError={(e) => {
                        e.target.src = generateDefaultAvatar(profile.name);
                      }}
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
                        width: 36,
                        height: 36,
                        color: "#fff",
                        fontSize: 18,
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(5, 150, 105, 0.4)",
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📷
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleAvatarChange}
                    />
                  </div>
                  
                  <div style={{ marginTop: "16px" }}>
                    <input
                      type="text"
                      style={{
                        width: "85%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "2px solid #d1fae5",
                        marginBottom: "12px",
                        fontSize: "15px",
                        boxSizing: "border-box",
                      }}
                      value={editedProfile.name || ""}
                      onChange={(e) =>
                        setEditedProfile({ ...editedProfile, name: e.target.value })
                      }
                      placeholder="Your Name"
                    />
                  </div>
                  
                  <div>
                    <input
                      style={{
                        width: "85%",
                        padding: "10px",
                        borderRadius: "8px",
                        border: "2px solid #e5e7eb",
                        marginBottom: "16px",
                        fontSize: "15px",
                        color: "#6b7280",
                        background: "#f9fafb",
                        boxSizing: "border-box",
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
                      gap: "12px",
                    }}
                  >
                    <button
                      onClick={handleSave}
                      style={{
                        padding: "10px 28px",
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
                      onClick={() => {
                        setEditing(false);
                        setAvatarFile(null);
                        setEditedProfile({});
                      }}
                      style={{
                        padding: "10px 28px",
                        borderRadius: "8px",
                        border: "none",
                        background: "#e5e7eb",
                        color: "#374151",
                        fontWeight: "bold",
                        fontSize: "15px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      
      default:
        return (
          <div style={section}>
            <h2 style={{ marginTop: 0, color: "#047857" }}>My Tasks</h2>
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
                  <td style={td}>
                    <span style={{ color: "#f59e0b", fontWeight: "500" }}>
                      In Progress
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ color: "#6b7280" }}>Pending</span>
                  </td>
                </tr>
                <tr>
                  <td style={td}>App Deployment</td>
                  <td style={td}>
                    <span style={{ color: "#10b981", fontWeight: "500" }}>
                      Completed
                    </span>
                  </td>
                  <td style={td}>
                    <span style={{ color: "#10b981" }}>Approved</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontSize: 20,
          fontFamily: "Arial, sans-serif",
          color: "#047857",
        }}
      >
        Loading your dashboard...
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          fontSize: 18,
          fontFamily: "Arial, sans-serif",
        }}
      >
        Redirecting to login...
      </div>
    );
  }

  return (
    <div style={container}>
      {/* Sidebar */}
      <div style={sidebar}>
        <div style={sidebarHeader}>
          <img
            src={profile.avatar_url || generateDefaultAvatar(profile.name)}
            alt="Avatar"
            style={avatar}
            onError={(e) => {
              e.target.src = generateDefaultAvatar(profile.name);
            }}
          />
          <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>
            {profile.name || "Unnamed User"}
          </div>
          <div style={{ fontSize: "12px", opacity: 0.8 }}>
            {profile.email}
          </div>
        </div>

        <div style={sidebarMenu}>
          <div
            style={activeSection === "tasks" ? activeMenuItem : menuItem}
            onClick={() => setActiveSection("tasks")}
          >
            <span style={menuIcon}>📋</span>
            Tasks
          </div>
          <div
            style={activeSection === "wallet" ? activeMenuItem : menuItem}
            onClick={() => setActiveSection("wallet")}
          >
            <span style={menuIcon}>💰</span>
            Wallet
          </div>
          <div
            style={activeSection === "profile" ? activeMenuItem : menuItem}
            onClick={() => setActiveSection("profile")}
          >
            <span style={menuIcon}>👤</span>
            Profile
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "#dc2626",
              color: "#fff",
              fontWeight: "bold",
              fontSize: "14px",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => (e.target.style.background = "#b91c1c")}
            onMouseOut={(e) => (e.target.style.background = "#dc2626")}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={mainContent}>
        <div style={header}>
          <h1 style={{ margin: "0 0 8px 0" }}>Client Dashboard</h1>
          <p style={{ margin: 0, fontSize: "14px", opacity: 0.9 }}>
            {activeSection === "tasks" && "View your tasks and approvals"}
            {activeSection === "wallet" && "Manage your wallet and transactions"}
            {activeSection === "profile" && "Update your profile information"}
          </p>
        </div>

        {activeSection === "tasks" && (
          <div style={{ marginBottom: 20, textAlign: "center" }}>
            <button
              style={buttonPrimary}
              onClick={() => setShowReferForm(true)}
              onMouseOver={(e) => (e.target.style.background = "#059669")}
              onMouseOut={(e) => (e.target.style.background = "#047857")}
            >
              Refer a Client
            </button>
          </div>
        )}

        {showReferForm && (
          <div style={overlayStyle} onClick={() => setShowReferForm(false)}>
            <form
              onSubmit={handleReferSubmit}
              style={modalStyle}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginBottom: "20px", marginTop: 0, color: "#047857" }}>
                Refer a Client
              </h3>
              
              <input
                type="text"
                placeholder="Your Name *"
                value={referForm.clientName}
                onChange={(e) =>
                  setReferForm({ ...referForm, clientName: e.target.value })
                }
                style={inputGlassStyle}
                required
              />
              
              <input
                type="text"
                placeholder="Telegram Username *"
                value={referForm.companyName}
                onChange={(e) =>
                  setReferForm({ ...referForm, companyName: e.target.value })
                }
                style={inputGlassStyle}
                required
              />
              
              <input
                type="text"
                placeholder="Protocol Name *"
                value={referForm.protocolName}
                onChange={(e) =>
                  setReferForm({ ...referForm, protocolName: e.target.value })
                }
                style={inputGlassStyle}
                required
              />
              
              <input
                type="url"
                placeholder="Website URL *"
                value={referForm.websiteUrl}
                onChange={(e) =>
                  setReferForm({ ...referForm, websiteUrl: e.target.value })
                }
                style={inputGlassStyle}
                required
              />
              
              <input
                type="url"
                placeholder="GitHub Repo Link (Optional)"
                value={referForm.githubLink}
                onChange={(e) =>
                  setReferForm({ ...referForm, githubLink: e.target.value })
                }
                style={inputGlassStyle}
              />
              
              <select
                value={referForm.auditDate}
                onChange={(e) =>
                  setReferForm({ ...referForm, auditDate: e.target.value })
                }
                style={inputGlassStyle}
              >
                <option value="">Preferred Audit Date (Optional)</option>
                <option value="1 week">1 week</option>
                <option value="2 weeks">2 weeks</option>
                <option value="1 month">1 month</option>
              </select>
              
              <textarea
                placeholder="Scope and Additional Information (Optional)"
                value={referForm.scope}
                onChange={(e) =>
                  setReferForm({ ...referForm, scope: e.target.value })
                }
                style={{
                  ...inputGlassStyle,
                  minHeight: "80px",
                  resize: "vertical",
                  fontFamily: "Arial, sans-serif",
                }}
              />

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button
                  type="submit"
                  style={{
                    ...buttonPrimary,
                    flex: 1,
                    padding: "12px",
                  }}
                >
                  Submit Referral
                </button>
                <button
                  type="button"
                  style={{
                    ...buttonPrimary,
                    flex: 1,
                    padding: "12px",
                    background: "#6b7280",
                  }}
                  onClick={() => setShowReferForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {renderMainContent()}

        {notif && <div style={notifStyle}>{notif}</div>}
      </div>
    </div>
  );
}
