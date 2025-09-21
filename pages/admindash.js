
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
    <div style={{
      fontSize: 12,
      color: theme === "dark" ? "#888" : "#7b8492",
      marginBottom: 6,
      fontWeight: 700,
      letterSpacing: 0.6,
      textTransform: "uppercase",
    }}>
      {title}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700 }}>
      {value}
    </div>
    <div style={{
      color: theme === "dark" ? "#aaa" : "#8a98af",
      fontSize: 14,
      marginTop: 11
    }}>
      <span>Next Payout</span>
      <span style={{ marginLeft: 14, fontWeight: 600, color: theme === "dark" ? "#eee" : "#414a58" }}>
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
  const [logs, setLogs] = useState([]); // audit_logs
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [settings, setSettings] = useState([]);
  
  const [notifications, setNotifications] = useState([
    { id: 1, title: "System Update", message: "Your profile was updated successfully.", time: "2025-09-15 10:32" },
    { id: 2, title: "New Referral", message: "User John Doe joined via referral.", time: "2025-09-14 18:45" },
  ]);

  const [notif, setNotif] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [profile, setProfile] = useState({
    name: "Admin User",
    email: "admin@example.com",
    theme: "light",
    notifications: true,
  });
  const [theme, setTheme] = React.useState("light");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "referrals", label: "Referrals" },
    { id: "tasks", label: "Tasks" },
    { id: "logs", label: "Logs" },
    { id: "notifications", label: "Notifications" },
    { id: "settings", label: "Settings" },
  ];

  // Demo fallbacks (unchanged)
  const demoUsers = [
    { id: "23f56f64-2026-4840-87a9-7048909c79f5", email: "alice@example.com", username: "Alice Johnson", balance: 1250.5, joined: "2025-03-21", referrals: 15, status: "Active" },
    { id: "25a9c43e-4986-4a71-ba39-2fa394aa67eb", email: "bob@example.com", username: "Bob Smith", balance: 850.75, joined: "2025-02-11", referrals: 8, status: "Active" },
    { id: "e6a69136-054e-4ca4-98be-89d418c0bd56", email: "zara@example.com", username: "Zara Khan", balance: 410.0, joined: "2025-01-13", referrals: 27, status: "Disabled" },
    { id: "fd62aee9-9ed9-4e81-8a0f-173c83c469c4", email: "michael@example.com", username: "Michael Lee", balance: 980.25, joined: "2025-04-05", referrals: 12, status: "Active" },
    { id: "8191c6e3-553a-42d1-9dd9-24ff09613c0b", email: "sophia@example.com", username: "Sophia Brown", balance: 1345.0, joined: "2025-05-02", referrals: 18, status: "Active" },
  ];
  const demoReferrals = [
    { id: "68236ae7-6e0a-4bd4-8d48-bddf75299741", code: "REF123ABC", referrer: "alice@example.com", referred: "carol@example.com", date: "2025-08-22", status: "Approved", earnings: "$50" },
    { id: "ca608d2f-2212-4f25-92bd-1cfe12d0cf8e", code: "REF456DEF", referrer: "bob@example.com", referred: "nina@example.com", date: "2025-07-09", status: "Pending", earnings: "$0" },
    { id: "4c11dde3-9482-43ca-9cc5-e143fdb9147f", code: "REF789GHI", referrer: "zara@example.com", referred: "amit@example.com", date: "2025-06-11", status: "Rejected", earnings: "$0" },
    { id: "5ac01ec5-e837-4838-8cfb-858a42096dc4", code: "REF321JKL", referrer: "michael@example.com", referred: "liam@example.com", date: "2025-08-05", status: "Approved", earnings: "$35" },
    { id: "e4c457d8-bb25-4e67-bf49-dd6984b326d2", code: "REF654MNO", referrer: "sophia@example.com", referred: "emma@example.com", date: "2025-09-01", status: "Approved", earnings: "$45" },
  ];
  const demoTasks = [
  { id: "bd825e76-2a8b-4c1a-9757-1ffa3b5bcfd2", title: "Review payout requests", status: "In Progress", assigned: "Alice Johnson", due: "2025-09-20" },
  { id: "7e6ee672-8a3b-4d28-b688-f9a8a02033c2", title: "Approve new referrals", status: "To Do", assigned: "Bob Smith", due: "2025-09-21" },
  { id: "cc624754-dcd8-46d5-baa9-787779223dad", title: "Verify KYC documents", status: "In Progress", assigned: "Zara Khan", due: "2025-09-23" },
  { id: "e48e8842-7f05-4ea2-93e7-f9eb0bc5c47f", title: "Update user balance records", status: "Completed", assigned: "Michael Lee", due: "2025-09-15" },
  { id: "c232a817-4dcb-43cb-87db-4d908ca8aec6", title: "Audit referral earnings", status: "To Do", assigned: "Sophia Brown", due: "2025-09-25" },
];

const demoLogs = [
  { id: "78a47372-cf98-4d5d-b490-09f0b13d7166", user: "alice@example.com", action: "Approved referral for Carol", at: "2025-09-14 18:45" },
  { id: "d6b7cbfb-9644-4eec-b07b-1ab6c8db90a2", user: "bob@example.com", action: "Updated profile settings", at: "2025-09-14 17:01" },
  { id: "bd6b97e5-769f-4b48-850d-5d663dd0ac3f", user: "zara@example.com", action: "Requested payout", at: "2025-09-11 10:18" },
  { id: "7bf07a12-b11f-479a-b232-d7631e34eb42", user: "michael@example.com", action: "Reviewed KYC documents", at: "2025-09-13 14:22" },
  { id: "eb6627d1-c26f-4f01-8671-c74d2320f702", user: "sophia@example.com", action: "Added new referral", at: "2025-09-12 09:40" },
];

const demoTransactions = [
  { id: "a502cb9d-6a3c-4d31-9f72-86670f481a65", name: "Sowmiya", type: "Credit", date: "10 Sep, 2025", price: "$50" },
  { id: "01eba7a9-b412-4d87-85cc-80e86e1fc6fc", name: "Sowmi", type: "Credit", date: "12 Sep, 2025", price: "$30" },
  { id: "e784cf03-f3cb-4133-9d92-e1dd55f64c72", name: "Reshma", type: "Credit", date: "13 Sep, 2025", price: "$100" },
  { id: "3de21370-3f68-412b-a585-5eeabfb099a4", name: "abc", type: "Debit", date: "14 Sep, 2025", price: "$25" },
  { id: "66c2f63e-2e19-4651-82a0-3c7dda64e26f", name: "xyz", type: "Credit", date: "15 Sep, 2025", price: "$75" },
];

  // Simple helpers
  const money = (n) => (n == null ? "—" : `$${Number(n).toLocaleString()}`);
  const shorten = (s = "") => (s.length > 12 ? `${s.slice(0, 6)}...${s.slice(-4)}` : s || "—");

  // ---------------- Realtime + initial fetch ----------------
  useEffect(() => {
    // initial fetch for all relevant tables
    async function fetchAll() {
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
      }
    }
    fetchAll();

    // subscribe helper
    

const subscribeTable = (table, setState) => {
  return supabase
    .channel(table)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      async (payload) => {
        console.log(`Realtime event on ${table}:`, payload);

        // 🔔 Special case: if a new referral is added, also insert a notification
        if (table === "referrals" && payload.eventType === "INSERT") {
          const newNotif = {
            title: "New Referral",
            message: `User ${payload.new.client_name || payload.new.referred} joined via referral.`,
            time: new Date().toISOString(),
          };

          try {
            await supabase.from("notifications").insert([newNotif]);
            console.log("✅ Notification inserted for new referral");
          } catch (err) {
            console.error("❌ Failed to insert notification:", err.message);
          }

          // Optional: keep your toast alert
          setNotif(`📩 New referral: ${payload.new.client_name || payload.new.referred}`);
        }

        // ✅ Update local state based on event type
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

  // ---------------- Generic CRUD -> backend ----------------
  // Backend base path (your FastAPI main.py exposes /users, /referrals, etc.)
  const apiBase ="http://127.0.0.1:8000";
  async function createItem(table, data) {
    try {
      const res = await fetch(`${apiBase}/${table}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt}`);
      }
      const body = await res.json();
      setNotif(`${table} created`);
      // rely on realtime to refresh; also optimistic update:
      // Do nothing here (realtime will update)
      return body;
    } catch (err) {
      console.error("createItem error", err);
      setNotif(`Create error: ${err.message}`);
      throw err;
    }
  }

  async function updateItem(table, id, data) {
  try {
    const res = await fetch(`${apiBase}/${table}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),  // Wrap data inside an object with 'data' key
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`${res.status} ${txt}`);
    }
    const body = await res.json();
    setNotif(`${table} updated`);
    return body;
  } catch (err) {
    setNotif(`Update error: ${err.message}`);
    throw err;
  }
}
  async function deleteItem(table, id) {
    if (!confirm(`Delete ${table} record ${id}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${apiBase}/${table}/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status} ${txt}`);
      }
      setNotif(`${table} deleted`);
      // realtime will refresh
      return true;
    } catch (err) {
      console.error("deleteItem error", err);
      setNotif(`Delete error: ${err.message}`);
      throw err;
    }
  }

  // ---------------- Modal: View / Edit / Create JSON ----------------
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view"); // view | edit | create
  const [modalTable, setModalTable] = useState(null);
  const [modalData, setModalData] = useState("");
  const [modalRawObj, setModalRawObj] = useState(null);

 function openModal(table, mode = "view", record = null) {
  setModalTable(table);
  setModalMode(mode);
  setModalRawObj(record || {});
   setModalOpen(true);
}

  function closeModal() {
    setModalOpen(false);
    setModalTable(null);
    setModalMode("view");
    setModalData("");
    setModalRawObj(null);
  }

  async function saveModal() {
  try {
    if (modalRawObj === null) {
      alert("No data to save");
      return;
    }
    if (modalMode === "edit") {
      const id = modalRawObj?.id; // Use only 'id', no 'uuid'
      if (!id) {
        alert("Cannot determine record id!");
        return;
      }
      await updateItem(modalTable, id, modalRawObj);
      setNotif(`${modalTable} updated`);
    } else if (modalMode === "create") {
      await createItem(modalTable, modalRawObj);
      setNotif(`${modalTable} created`);
    }
    closeModal();
  } catch (err) {
    setNotif(`Error saving: ${err.message}`);
  }
}
  // ---------------- UI Tab Components (preserved with added actions) ----------------
  const OverviewTab = ({ theme }) => (
  <div style={{ width: "100%" }}>
    <div style={{ display: "flex", alignItems: "stretch", marginBottom: 18, flexWrap: "wrap" }}>
      <ReferralStatCard title="Incentive" value="$10,430.00" nextPayout="$7,254.00" theme={theme} />
      <ReferralStatCard title="Total Number of Clicks" value="12,345" nextPayout="$7,254.00" theme={theme} />
      <ReferralStatCard title="Total Referrals" value="453" nextPayout="$7,254.00" theme={theme} />
    </div>

    <div style={{
      background: theme === "dark" ? "#222235" : "#fff",
      borderRadius: 16,
      boxShadow: "0 0 6px 0 rgba(16,24,40,.06)",
      padding: 24,
      marginTop: 10,
      color: theme === "dark" ? "#ddd" : "#000"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme === "dark" ? "#eee" : "#222" }}>Transaction History</div>
        <button style={{
          background: theme === "dark" ? "#3b82f6" : "#fff",
          color: theme === "dark" ? "#fff" : "#2563eb",
          border: `1px solid ${theme === "dark" ? "#3b82f6" : "#2563eb"}`,
          borderRadius: 6,
          padding: "6px 12px",
          cursor: "pointer"
        }}
          onClick={() => openModal("transactions", "create")}>+ Add Transaction</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{
            color: theme === "dark" ? "#9ca3af" : "#6b7280",
            fontSize: 13,
            fontWeight: 600,
            borderBottom: `1px solid ${theme === "dark" ? "#444" : "#d1d5db"}`
          }}>
            <th style={{ padding: 10, textAlign: "left" }}></th>
            <th style={{ padding: 10, textAlign: "left" }}>Name</th>
            <th style={{ padding: 10, textAlign: "left" }}>Type</th>
            <th style={{ padding: 10, textAlign: "left" }}>Date</th>
            <th style={{ padding: 10, textAlign: "right" }}>Price</th>
            <th style={{ padding: 10, textAlign: "right" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(transactions.length ? transactions : demoTransactions).map((tx) => (
            <tr key={tx.id} style={{
              borderTop: `1px solid ${theme === "dark" ? "#444" : "#f3f4f6"}`,
              background: tx.id % 2 ? (theme === "dark" ? "#2c2f3f" : "#fff") : (theme === "dark" ? "#232538" : "#f9fafb"),
              color: theme === "dark" ? "#ddd" : "#000"
            }}>
              <td style={{ padding: 10, fontSize: 22 }}>🙍‍♂️</td>
              <td style={{ padding: 10, fontWeight: 600 }}>{tx.name}</td>
              <td style={{ padding: 10 }}>{tx.type}</td>
              <td style={{ padding: 10 }}>{tx.date}</td>
              <td style={{ padding: 10, textAlign: "right" }}>{tx.price}</td>
              <td style={{ padding: 10, textAlign: "right" }}>
                <button onClick={() => openModal("transactions", "view", tx)} style={{ marginRight: 8 }}>View</button>
                <button onClick={() => openModal("transactions", "edit", tx)} style={{ marginRight: 8 }}>Edit</button>
                <button onClick={() => deleteItem("transactions", tx.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

  const UsersTab = () => {
    const renderRows = users.length ? users : demoUsers;
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h2><span role="img" aria-label="user">👤</span> Users</h2>
          <div>
            <button onClick={() => openModal("users", "create")} style={{ padding: "6px 10px", borderRadius: 6 }}>+ Add User</button>
          </div>
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
            {renderRows.map((u) => (
              <tr key={u.id}>
                <td style={tdStyle}>{shorten(u.id)}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}>{u.username}</td>
                <td style={tdStyle}>{money(u.balance)}</td>
                <td style={tdStyle}>{u.joined || (u.created_at ? new Date(u.created_at).toLocaleDateString() : "—")}</td>
                <td style={tdStyle}>{u.referrals || 0}</td>
                <td style={tdStyle}>{u.status || "Active"}</td>
                <td style={tdStyle}>
                  <button onClick={() => openModal("users", "view", u)} style={{ marginRight: 8 }}>View</button>
                  <button onClick={() => openModal("users", "edit", u)} style={{ marginRight: 8 }}>Edit</button>
                  <button onClick={() => deleteItem("users", u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const ReferralsTab = () => (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2>Referral Management</h2>
        <button onClick={() => openModal("referrals", "create")} style={{ padding: "6px 10px", borderRadius: 6 }}>+ Add Referral</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>Code</th>
            <th style={thStyle}>Referrer</th>
            <th style={thStyle}>Referred</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Earnings</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(referrals.length ? referrals : demoReferrals).map((r) => (
            <tr key={r.id}>
              <td style={tdStyle}>{r.code}</td>
              <td style={tdStyle}>{r.referrer}</td>
              <td style={tdStyle}>{r.referred}</td>
              <td style={tdStyle}>{r.date}</td>
              <td style={tdStyle}>{r.status}</td>
              <td style={tdStyle}>{r.earnings}</td>
              <td style={tdStyle}>
                <button onClick={() => openModal("referrals", "view", r)} style={{ marginRight: 8 }}>View</button>
                <button onClick={() => openModal("referrals", "edit", r)} style={{ marginRight: 8 }}>Edit</button>
                <button onClick={() => deleteItem("referrals", r.id || r.uuid)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const TasksTab = () => (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2>Task Management</h2>
        <button onClick={() => openModal("tasks", "create")} style={{ padding: "6px 10px", borderRadius: 6 }}>+ Add Task</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Title</th>
            <th style={thStyle}>Assigned</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Due</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(tasks.length ? tasks : demoTasks).map((t) => (
            <tr key={t.id}>
              <td style={tdStyle}>{shorten(t.id)}</td>
              <td style={tdStyle}>{t.title}</td>
              <td style={tdStyle}>{t.assigned}</td>
              <td style={tdStyle}>{t.status}</td>
              <td style={tdStyle}>{t.due}</td>
              <td style={tdStyle}>
                <button onClick={() => openModal("tasks", "view", t)} style={{ marginRight: 8 }}>View</button>
                <button onClick={() => openModal("tasks", "edit", t)} style={{ marginRight: 8 }}>Edit</button>
                <button onClick={() => deleteItem("tasks", t.id || t.uuid)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const LogsTab = () => (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2>Logs</h2>
        <button onClick={() => openModal("audit_logs", "create")} style={{ padding: "6px 10px", borderRadius: 6 }}>+ Add Log</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={thStyle}>User</th>
            <th style={thStyle}>Action</th>
            <th style={thStyle}>Timestamp</th>
            <th style={thStyle}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {(logs.length ? logs : demoLogs).map((log) => (
            <tr key={log.id}>
              <td style={tdStyle}>{log.user}</td>
              <td style={tdStyle}>{log.action}</td>
              <td style={tdStyle}>{log.at}</td>
              <td style={tdStyle}>
                <button onClick={() => openModal("audit_logs", "view", log)} style={{ marginRight: 8 }}>View</button>
                <button onClick={() => openModal("audit_logs", "edit", log)} style={{ marginRight: 8 }}>Edit</button>
                <button onClick={() => deleteItem("audit_logs", log.id || log.uuid)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const NotificationsTab = () => (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h2>Notifications</h2>
        <button onClick={() => openModal("notifications", "create")} style={{ padding: "6px 10px", borderRadius: 6 }}>+ Add Notification</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
        {(notifications.length ? notifications : []).map((note) => (
          <div key={note.id} style={{ backgroundColor: "#fff", borderRadius: 10, padding: 16, boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: 16, color: "#333" }}>{note.title}</h3>
            <p style={{ margin: 0, marginBottom: 8, fontSize: 14, color: "#555" }}>{note.message}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#999" }}>{note.time}</span>
              <div>
                <button onClick={() => openModal("notifications", "view", note)} style={{ marginRight: 8 }}>View</button>
                <button onClick={() => openModal("notifications", "edit", note)} style={{ marginRight: 8 }}>Edit</button>
                <button onClick={() => deleteItem("notifications", note.id || note.uuid)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  

  // ---------------- Modal JSX ----------------
   const getTableFormFields = (table) => {
  switch (table) {
    case "users":
      return [
        { label: "Email", field: "email", type: "email" },
        { label: "Username", field: "username", type: "text" },
        { label: "Balance", field: "balance", type: "number" },
        { label: "Joined", field: "joined", type: "text" },
        { label: "Referrals", field: "referrals", type: "number" },
        { label: "Status", field: "status", type: "text" },
      ];
    case "referrals":
      return [
        { label: "Code", field: "code", type: "text" },
        { label: "Referrer", field: "referrer", type: "text" },
        { label: "Referred", field: "referred", type: "text" },
        { label: "Date", field: "date", type: "text" },
        { label: "Status", field: "status", type: "text" },
        { label: "Earnings", field: "earnings", type: "text" },
      ];
    case "tasks":
      return [
        { label: "Title", field: "title", type: "text" },
        { label: "Assigned", field: "assigned", type: "text" },
        { label: "Status", field: "status", type: "text" },
        { label: "Due", field: "due", type: "text" },
      ];
    case "audit_logs":
      return [
        { label: "User", field: "user", type: "text" },
        { label: "Action", field: "action", type: "text" },
        { label: "Timestamp", field: "at", type: "text" },
      ];
    case "notifications":
      return [
        { label: "Title", field: "title", type: "text" },
        { label: "Message", field: "message", type: "text" },
        { label: "Time", field: "time", type: "text" },
      ];
    case "settings":
      return [
        { label: "Key/ID", field: "key", type: "text" },
        { label: "Value", field: "value", type: "text" },
      ];
    case "transactions":
      return [
        { label: "Name", field: "name", type: "text" },
        { label: "Type", field: "type", type: "select", options: ["Credit", "Debit"] },
        { label: "Date", field: "date", type: "text" },
        { label: "Price", field: "price", type: "text" },
      ];
    default:
      return [];
  }
};

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
          width: "min(1000px, 96%)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: theme === "dark" ? "#181820" : "#fff",
          borderRadius: 12,
          padding: 18,
          color: theme === "dark" ? "#eee" : "#222",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <strong style={{ fontSize: 18 }}>
              {modalMode === "view"
                ? "View"
                : modalMode === "edit"
                ? "Edit"
                : "Create"}
              :
            </strong>
            <span style={{ marginLeft: 8, color: theme === "dark" ? "#bbb" : "#666" }}>{modalTable}</span>
          </div>
          <div>
            <button
              onClick={closeModal}
              style={{
                marginRight: 8,
                background: theme === "dark" ? "#333" : "#eee",
                color: theme === "dark" ? "#eee" : "#333",
                border: "none",
                borderRadius: 6,
                padding: "6px 10px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
            {modalMode !== "view" && (
              <button
                onClick={saveModal}
                style={{
                  background: "#1d4ed8",
                  color: "#fff",
                  padding: "6px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            )}
          </div>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveModal();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 500 }}
        >
          {getTableFormFields(modalTable).map((field) => {
            const value = modalRawObj?.[field.field] ?? "";
            if (field.type === "select") {
              return (
                <label
                  key={field.field}
                  style={{ color: theme === "dark" ? "#eee" : "#222" }}
                >
                  {field.label}:
                  <select
                    value={value}
                    disabled={modalMode === "view"}
                    onChange={(e) =>
                      setModalRawObj({ ...modalRawObj, [field.field]: e.target.value })
                    }
                    style={{
                      marginLeft: 8,
                      padding: 8,
                      borderRadius: 4,
                      border: `1px solid ${theme === "dark" ? "#444" : "#ccc"}`,
                      width: 152,
                      backgroundColor: theme === "dark" ? "#2c2c3a" : "#fff",
                      color: theme === "dark" ? "#eee" : "#000",
                      cursor: modalMode === "view" ? "not-allowed" : "pointer",
                    }}
                  >
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <label
                key={field.field}
                style={{ color: theme === "dark" ? "#eee" : "#222" }}
              >
                {field.label}:
                <input
                  type={field.type}
                  value={value}
                  disabled={modalMode === "view"}
                  onChange={(e) =>
                    setModalRawObj({
                      ...modalRawObj,
                      [field.field]:
                        field.type === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                  style={{
                    marginLeft: 8,
                    padding: 8,
                    borderRadius: 4,
                    border: `1px solid ${theme === "dark" ? "#444" : "#ccc"}`,
                    backgroundColor: theme === "dark" ? "#2c2c3a" : "#fff",
                    color: theme === "dark" ? "#eee" : "#000",
                    width: 220,
                    cursor: modalMode === "view" ? "not-allowed" : "text",
                  }}
                />
              </label>
            );
          })}
        </form>
      </div>
    </div>
  ) : null;
    
const SettingsTab = ({ theme, setTheme }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "theme") {
      setProfile((prev) => ({ ...prev, theme: value }));
      setTheme(value); // update theme state when selected
    } else {
      setProfile((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    }
  };

    const saveSettings = () => {
      alert("Settings saved successfully! (local only)");
      // You can implement real saving logic here
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

  // renderActiveTab now passes theme props for SettingsTab
  const renderActiveTab = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewTab />;
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
        return <OverviewTab />;
    }
  };

  // Main render with theme-aware container styles
  return (
  <div
    className={theme === "dark" ? "dark-theme" : "light-theme"}
    style={{
      backgroundColor: theme === "dark" ? "#121212" : "#f5f5f5",
      color: theme === "dark" ? "#eee" : "#111",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "sans-serif",
    }}
  >
      <nav style={{ backgroundColor: "#1d4ed8", color: "#fff", padding: "12px 24px", display: "flex", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Admin Dashboard</h1>
        <div style={{ marginLeft: "auto" }}>
          {notif && <span style={{ background: "#111827", color: "#fff", padding: "6px 12px", borderRadius: 8 }}>{notif}</span>}
        </div>
      </nav>

      <div style={{ display: "flex", flex: 1 }}>
        <aside
  style={{
    width: 200,
    backgroundColor: theme === "dark" ? "#181820" : "#fff",
    borderRight: "1px solid #222",
    paddingTop: 24,
    color: theme === "dark" ? "#eee" : "#111"
  }}
>
  {tabs.map((tab) => (
    <div
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      style={{
        padding: "12px 24px",
        cursor: "pointer",
        backgroundColor:
          activeTab === tab.id
            ? theme === "dark"
              ? "#1d2442"
              : "#e0e7ff"
            : "transparent",
        fontWeight: activeTab === tab.id ? 700 : 500,
        borderLeft:
          activeTab === tab.id
            ? "4px solid #2563eb"
            : "4px solid transparent",
        color: theme === "dark" ? "#f5f7fa" : "#222"
      }}
    >
      {tab.label}
    </div>
  ))}
</aside>
        <main style={{ flex: 1, padding: 24 }}>{renderActiveTab()}</main>
      </div>
      {/* Modal */}
      <Modal />
    </div>
  );
}