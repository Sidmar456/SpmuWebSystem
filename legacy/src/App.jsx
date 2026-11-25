import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import Login from "./pages/Login";
import UserPage from "./pages/UserPage";
import DashboardPage from "./pages/DashboardPage";
import ActivityPage from "./pages/ActivityPage";
import SuppliersPage from "./pages/SuppliersPage";
import InventoryPage from "./pages/InventoryPage";
import ReportsPage from "./pages/ReportsPage";
import PersonalizePage from "./pages/PersonalizePage";
import SettingsPage from "./pages/SettingsPage";
import AdminProfilePage from "./pages/AdminProfilePage";
import UserOverviewPage from "./pages/UserOverviewPage";
import EquipmentBorrowingPage from "./pages/EquipmentBorrowingPage";
import newProductIcon from "./icon/new-product.png";
import outOfStockIcon from "./icon/out-of-stock.png";
import statsIcon from "./icon/stats.png";
import { groupRequests } from "./utils/requestGroups";
import { apiFetch } from "./utils/api";

const navigation = [
  {
    label: "Inventory",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "⌂" },
      { id: "activity", label: "Stock activity", icon: "◷", badge: "8" },
      { id: "borrowing", label: "Equipment Borrowing", icon: "🔄" },
    ],
  },
  {
    label: "Manage",
    items: [
      { id: "users", label: "Users & Receipts", icon: "👥" },
      { id: "members", label: "Suppliers", icon: "◎" },
      { id: "projects", label: "Inventory", icon: "▦" },
      { id: "reports", label: "Requests", icon: "▤" },
      { id: "profile", label: "Profile", icon: "👤" },
    ],
  },
];

const pageContent = {
  dashboard: {
    eyebrow: "Monday, September 7, 2026",
    title: "Inventory monitoring",
    description:
      "Track stock levels, deliveries, and inventory activity in one place.",
  },
  activity: {
    eyebrow: "Workspace pulse",
    title: "Stock activity",
    description: "Stay on top of the latest updates from your team.",
  },
  borrowing: {
    eyebrow: "Asset & loan governance",
    title: "Equipment Borrowing",
    description: "Track returnable assets, monitor active loans, confirm returns, and inspect equipment conditions.",
  },
  members: {
    eyebrow: "Manage your team",
    title: "Suppliers",
    description: "Invite people, assign roles, and keep your team moving.",
  },
  users: {
    eyebrow: "Directory & History",
    title: "Users & Transaction Receipts",
    description: "Track all registered users, individual transaction receipts, and request breakdowns.",
  },
  projects: {
    eyebrow: "Your work at a glance",
    title: "Inventory",
    description: "Organize priorities and keep every initiative in view.",
  },
  reports: {
    eyebrow: "Insights and trends",
    title: "Requests",
    description: "Turn workspace activity into useful decisions.",
  },
  profile: {
    eyebrow: "Account Management",
    title: "Admin Profile",
    description: "Manage administrator credentials, profile details, and account security.",
  },
  personalize: {
    eyebrow: "Make it yours",
    title: "Personalize",
    description: "Shape your workspace to match the way you work.",
  },
  settings: {
    eyebrow: "Workspace controls",
    title: "Settings",
    description: "Manage preferences, notifications, and access.",
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const page = pageContent[activePage];
  const selectPage = (id) => {
    setActivePage(id);
    setSidebarOpen(false);
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewAll, setViewAll] = useState(false);
  const [stocks, setStocks] = useState([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [itemDetails, setItemDetails] = useState("");
  const [itemType, setItemType] = useState("non_returnable");
  const [showAddStockPopup, setShowAddStockPopup] = useState(false);
  const [addingStock, setAddingStock] = useState(false);
  const [itemImage, setItemImage] = useState(null);
  const [stats, setStats] = useState({
    lowStock: 0,
    inStock: 0,
    pendingRequests: 0,
  });
  const [claimDocument, setClaimDocument] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [receivedBy, setReceivedBy] = useState("");
  const [showClaimPopup, setShowClaimPopup] = useState(false);
  const [activeManagementTab, setActiveManagementTab] = useState("stock");
  const [updatingRequest, setUpdatingRequest] = useState(false);
  const [allRequests, setAllRequests] = useState([]);
  const [pendingAccountRequests, setPendingAccountRequests] = useState([]);
  const [selectedAccountRequest, setSelectedAccountRequest] = useState(null);
  const [loadingAccountRequests, setLoadingAccountRequests] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState("items");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [updatesPage, setUpdatesPage] = useState(1);
  const UPDATES_PER_PAGE = 10;
  const [claimCode, setClaimCode] = useState("");
  const [claimResult, setClaimResult] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [returnDueDateTime, setReturnDueDateTime] = useState("");

  // ─── Admin Notifications ────────────────────────────────
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [adminNotifOpen, setAdminNotifOpen] = useState(false);
  const adminKnownNotifIdsRef = useRef(null);
  const adminAudioCtxRef = useRef(null);
  const adminPendingSoundRef = useRef(false);

  const playAdminNotifSound = useCallback(() => {
    const ctx = adminAudioCtxRef.current;
    if (!ctx || ctx.state !== "running") {
      adminPendingSoundRef.current = true;
      return;
    }
    try {
      const osc = ctx.createOscillator();
      const vol = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1100, now + 0.12);
      vol.gain.setValueAtTime(0.0001, now);
      vol.gain.exponentialRampToValueAtTime(0.09, now + 0.03);
      vol.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.connect(vol);
      vol.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } catch (e) {
      console.error("Admin notif sound error:", e);
    }
  }, []);

  const enableAdminSound = useCallback(() => {
    if (!adminAudioCtxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      adminAudioCtxRef.current = new AC();
    }
    const ctx = adminAudioCtxRef.current;
    const flush = () => {
      if (adminPendingSoundRef.current) {
        adminPendingSoundRef.current = false;
        playAdminNotifSound();
      }
    };
    if (ctx.state === "suspended") ctx.resume().then(flush).catch(() => {});
    else flush();
  }, [playAdminNotifSound]);

  useEffect(() => {
    const handleInitialInteraction = () => {
      enableAdminSound();
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    };
    const events = ["pointerdown", "keydown"];
    events.forEach((ev) => document.addEventListener(ev, handleInitialInteraction, { once: true }));
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, handleInitialInteraction));
      if (adminAudioCtxRef.current) {
        adminAudioCtxRef.current.close().catch(() => {});
        adminAudioCtxRef.current = null;
      }
    };
  }, [enableAdminSound]);

  // Show system / Chrome push notification
  const showAdminPushNotification = useCallback((title, body) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "spmu-admin-notif-" + Date.now(),
        });
        notif.onclick = () => {
          window.focus();
          selectPage("reports");
          notif.close();
        };
      } catch (e) {
        console.error("Browser push notification error:", e);
      }
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  const fetchAdminNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("get_notifications.php", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        const ids = data.notifications.map((n) => n.id);
        if (adminKnownNotifIdsRef.current === null) {
          adminKnownNotifIdsRef.current = new Set(ids);
        } else {
          const known = adminKnownNotifIdsRef.current;
          const newNotifs = data.notifications.filter((n) => !known.has(n.id));
          ids.forEach((id) => known.add(id));
          if (newNotifs.length > 0) {
            playAdminNotifSound();
            newNotifs.forEach((n) => {
              showAdminPushNotification(n.title, n.message);
            });
          }
        }
        setAdminNotifications(data.notifications);
        setAdminUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error("Admin notification fetch error:", err);
    }
  }, [playAdminNotifSound, showAdminPushNotification]);

  const markAdminNotifsRead = async () => {
    try {
      await apiFetch("mark_notifications_read.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setAdminUnreadCount(0);
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };


  const handleConfirmClaim = async () => {
    if (!claimResult?.id) {
      alert("Request not found.");
      return;
    }

    if (!claimDocument) {
      alert("Please upload the claim document.");
      return;
    }

    if (claimResult?.item_type === "returnable" && !returnDueDateTime) {
      alert("Please specify the date and time when this returnable item is due to be returned.");
      return;
    }

    const formData = new FormData();

    formData.append("request_id", claimResult.id);
    formData.append("received_by", receivedBy);
    formData.append("claim_document", claimDocument);
    if (returnDueDateTime) {
      formData.append("expected_return_date", returnDueDateTime);
    }

    try {
      const response = await apiFetch(
        "confirm_claim.php",
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );

      const result = await response.json();

      console.log(result);

      if (result.success) {
        alert(result.message || "Claim confirmed successfully!");

        setClaimResult((prev) => ({
          ...prev,
          status: "COMPLETED",
          claim_document: result.claim_document,
          received_by: result.received_by,
        }));

        setShowClaimPopup(false);
        setReturnDueDateTime("");
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error(error);
      alert("Failed to confirm claim.");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowAddStockPopup(false);
      }
    };
    if (showAddStockPopup) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showAddStockPopup]);

  const claimItem = async () => {
    const code = claimCode.trim();

    if (!code) {
      setClaimError("Please enter the claim code.");
      setClaimResult(null);
      return;
    }

    setClaimLoading(true);
    setClaimError("");
    setClaimResult(null);

    try {
      const response = await apiFetch("claim_item.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          claim_code: code,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setClaimResult(data.request);
      } else {
        setClaimError(data.message || "Invalid claim code.");
      }
    } catch (error) {
      console.error("Claim error:", error);
      setClaimError("Unable to verify claim code.");
    } finally {
      setClaimLoading(false);
    }
  };
  const fetchTransactions = async () => {
    try {
      setTransactionLoading(true);

      const response = await apiFetch(
        "get_transactions.php",
        {
          credentials: "include",
        },
      );

      const data = await response.json();

      if (data.success) {
        setTransactions(data.transactions || []);
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Transaction fetch error:", error);
    } finally {
      setTransactionLoading(false);
    }
  };
  useEffect(() => {
    if (activeManagementTab === "receipt") {
      fetchTransactions();
    }
  }, [activeManagementTab]);

  useEffect(() => {
    setUpdatesPage(1);
  }, [allRequests.length]);
  const updateRequestStatus = async (status) => {
    if (!selectedRequest?.id) {
      alert("Request not found.");
      return;
    }

    setUpdatingRequest(true);

    try {
      const response = await apiFetch(
        "update_request_status.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            request_id: selectedRequest.id,
            request_group_id: selectedRequest.request_group_id,
            request_ids: selectedRequest.request_ids ?? [],
            status: status,
          }),
        },
      );

      const text = await response.text();

      let data;

      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error("Invalid JSON returned by PHP:", text);
        throw new Error(
          "Server returned invalid JSON. Check update_request_status.php.",
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to update request.");
      }

      setSelectedRequest((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          status,
          items: prev.items?.map((item) => ({
            ...item,
            status,
          })),
        };
      });

      await refreshDashboardData();

      alert(
        status === "APPROVED"
          ? "Entire request approved. The user can see their claim code in their portal."
          : "Entire request cancelled.",
      );
    } catch (error) {
      console.error("Update request error:", error);
      alert(`Update request error: ${error.message}`);
    } finally {
      setUpdatingRequest(false);
    }
  };
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      return;
    }

    const search = query.toLowerCase().trim();

    // Search page/navigation names
    const pageMatch = Object.entries(pageContent).find(
      ([id, content]) =>
        id.toLowerCase().includes(search) ||
        content.title.toLowerCase().includes(search) ||
        content.description.toLowerCase().includes(search),
    );

    if (pageMatch) {
      setActivePage(pageMatch[0]);
      return;
    }

    // Search stock items
    const stockMatch = stocks.find((stock) =>
      stock.item_name?.toLowerCase().includes(search),
    );

    if (stockMatch) {
      setActivePage("projects");
      return;
    }

    // Search item requests
    const requestMatch = groupRequests(pendingRequests).find(
      (request) =>
        request.items.some((item) =>
          item.item_name?.toLowerCase().includes(search),
        ) || request.user_name?.toLowerCase().includes(search),
    );

    if (requestMatch) {
      setSelectedRequest(requestMatch);
      setActivePage("reports");
      return;
    }

    // Search account requests
    const accountMatch = pendingAccountRequests.find(
      (request) =>
        request.name?.toLowerCase().includes(search) ||
        request.email?.toLowerCase().includes(search) ||
        request.role?.toLowerCase().includes(search),
    );

    if (accountMatch) {
      setSelectedAccountRequest(accountMatch);
      setActivePage("reports");
      setActiveReportTab("permissions");
      return;
    }
  };
  const handleSearchResultClick = () => {
    const search = searchQuery.toLowerCase().trim();

    // Page
    const pageMatch = Object.entries(pageContent).find(
      ([id, content]) =>
        id.toLowerCase().includes(search) ||
        content.title.toLowerCase().includes(search) ||
        content.description.toLowerCase().includes(search),
    );

    if (pageMatch) {
      setActivePage(pageMatch[0]);
      setSearchOpen(false);
      setSearchQuery("");
      return;
    }

    // Stock
    const stockMatch = stocks.find((stock) =>
      stock.item_name?.toLowerCase().includes(search),
    );

    if (stockMatch) {
      setActivePage("projects");
      setSearchOpen(false);
      setSearchQuery("");
      return;
    }

    // Item request
    const requestMatch = groupRequests(pendingRequests).find(
      (request) =>
        request.items.some((item) =>
          item.item_name?.toLowerCase().includes(search),
        ) || request.user_name?.toLowerCase().includes(search),
    );

    if (requestMatch) {
      setSelectedRequest(requestMatch);
      setActivePage("reports");
      setSearchOpen(false);
      setSearchQuery("");
      return;
    }

    // Account request
    const accountMatch = pendingAccountRequests.find(
      (request) =>
        request.name?.toLowerCase().includes(search) ||
        request.email?.toLowerCase().includes(search) ||
        request.role?.toLowerCase().includes(search),
    );

    if (accountMatch) {
      setSelectedAccountRequest(accountMatch);
      setActivePage("reports");
      setActiveReportTab("permissions");
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  useEffect(() => {
    const mergedRequests = [
      ...groupRequests(pendingRequests).map((request) => ({
        ...request,
        request_type: "item_request",
        user_name: request.user_name || "Unknown user",
        item_name: request.item_name || "Unknown item",
        amount: request.total_amount || request.amount || 0,
      })),
      ...pendingAccountRequests.map((request) => ({
        ...request,
        request_type: "account_permission",
        user_name: request.name || "Unknown user",
        item_name: request.permission || request.role || "Permission request",
        amount: request.role || "Permission",
        permission: request.permission || request.role || "Permission request",
      })),
    ].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    setAllRequests(mergedRequests);
  }, [pendingRequests, pendingAccountRequests]);

  const totalUpdatePages = Math.max(
    1,
    Math.ceil(allRequests.length / UPDATES_PER_PAGE),
  );
  const visibleUpdateRequests = allRequests.slice(
    (updatesPage - 1) * UPDATES_PER_PAGE,
    updatesPage * UPDATES_PER_PAGE,
  );

  const refreshDashboardData = async () => {
    try {
      await Promise.all([
        fetchPendingRequests(),
        fetchAccountRequests(),
        apiFetch("inventory_stats.php")
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              setStats({
                lowStock: data.low_stock,
                inStock: data.in_stock,
                pendingRequests: data.pending_requests,
              });
            }
          })
          .catch((error) => {
            console.error("Error fetching inventory stats:", error);
          }),
        apiFetch("get_stocks.php")
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to fetch stocks");
            }

            return response.json();
          })
          .then((data) => {
            setStocks(data);
          })
          .catch((error) => {
            console.error("Error fetching stocks:", error);
          })
          .finally(() => {
            setLoadingStocks(false);
          }),
        apiFetch("get_stocks_summary.php")
          .then((response) => {
            if (!response.ok) {
              throw new Error("Failed to fetch stock summary");
            }

            return response.json();
          })
          .then((data) => {
            setStockSummary(data);
          })
          .catch((error) => {
            console.error("Error loading stock summary:", error);
          }),
      ]);
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true);

      const response = await apiFetch("get_requests.php", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch requests");
      }

      const data = await response.json();

      console.log("Requests from server:", data);

      if (data.success && Array.isArray(data.requests)) {
        const pending = data.requests.filter(
          (request) => String(request.status).toUpperCase() === "PENDING",
        );

        setPendingRequests(pending);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      setPendingRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };
  const fetchAccountRequests = async () => {
    try {
      setLoadingAccountRequests(true);

      const response = await apiFetch(
        "get_account_requests.php",
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch account requests");
      }

      const data = await response.json();

      console.log("Account requests from server:", data);

      if (data.success && Array.isArray(data.requests)) {
        setPendingAccountRequests(data.requests);
      } else {
        setPendingAccountRequests([]);
      }
    } catch (error) {
      console.error("Error fetching account requests:", error);

      setPendingAccountRequests([]);
    } finally {
      setLoadingAccountRequests(false);
    }
  };
  const approveAccount = async (id) => {
    try {
      const response = await apiFetch(
        "approve_account.php",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: id,
          }),
        },
      );

      const data = await response.json();

      console.log("Approve response:", data);

      if (!data.success) {
        alert(data.message || "Unable to approve account.");
        return;
      }

      alert("Account approved successfully.");

      setSelectedAccountRequest(null);

      fetchAccountRequests();
      refreshDashboardData();
    } catch (error) {
      console.error("Approve account error:", error);
      alert("Unable to connect to the server.");
    }
  };
  const rejectAccount = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to reject this account request?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        "reject_account.php",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: id,
          }),
        },
      );

      const data = await response.json();

      console.log("Reject response:", data);

      if (!data.success) {
        alert(data.message || "Unable to reject account.");
        return;
      }

      alert("Account rejected.");

      setSelectedAccountRequest(null);

      fetchAccountRequests();
      refreshDashboardData();
    } catch (error) {
      console.error("Reject account error:", error);
      alert("Unable to connect to the server.");
    }
  };

  useEffect(() => {
    refreshDashboardData();
    fetchAdminNotifications();

    const intervalId = setInterval(() => {
      refreshDashboardData();
      fetchAdminNotifications();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [fetchAdminNotifications]);

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(() => controller.abort(), 10000);

    apiFetch("check_session.php", {
      method: "GET",
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Session check failed");
        }

        const data = await response.json();

        if (data.success) {
          setUser(data.user ?? null);
        } else {
          setUser(null);
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Session check error:", error);
        }

        setUser(null);
      })
      .finally(() => {
        clearTimeout(timer);
        setCheckingAuth(false);
      });

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, []);

  const [stockSummary, setStockSummary] = useState({
    total_stock: 0,
    new_stock: 0,
    out_of_stock: 0,
  });
  const addStock = async (e) => {
    e.preventDefault();

    if (!itemName || !amount) {
      return;
    }

    setAddingStock(true);

    try {
      const formData = new FormData();

      formData.append("item_name", itemName);
      formData.append("amount", amount);
      formData.append("item_type", itemType);

      if (itemDetails) {
        formData.append("details", itemDetails);
        formData.append("description", itemDetails);
      }

      if (itemImage) {
        formData.append("image", itemImage);
      }

      const response = await apiFetch("add_stock.php", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        console.log("Stock added successfully");

        setItemName("");
        setAmount("");
        setItemDetails("");
        setItemType("non_returnable");
        setItemImage(null);
        setShowAddStockPopup(false);
        refreshDashboardData();
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Error adding stock:", error);
    } finally {
      setAddingStock(false);
    }
  };
  if (checkingAuth) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const handleLogout = async () => {
    try {
      await apiFetch("logout.php", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    setUser(null);
  };

  // USER ACCOUNT → USER PAGE
  if (user.role === "user") {
    return (
      <UserPage user={user} onLogin={setUser} onLogout={() => setUser(null)} />
    );
  }
  const pendingGroupedRequestCount = groupRequests(pendingRequests).length;
  return (
    <div className="app-shell">
      <aside
        className={`sidebar ${sidebarOpen ? "is-open" : ""} ${
          sidebarCollapsed ? "is-collapsed" : ""
        }`}
      >
        <div className="brand-row">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed((current) => !current)}
            aria-label={
              sidebarCollapsed ? "Expand navigation" : "Collapse navigation"
            }
          >
            ☰
          </button>
          <div className="brand-mark">S</div>
          <span className="brand-name">
            SPMU<span>.</span>
          </span>
          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            ×
          </button>
        </div>
        <div className="workspace-switcher">
          <button
            type="button"
            className="workspace-info-btn"
            onClick={() => selectPage("profile")}
            title="Open Admin Profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              textAlign: "left",
              color: "inherit",
              flex: 1,
              minWidth: 0,
            }}
          >
            <div className="workspace-avatar">
              {(user?.name || "A").charAt(0).toUpperCase()}
            </div>

            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <strong style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {user?.name || "Administrator"}
              </strong>
              <span style={{ display: "block", fontSize: "12px", opacity: 0.75, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {user?.email || "Admin account"}
              </span>
            </div>
          </button>

          <button className="logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((section) => (
            <div className="nav-section" key={section.label}>
              <p className="nav-label">{section.label}</p>
              {section.items.map((item) => (
                <button
                  className={`nav-item ${activePage === item.id ? "active" : ""}`}
                  key={item.id}
                  onClick={() => selectPage(item.id)}
                >
                  <span className="nav-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                  {item.id === "reports" &&
                    pendingGroupedRequestCount > 0 && (
                      <span className="nav-badge">
                        {pendingGroupedRequestCount}
                      </span>
                    )}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <main className="main-content">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            ☰
          </button>

          <div className="breadcrumbs">
            <span>Inventory</span>
            <b>/</b>
            <strong>{page.title}</strong>
          </div>

          <div className="topbar-actions">
            {/* ── Notification Bell ── */}
            <div className="admin-notif-wrapper">
              <button
                className="icon-button admin-notif-bell"
                aria-label="Notifications"
                onClick={() => {
                  setAdminNotifOpen((c) => !c);
                  if (!adminNotifOpen && adminUnreadCount > 0) markAdminNotifsRead();
                }}
              >
                🔔
                {adminUnreadCount > 0 && (
                  <span className="admin-notif-badge">{adminUnreadCount}</span>
                )}
              </button>

              {adminNotifOpen && (
                <div className="admin-notif-dropdown">
                  <div className="admin-notif-dropdown-head">
                    <h4>Notifications</h4>
                    <span>{adminUnreadCount} unread</span>
                  </div>
                  {"Notification" in window && Notification.permission !== "granted" && (
                    <div style={{ padding: "10px 14px", background: "#fef3c7", borderBottom: "1px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <span style={{ fontSize: "11px", color: "#92400e", fontWeight: "500" }}>
                        🔔 Desktop popups are not enabled
                      </span>
                      <button
                        type="button"
                        style={{
                          background: "#d97706",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          fontSize: "11px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                        onClick={async () => {
                          try {
                            const perm = await Notification.requestPermission();
                            if (perm === "granted") {
                              new Notification("Notifications Enabled", {
                                body: "You will now receive desktop popups even in other tabs!",
                                icon: "/favicon.svg",
                              });
                            }
                          } catch (e) {
                            console.error(e);
                          }
                        }}
                      >
                        Enable
                      </button>
                    </div>
                  )}
                  {adminNotifications.length === 0 ? (
                    <div className="admin-notif-empty">
                      <p>No notifications yet.</p>
                      <small>You'll be notified when users submit requests.</small>
                    </div>
                  ) : (
                    <div className="admin-notif-list">
                      {adminNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`admin-notif-item ${!n.is_read ? "unread" : ""}`}
                          onClick={() => {
                            if (n.type === "new_request") {
                              selectPage("reports");
                            }
                            setAdminNotifOpen(false);
                          }}
                        >
                          <div className="admin-notif-icon-col">
                            {n.type === "new_request" ? "📋" : "🔔"}
                          </div>
                          <div className="admin-notif-text-col">
                            <strong>{n.title}</strong>
                            <span>{n.message}</span>
                            <small>
                              {new Date(n.created_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </small>
                          </div>
                          {!n.is_read && <span className="admin-notif-dot" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              className="icon-button"
              aria-label="Search"
              onClick={() => setSearchOpen((current) => !current)}
            >
              ⌕
            </button>

            {searchOpen && (
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search anything..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  autoFocus
                />

                {searchQuery.trim() && (
                  <>
                    {(() => {
                      const search = searchQuery.toLowerCase().trim();

                      const pageMatch = Object.entries(pageContent).find(
                        ([id, content]) =>
                          id.toLowerCase().includes(search) ||
                          content.title.toLowerCase().includes(search),
                      );

                      const stockMatch = stocks.find((stock) =>
                        stock.item_name?.toLowerCase().includes(search),
                      );

                      const requestMatch = pendingRequests.find(
                        (request) =>
                          request.item_name?.toLowerCase().includes(search) ||
                          request.user_name?.toLowerCase().includes(search),
                      );

                      const accountMatch = pendingAccountRequests.find(
                        (request) =>
                          request.name?.toLowerCase().includes(search) ||
                          request.email?.toLowerCase().includes(search) ||
                          request.role?.toLowerCase().includes(search),
                      );

                      const found =
                        pageMatch || stockMatch || requestMatch || accountMatch;

                      return found ? (
                        <button
                          type="button"
                          className="search-result"
                          onClick={handleSearchResultClick}
                        >
                          {pageMatch && <span>📄 {pageMatch[1].title}</span>}

                          {!pageMatch && stockMatch && (
                            <span>📦 {stockMatch.item_name}</span>
                          )}

                          {!pageMatch && !stockMatch && requestMatch && (
                            <span>📋 {requestMatch.item_name}</span>
                          )}

                          {!pageMatch &&
                            !stockMatch &&
                            !requestMatch &&
                            accountMatch && <span>👤 {accountMatch.name}</span>}
                        </button>
                      ) : (
                        <div className="search-not-found">Not found</div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              className="top-avatar"
              onClick={() => selectPage("profile")}
              title="View Admin Profile"
              aria-label="Admin Profile"
            >
              {(user?.name || "A").charAt(0).toUpperCase()}
            </button>
          </div>
        </header>
        {/*dashboard*/}
        <section className="page-content">
          {activePage === "dashboard" && (
            <DashboardPage
              UPDATES_PER_PAGE={UPDATES_PER_PAGE}
              allRequests={allRequests}
              loadingRequests={loadingRequests}
              page={page}
              pendingRequests={pendingRequests}
              selectPage={selectPage}
              setActiveManagementTab={setActiveManagementTab}
              setActiveReportTab={setActiveReportTab}
              setSelectedRequest={setSelectedRequest}
              setShowAddStockPopup={setShowAddStockPopup}
              setUpdatesPage={setUpdatesPage}
              stats={stats}
              totalUpdatePages={totalUpdatePages}
              updatesPage={updatesPage}
              visibleUpdateRequests={visibleUpdateRequests}
            />
          )}
          {activePage === "activity" && (
            <ActivityPage
              loadingStocks={loadingStocks}
              newProductIcon={newProductIcon}
              outOfStockIcon={outOfStockIcon}
              page={page}
              refreshDashboardData={refreshDashboardData}
              selectPage={selectPage}
              setStocks={setStocks}
              statsIcon={statsIcon}
              stockSummary={stockSummary}
              stocks={stocks}
            />
          )}
          {activePage === "borrowing" && (
            <EquipmentBorrowingPage page={page} />
          )}
          {activePage === "members" && <SuppliersPage page={page} />}
          {activePage === "projects" && (
            <InventoryPage
              activeManagementTab={activeManagementTab}
              addStock={addStock}
              addingStock={addingStock}
              amount={amount}
              claimCode={claimCode}
              claimDocument={claimDocument}
              claimError={claimError}
              claimItem={claimItem}
              claimLoading={claimLoading}
              claimResult={claimResult}
              fetchTransactions={fetchTransactions}
              handleConfirmClaim={handleConfirmClaim}
              itemDetails={itemDetails}
              itemName={itemName}
              itemType={itemType}
              page={page}
              receivedBy={receivedBy}
              setActiveManagementTab={setActiveManagementTab}
              setAmount={setAmount}
              setClaimCode={setClaimCode}
              setClaimDocument={setClaimDocument}
              setItemDetails={setItemDetails}
              setItemImage={setItemImage}
              setItemName={setItemName}
              setItemType={setItemType}
              setReceivedBy={setReceivedBy}
              setShowAddStockPopup={setShowAddStockPopup}
              setShowClaimPopup={setShowClaimPopup}
              showAddStockPopup={showAddStockPopup}
              showClaimPopup={showClaimPopup}
              stocks={stocks}
              transactionLoading={transactionLoading}
              transactions={transactions}
              viewAll={viewAll}
            />
          )}
          {activePage === "reports" && (
            <ReportsPage
              activeReportTab={activeReportTab}
              approveAccount={approveAccount}
              claimCode={claimCode}
              claimDocument={claimDocument}
              claimError={claimError}
              claimItem={claimItem}
              claimLoading={claimLoading}
              claimResult={claimResult}
              handleConfirmClaim={handleConfirmClaim}
              loadingAccountRequests={loadingAccountRequests}
              loadingRequests={loadingRequests}
              page={page}
              pendingAccountRequests={pendingAccountRequests}
              pendingRequests={pendingRequests}
              receivedBy={receivedBy}
              refreshDashboardData={refreshDashboardData}
              rejectAccount={rejectAccount}
              returnDueDateTime={returnDueDateTime}
              selectedAccountRequest={selectedAccountRequest}
              selectedRequest={selectedRequest}
              setActiveReportTab={setActiveReportTab}
              setClaimCode={setClaimCode}
              setClaimDocument={setClaimDocument}
              setReceivedBy={setReceivedBy}
              setReturnDueDateTime={setReturnDueDateTime}
              setSelectedAccountRequest={setSelectedAccountRequest}
              setSelectedRequest={setSelectedRequest}
              setShowClaimPopup={setShowClaimPopup}
              showClaimPopup={showClaimPopup}
              stats={stats}
              updateRequestStatus={updateRequestStatus}
              updatingRequest={updatingRequest}
            />
          )}
          {activePage === "users" && (
            <UserOverviewPage page={page} />
          )}
          {activePage === "profile" && (
            <AdminProfilePage
              page={page}
              user={user}
              onUpdateUser={(updatedUser) => {
                setUser((prev) => ({ ...prev, ...updatedUser }));
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
