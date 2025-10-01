import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const thStyle = {
  padding: "10px",
  textAlign: "left",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 700,
};
const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};

const ReferralStatCard = ({ title, value, nextPayout, theme }) => (
  <div
    style={{
      background: theme === "dark" ? "#222235" : "#fff",
      borderRadius: 16,
      padding: "22px 32px 18px 22px",
      minWidth: 210,
      boxShadow: "0 0 6px 0 rgba(16,24,40,.06)",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      marginRight: 22,
      marginBottom: 18,
      color: theme === "dark" ? "#ddd" : "#151725",
    }}
  >
    <div
      style={{
        fontSize: 12,
        color: theme === "dark" ? "#888" : "#7b8492",
        marginBottom: 6,
        fontWeight: 700,
        letterSpacing: 0.6,
        textTransform: "uppercase",
      }}
    >
      {title}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
    <div
      style={{
        color: theme === "dark" ? "#aaa" : "#8a98af",
        fontSize: 14,
        marginTop: 11,
      }}
    >
      <span>Next Payout</span>
      <span
        style={{
          marginLeft: 14,
          fontWeight: 600,
          color: theme === "dark" ? "#eee" : "#414a58",
        }}
      >
        {nextPayout}
      </span>
    </div>
  </div>
);

export default function AdminDash() {
  const router = useRouter();

  // Data states for tables
  const [users, setUsers] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [settings, setSettings] = useState([]);

  const [notif, setNotif] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@example.com",
    theme: "light",
    notifications: true,
  });
  const [theme, setTheme] = React.useState("light");
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "referrals", label: "Referrals" },
    { id: "tasks", label: "Tasks" },
    { id: "logs", label: "Logs" },
    { id: "notifications", label: "Notifications" },
    { id: "settings", label: "Settings" },
  ];

  // Enhanced CRUD Operations with RLS fixes
  async function createItem(table, data) {
    setLoading(true);
    try {
      // Add required fields and timestamps
      const enhancedData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add table-specific required fields
      if (table === 'users') {
        enhancedData.id = enhancedData.id || crypto.randomUUID();
        enhancedData.username = enhancedData.username || `user_${Date.now()}`;
        enhancedData.email = enhancedData.email || `user_${Date.now()}@example.com`;
        enhancedData.status = enhancedData.status || 'Active';
        enhancedData.role = enhancedData.role || 'client';
        enhancedData.provider = enhancedData.provider || 'email';
        enhancedData.balance = enhancedData.balance || 0;
        enhancedData.referrals = enhancedData.referrals || 0;
      }

      if (table === 'referrals') {
        enhancedData.id = enhancedData.id || crypto.randomUUID();
        enhancedData.status = enhancedData.status || 'Just Referred';
        enhancedData.referred_at = enhancedData.referred_at || new Date().toISOString();
      }

      if (table === 'transactions') {
        enhancedData.id = enhancedData.id || crypto.randomUUID();
        enhancedData.amount = enhancedData.amount || 0;
        enhancedData.date = enhancedData.date || new Date().toISOString().split('T')[0];
      }

      console.log(`Creating ${table}:`, enhancedData);

      const { data: result, error } = await supabase
        .from(table)
        .insert([enhancedData])
        .select()
        .single();

      if (error) {
        console.error(`Create error for ${table}:`, error);
        throw error;
      }
      
      setNotif(`✅ ${table} created successfully`);
      return result;
    } catch (err) {
      console.error("createItem error", err);
      setNotif(`❌ Create error: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function updateItem(table, id, data) {
    setLoading(true);
    try {
      const updateData = {
        ...data,
        updated_at: new Date().toISOString(),
      };

      console.log(`Updating ${table} ${id}:`, updateData);

      const { data: result, error } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(`Update error for ${table}:`, error);
        throw error;
      }
      
      setNotif(`✅ ${table} updated successfully`);
      return result;
    } catch (err) {
      console.error("updateItem error", err);
      setNotif(`❌ Update error: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(table, id) {
   
    setLoading(true);
    try {
      console.log(`Deleting ${table} ${id}`);

      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", id);

      if (error) {
        console.error(`Delete error for ${table}:`, error);
        throw error;
      }
      
      setNotif(`✅ ${table} deleted successfully`);
      return true;
    } catch (err) {
      console.error("deleteItem error", err);
      setNotif(`❌ Delete error: ${err.message}`);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  // Fetch all data on component mount
  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      try {
        const [
          usersRes,
          referralsRes,
          tasksRes,
          logsRes,
          notifRes,
          settingsRes,
          txsRes,
          walletsRes,
          approvalsRes,
        ] = await Promise.all([
          supabase.from("users").select("*"),
          supabase.from("referrals").select("*"),
          supabase.from("tasks").select("*"),
          supabase.from("audit_logs").select("*"),
          supabase.from("notifications").select("*"),
          supabase.from("settings").select("*"),
          supabase.from("transactions").select("*"),
          supabase.from("wallets").select("*"),
          supabase.from("approvals").select("*"),
        ]);

        setUsers(usersRes.data || []);
        setReferrals(referralsRes.data || []);
        setTasks(tasksRes.data || []);
        setLogs(logsRes.data || []);
        setNotifications(notifRes.data || []);
        setSettings(settingsRes.data || []);
        setTransactions(txsRes.data || []);
        setWallets(walletsRes.data || []);
        setApprovals(approvalsRes.data || []);
      } catch (err) {
        console.error("fetchAll error", err);
        setNotif(`❌ Fetch error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();

    // Realtime subscriptions
    const subscribeTable = (table, setState) => {
      return supabase
        .channel(table)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          async (payload) => {
            console.log(`Realtime event on ${table}:`, payload);

            if (table === "referrals" && payload.eventType === "INSERT") {
              const newNotif = {
                title: "New Referral",
                message: `User ${payload.new.client_name || payload.new.referred} joined via referral.`,
                created_at: new Date().toISOString(),
              };

              try {
                await supabase.from("notifications").insert([newNotif]);
                console.log("✅ Notification inserted for new referral");
              } catch (err) {
                console.error("❌ Failed to insert notification:", err.message);
              }

              setNotif(`📩 New referral: ${payload.new.client_name || payload.new.referred}`);
            }

            if (payload.eventType === "INSERT") {
              setState((prev) => [...prev, payload.new]);
            } else if (payload.eventType === "UPDATE") {
              setState((prev) =>
                prev.map((item) => (item.id === payload.new.id ? payload.new : item))
              );
            } else if (payload.eventType === "DELETE") {
              setState((prev) => prev.filter((item) => item.id !== payload.old.id));
            }
          }
        )
        .subscribe();
    };

    const channels = [
      subscribeTable("users", setUsers),
      subscribeTable("referrals", setReferrals),
      subscribeTable("tasks", setTasks),
      subscribeTable("audit_logs", setLogs),
      subscribeTable("notifications", setNotifications),
      subscribeTable("settings", setSettings),
      subscribeTable("transactions", setTransactions),
      subscribeTable("wallets", setWallets),
      subscribeTable("approvals", setApprovals),
    ];

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  // Modal State Management with improved typing
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [modalTable, setModalTable] = useState(null);
  const [modalRawObj, setModalRawObj] = useState(null);

  // Use ref to track input changes without causing re-renders
  const inputTimeoutRef = useRef(null);

  function openModal(table, mode = "view", record = null) {
    setModalTable(table);
    setModalMode(mode);
    if (record) {
      setModalRawObj(JSON.parse(JSON.stringify(record)));
    } else {
      const defaultObj = getDefaultObject(table);
      setModalRawObj(defaultObj);
    }
    setModalOpen(true);
  }

  function getDefaultObject(table) {
    const defaults = {
      users: {
        email: "",
        username: "",
        balance: 0,
        status: "Active",
        referrals: 0,
        role: "client",
        provider: "email"
      },
      referrals: {
        client_name: "",
        telegram_username: "",
        protocol_name: "",
        website_url: "",
        github_link: "",
        status: "Just Referred",
        user_id: users[0]?.id || null
      },
      tasks: {
        title: "",
        status: "To Do",
        assigned_to: "",
        due_date: new Date().toISOString().split('T')[0]
      },
      notifications: {
        title: "",
        message: "",
        delivered: false,
        channel: "frontend"
      },
      transactions: {
        name: "",
        type: "Credit",
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        status: "completed"
      }
    };
    return defaults[table] || {};
  }

  function closeModal() {
    setModalOpen(false);
    setModalTable(null);
    setModalMode("view");
    setModalRawObj(null);
  }

  async function saveModal() {
    if (loading) return;
    
    try {
      if (modalMode === "edit") {
        await updateItem(modalTable, modalRawObj.id, modalRawObj);
      } else if (modalMode === "create") {
        await createItem(modalTable, modalRawObj);
      }
      closeModal();
    } catch (err) {
      console.error("Save modal error:", err);
    }
  }

  // Enhanced input handler with debouncing for typing performance
  const handleInputChange = (field, value, fieldType = "text") => {
    // Clear any existing timeout
    if (inputTimeoutRef.current) {
      clearTimeout(inputTimeoutRef.current);
    }

    // Set new timeout to update state after a short delay
    inputTimeoutRef.current = setTimeout(() => {
      setModalRawObj(prev => ({
        ...prev,
        [field]: fieldType === "number" ? (value === "" ? 0 : Number(value)) : 
                 fieldType === "boolean" ? (value === "true") : value
      }));
    }, 10); // 10ms delay for smooth typing
  };

  // Enhanced form field definitions with proper validation
  function getTableFormFields(table) {
    const fields = {
      users: [
        { field: "email", label: "Email", type: "email", required: true },
        { field: "username", label: "Username", type: "text", required: true },
        { field: "balance", label: "Balance", type: "number" },
        { field: "status", label: "Status", type: "select", options: ["Active", "Disabled", "Suspended"] },
        { field: "referrals", label: "Referrals", type: "number" },
        { field: "role", label: "Role", type: "select", options: ["client", "admin", "moderator"] }
      ],
      referrals: [
        { field: "client_name", label: "Client Name", type: "text", required: true },
        { field: "telegram_username", label: "Telegram Username", type: "text" },
        { field: "protocol_name", label: "Protocol Name", type: "text" },
        { field: "website_url", label: "Website URL", type: "url" },
        { field: "github_link", label: "GitHub Link", type: "url" },
        { field: "status", label: "Status", type: "select", options: ["Just Referred", "Client Paid", "Payout Initiated", "Milestone Achieved"] },
        { field: "expected_payout", label: "Expected Payout", type: "number" }
      ],
      tasks: [
        { field: "title", label: "Title", type: "text", required: true },
        { field: "status", label: "Status", type: "select", options: ["To Do", "In Progress", "Completed"] },
        { field: "assigned_to", label: "Assigned To", type: "text" },
        { field: "due_date", label: "Due Date", type: "date" }
      ],
      notifications: [
        { field: "title", label: "Title", type: "text", required: true },
        { field: "message", label: "Message", type: "text", required: true },
        { field: "delivered", label: "Delivered", type: "select", options: [true, false] },
        { field: "channel", label: "Channel", type: "select", options: ["frontend", "email", "telegram"] }
      ],
      transactions: [
        { field: "name", label: "Name", type: "text", required: true },
        { field: "type", label: "Type", type: "select", options: ["Credit", "Debit"] },
        { field: "amount", label: "Amount", type: "number", required: true },
        { field: "date", label: "Date", type: "date", required: true },
        { field: "status", label: "Status", type: "select", options: ["pending", "completed", "failed"] }
      ]
    };
    return fields[table] || [];
  }

  // Helper functions
  const money = (n) => (n == null ? "—" : `$${Number(n).toLocaleString()}`);
  const shorten = (s = "") => (s.length > 12 ? `${s.slice(0, 6)}...${s.slice(-4)}` : s || "—");

  // Logout function
  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // Tab Components
  const OverviewTab = ({ theme }) => (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "stretch", marginBottom: 18, flexWrap: "wrap" }}>
        <ReferralStatCard title="Incentive" value="$10,430.00" nextPayout="$7,254.00" theme={theme} />
        <ReferralStatCard title="Total Number of Clicks" value="12,345" nextPayout="$7,254.00" theme={theme} />
        <ReferralStatCard title="Total Referrals" value="453" nextPayout="$7,254.00" theme={theme} />
      </div>

      <div
        style={{
          background: theme === "dark" ? "#222235" : "#fff",
          borderRadius: 16,
          boxShadow: "0 0 6px 0 rgba(16,24,40,.06)",
          padding: 24,
          marginTop: 10,
          color: theme === "dark" ? "#ddd" : "#000",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: theme === "dark" ? "#eee" : "#222" }}>
            Transaction History
          </div>
          <button
            style={{
              background: theme === "dark" ? "#3b82f6" : "#fff",
              color: theme === "dark" ? "#fff" : "#2563eb",
              border: `1px solid ${theme === "dark" ? "#3b82f6" : "#2563eb"}`,
              borderRadius: 6,
              padding: "6px 12px",
              cursor: "pointer",
            }}
            onClick={() => openModal("transactions", "create")}
            disabled={loading}
          >
            {loading ? "Adding..." : "+ Add Transaction"}
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                color: theme === "dark" ? "#9ca3af" : "#6b7280",
                fontSize: 13,
                fontWeight: 600,
                borderBottom: `1px solid ${theme === "dark" ? "#444" : "#d1d5db"}`,
              }}
            >
              <th style={{ padding: 10, textAlign: "left" }}></th>
              <th style={{ padding: 10, textAlign: "left" }}>Name</th>
              <th style={{ padding: 10, textAlign: "left" }}>Type</th>
              <th style={{ padding: 10, textAlign: "left" }}>Date</th>
              <th style={{ padding: 10, textAlign: "right" }}>Amount</th>
              <th style={{ padding: 10, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                style={{
                  borderTop: `1px solid ${theme === "dark" ? "#444" : "#f3f4f6"}`,
                  background: theme === "dark" ? "#2c2f3f" : "#fff",
                  color: theme === "dark" ? "#ddd" : "#000",
                }}
              >
                <td style={{ padding: 10, fontSize: 22 }}>🙍‍♂️</td>
                <td style={{ padding: 10, fontWeight: 600 }}>{tx.name}</td>
                <td style={{ padding: 10 }}>{tx.type}</td>
                <td style={{ padding: 10 }}>{tx.date}</td>
                <td style={{ padding: 10, textAlign: "right" }}>{money(tx.amount)}</td>
                <td style={{ padding: 10, textAlign: "right" }}>
                  <button 
                    onClick={() => openModal("transactions", "view", tx)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    View
                  </button>
                  <button 
                    onClick={() => openModal("transactions", "edit", tx)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteItem("transactions", tx.id)}
                    style={{ padding: "4px 8px", borderRadius: 4, background: "#dc2626", color: "white" }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: 20, textAlign: "center", color: theme === "dark" ? "#888" : "#666" }}>
                  No transactions found. Create your first transaction!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const UsersTab = () => {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2>👤 Users</h2>
          <button 
            onClick={() => openModal("users", "create")} 
            style={{ padding: "8px 16px", borderRadius: 6, background: "#1d4ed8", color: "white" }}
            disabled={loading}
          >
            {loading ? "Adding..." : "+ Add User"}
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: 8 }}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Balance</th>
              <th style={thStyle}>Joined</th>
              <th style={thStyle}>Referrals</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={tdStyle}>{shorten(u.id)}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>{u.username}</td>
                <td style={tdStyle}>{money(u.balance)}</td>
                <td style={tdStyle}>{u.joined || (u.created_at ? new Date(u.created_at).toLocaleDateString() : "—")}</td>
                <td style={tdStyle}>{u.referrals || 0}</td>
                <td style={tdStyle}>{u.status || "Active"}</td>
                <td style={tdStyle}>
                  <button 
                    onClick={() => openModal("users", "view", u)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    View
                  </button>
                  <button 
                    onClick={() => openModal("users", "edit", u)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteItem("users", u.id)}
                    style={{ padding: "4px 8px", borderRadius: 4, background: "#dc2626", color: "white" }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan="8" style={{ padding: 20, textAlign: "center", color: "#666" }}>
                  No users found. Create your first user!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const ReferralsTab = () => {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2>📋 Referrals</h2>
          <button 
            onClick={() => openModal("referrals", "create")} 
            style={{ padding: "8px 16px", borderRadius: 6, background: "#1d4ed8", color: "white" }}
            disabled={loading}
          >
            {loading ? "Adding..." : "+ Add Referral"}
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: 8 }}>
          <thead>
            <tr>
              <th style={thStyle}>Client Name</th>
              <th style={thStyle}>Telegram</th>
              <th style={thStyle}>Protocol</th>
              <th style={thStyle}>Website</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map((ref) => (
              <tr key={ref.id}>
                <td style={tdStyle}>{ref.client_name}</td>
                <td style={tdStyle}>{ref.telegram_username}</td>
                <td style={tdStyle}>{ref.protocol_name}</td>
                <td style={tdStyle}>
                  <a href={ref.website_url} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8" }}>
                    {ref.website_url?.substring(0, 20)}...
                  </a>
                </td>
                <td style={tdStyle}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: 12,
                    fontSize: "12px",
                    background: 
                      ref.status === "Approved" ? "#10b981" :
                      ref.status === "Rejected" ? "#ef4444" : "#f59e0b",
                    color: "white"
                  }}>
                    {ref.status}
                  </span>
                </td>
                <td style={tdStyle}>{ref.created_at ? new Date(ref.created_at).toLocaleDateString() : "—"}</td>
                <td style={tdStyle}>
                  <button 
                    onClick={() => openModal("referrals", "view", ref)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    View
                  </button>
                  <button 
                    onClick={() => openModal("referrals", "edit", ref)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteItem("referrals", ref.id)}
                    style={{ padding: "4px 8px", borderRadius: 4, background: "#dc2626", color: "white" }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {referrals.length === 0 && (
              <tr>
                <td colSpan="7" style={{ padding: 20, textAlign: "center", color: "#666" }}>
                  No referrals found. Create your first referral!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const TasksTab = () => {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2>✅ Tasks</h2>
          <button 
            onClick={() => openModal("tasks", "create")} 
            style={{ padding: "8px 16px", borderRadius: 6, background: "#1d4ed8", color: "white" }}
            disabled={loading}
          >
            {loading ? "Adding..." : "+ Add Task"}
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: 8 }}>
          <thead>
            <tr>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle}>Due Date</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td style={tdStyle}>{task.title}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: 12,
                    fontSize: "12px",
                    background: 
                      task.status === "Completed" ? "#10b981" :
                      task.status === "In Progress" ? "#3b82f6" : "#6b7280",
                    color: "white"
                  }}>
                    {task.status}
                  </span>
                </td>
                <td style={tdStyle}>{task.assigned_to || task.assigned}</td>
                <td style={tdStyle}>{task.due_date || task.due}</td>
                <td style={tdStyle}>
                  <button 
                    onClick={() => openModal("tasks", "view", task)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    View
                  </button>
                  <button 
                    onClick={() => openModal("tasks", "edit", task)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteItem("tasks", task.id)}
                    style={{ padding: "4px 8px", borderRadius: 4, background: "#dc2626", color: "white" }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: 20, textAlign: "center", color: "#666" }}>
                  No tasks found. Create your first task!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const LogsTab = () => {
    return (
      <div style={{ padding: 24 }}>
        <h2>📊 Logs</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: 8 }}>
          <thead>
            <tr>
              <th style={thStyle}>User</th>
              <th style={thStyle}>Action</th>
              <th style={thStyle}>Date & Time</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td style={tdStyle}>{log.user_email || log.user || "System"}</td>
                <td style={tdStyle}>{log.action}</td>
                <td style={tdStyle}>{log.created_at || "—"}</td>
                <td style={tdStyle}>
                  <button 
                    onClick={() => openModal("audit_logs", "view", log)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    View
                  </button>
                  <button 
                    onClick={() => deleteItem("audit_logs", log.id)}
                    style={{ padding: "4px 8px", borderRadius: 4, background: "#dc2626", color: "white" }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: 20, textAlign: "center", color: "#666" }}>
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const NotificationsTab = () => {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2>🔔 Notifications</h2>
          <button 
            onClick={() => openModal("notifications", "create")} 
            style={{ padding: "8px 16px", borderRadius: 6, background: "#1d4ed8", color: "white" }}
            disabled={loading}
          >
            {loading ? "Adding..." : "+ Add Notification"}
          </button>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", borderRadius: 8 }}>
          <thead>
            <tr>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Message</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Delivered</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notif) => (
              <tr key={notif.id}>
                <td style={tdStyle}>{notif.title}</td>
                <td style={tdStyle}>{notif.message}</td>
                <td style={tdStyle}>{notif.created_at ? new Date(notif.created_at).toLocaleDateString() : "—"}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: 12,
                    fontSize: "12px",
                    background: notif.delivered ? "#10b981" : "#f59e0b",
                    color: "white"
                  }}>
                    {notif.delivered ? "Delivered" : "Pending"}
                  </span>
                </td>
                <td style={tdStyle}>
                  <button 
                    onClick={() => openModal("notifications", "view", notif)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    View
                  </button>
                  <button 
                    onClick={() => openModal("notifications", "edit", notif)} 
                    style={{ marginRight: 8, padding: "4px 8px", borderRadius: 4 }}
                    disabled={loading}
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => deleteItem("notifications", notif.id)}
                    style={{ padding: "4px 8px", borderRadius: 4, background: "#dc2626", color: "white" }}
                    disabled={loading}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {notifications.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: 20, textAlign: "center", color: "#666" }}>
                  No notifications found. Create your first notification!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const SettingsTab = ({ theme, setTheme }) => {
    const handleChange = (e) => {
      const { name, value, type, checked } = e.target;
      if (name === "theme") {
        setProfile((prev) => ({ ...prev, theme: value }));
        setTheme(value);
      } else {
        setProfile((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
      }
    };

    const saveSettings = () => {
      setNotif("✅ Settings saved successfully!");
    };

    return (
      <div style={{ padding: 24 }}>
        <h2>⚙️ Settings</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Name</label>
          <input
            type="text"
            name="name"
            value={profile.name}
            onChange={handleChange}
            style={{ padding: 8, width: "300px", borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            name="email"
            value={profile.email}
            onChange={handleChange}
            style={{ padding: 8, width: "300px", borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Theme</label>
          <select
            name="theme"
            value={profile.theme}
            onChange={handleChange}
            style={{ padding: 8, width: "200px", borderRadius: 6, border: "1px solid #ccc" }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>
            <input
              type="checkbox"
              name="notifications"
              checked={profile.notifications}
              onChange={handleChange}
              style={{ marginRight: 6 }}
            />
            Enable Notifications
          </label>
        </div>
        <button
          onClick={saveSettings}
          style={{
            padding: "10px 20px",
            backgroundColor: "#1d4ed8",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Save Settings
        </button>
      </div>
    );
  };

  // Render active tab
  const renderActiveTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab theme={theme} />;
      case "users":
        return <UsersTab />;
      case "referrals":
        return <ReferralsTab />;
      case "tasks":
        return <TasksTab />;
      case "logs":
        return <LogsTab />;
      case "notifications":
        return <NotificationsTab />;
      case "settings":
        return <SettingsTab theme={theme} setTheme={setTheme} />;
      default:
        return <OverviewTab theme={theme} />;
    }
  };

  // Enhanced Modal Component with better input handling
  const Modal = () =>
    modalOpen ? (
      <div
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            width: "min(600px, 96%)",
            maxHeight: "90vh",
            overflowY: "auto",
            background: theme === "dark" ? "#181820" : "#fff",
            borderRadius: 12,
            padding: 24,
            color: theme === "dark" ? "#eee" : "#222",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div>
              <strong style={{ fontSize: 20 }}>
                {modalMode === "view" ? "View" : modalMode === "edit" ? "Edit" : "Create"} {modalTable}
                {loading && " (Loading...)"}
              </strong>
            </div>
            <div>
              <button
                onClick={closeModal}
                disabled={loading}
                style={{
                  marginRight: 8,
                  background: theme === "dark" ? "#333" : "#eee",
                  color: theme === "dark" ? "#eee" : "#333",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                Close
              </button>
              {modalMode !== "view" && (
                <button
                  onClick={saveModal}
                  disabled={loading}
                  style={{
                    background: loading ? "#6b7280" : "#1d4ed8",
                    color: "#fff",
                    padding: "8px 16px",
                    borderRadius: 6,
                    cursor: loading ? "not-allowed" : "pointer",
                    border: "none",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveModal();
            }}
            style={{ display: "flex", flexDirection: "column", gap: 16 }}
          >
            {getTableFormFields(modalTable).map((field) => {
              const value = modalRawObj?.[field.field] ?? "";
              
              if (field.type === "select") {
                return (
                  <div key={field.field} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ color: theme === "dark" ? "#eee" : "#222", fontWeight: 500 }}>
                      {field.label} {field.required && "*"}:
                    </label>
                    <select
                      value={value}
                      disabled={modalMode === "view" || loading}
                      onChange={(e) => handleInputChange(field.field, e.target.value)}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: `1px solid ${theme === "dark" ? "#444" : "#ccc"}`,
                        backgroundColor: theme === "dark" ? "#2c2c3a" : "#fff",
                        color: theme === "dark" ? "#eee" : "#000",
                        cursor: (modalMode === "view" || loading) ? "not-allowed" : "pointer",
                      }}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {String(opt)}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }
              
              return (
                <div key={field.field} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ color: theme === "dark" ? "#eee" : "#222", fontWeight: 500 }}>
                    {field.label} {field.required && "*"}:
                  </label>
                  <input
                    type={field.type}
                    value={value}
                    disabled={modalMode === "view" || loading}
                    onChange={(e) => handleInputChange(field.field, e.target.value, field.type)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${theme === "dark" ? "#444" : "#ccc"}`,
                      backgroundColor: theme === "dark" ? "#2c2c3a" : "#fff",
                      color: theme === "dark" ? "#eee" : "#000",
                      cursor: (modalMode === "view" || loading) ? "not-allowed" : "text",
                    }}
                  />
                </div>
              );
            })}
          </form>
        </div>
      </div>
    ) : null;

  // Main render
  return (
    <div
      style={{
        backgroundColor: theme === "dark" ? "#121212" : "#f5f5f5",
        color: theme === "dark" ? "#eee" : "#111",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "sans-serif",
      }}
    >
      <nav
        style={{
          backgroundColor: "#1d4ed8",
          color: "#fff",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22 }}>Admin Dashboard {loading}</h1>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {notif && (
            <span
              style={{
                background: notif.includes("❌") ? "#dc2626" : "#111827",
                color: "#fff",
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: "14px",
              }}
            >
              {notif}
            </span>
          )}
          <button
  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
  style={{
    background: "none",
    border: `1px solid ${theme === "dark" ? "#555" : "#ccc"}`,
    borderRadius: 6,
    padding: "6px 12px",
    cursor: "pointer",
    color: theme === "dark" ? "#fff" : "#000",
  }}
>
  {theme === "light" ? "🌙" : "☀️"}
</button>

          <button
            onClick={logout}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#6b7280" : "#dc2626",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "600",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Processing..." : "Logout"}
          </button>
        </div>
      </nav>

      <div style={{ display: "flex", flex: 1 }}>
        <aside
          style={{
            width: 200,
            backgroundColor: theme === "dark" ? "#181820" : "#fff",
            borderRight: `1px solid ${theme === "dark" ? "#333" : "#ddd"}`,
            paddingTop: 24,
            color: theme === "dark" ? "#eee" : "#111",
          }}
        >
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => !loading && setActiveTab(tab.id)}
              style={{
                padding: "12px 24px",
                cursor: loading ? "not-allowed" : "pointer",
                backgroundColor:
                  activeTab === tab.id ? (theme === "dark" ? "#1d2442" : "#e0e7ff") : "transparent",
                fontWeight: activeTab === tab.id ? 700 : 500,
                borderLeft: activeTab === tab.id ? "4px solid #2563eb" : "4px solid transparent",
                color: theme === "dark" ? "#f5f7fa" : "#222",
                transition: "all 0.2s ease",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {tab.label}
            </div>
          ))}
        </aside>
        <main style={{ flex: 1, padding: 24, opacity: loading ? 0.6 : 1 }}>
          {loading && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '20px',
              borderRadius: '8px'
            }}>
              Loading...
            </div>
          )}
          {renderActiveTab()}
        </main>
      </div>
      <Modal />
    </div>
  );
}
