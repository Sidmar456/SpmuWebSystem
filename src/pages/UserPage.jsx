
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiBell,
  FiBox,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiEdit2,
  FiGrid,
  FiKey,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiShield,
  FiUser,
  FiX,
  FiChevronRight,
  FiArrowLeft,
  FiTrash2,
} from "react-icons/fi";
import "../App.css";
import { groupRequests } from "../utils/requestGroups";
import { apiFetch, apiUrl } from "../utils/api";

function UserPage({ user, onLogin, onLogout }) {
  // Navigation
  const [activeNav, setActiveNav] = useState("dashboard");
  const [dashboardTab, setDashboardTab] = useState("supplies");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);

  // Inventory and requests
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRequests, setMyRequests] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [bulkRequesting, setBulkRequesting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("all");

  // Notifications
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const refreshInProgress = useRef(false);
  const knownClaimCodesRef = useRef(null);
  const audioContextRef = useRef(null);
  const pendingNotificationSoundRef = useRef(false);

  // Database notifications (approved/cancelled by admin)
  const [dbNotifications, setDbNotifications] = useState([]);
  const [dbUnreadCount, setDbUnreadCount] = useState(0);
  const knownDbNotifIdsRef = useRef(null);

  // Profile
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileUpdating, setProfileUpdating] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const groupedMyRequests = useMemo(
    () => groupRequests(myRequests),
    [myRequests],
  );

  useEffect(() => {
    setProfileName(user?.name || "");
    setProfileEmail(user?.email || "");
  }, [user]);

  // Approved requests with claim codes
  const claimCodeNotifications = groupedMyRequests.filter(
    (request) =>
      request.claim_code &&
      String(request.status).toLowerCase() === "approved"
  );

  // Notification sound
  const playNotificationSound = useCallback(() => {
    const context = audioContextRef.current;

    if (!context || context.state !== "running") {
      pendingNotificationSoundRef.current = true;
      return;
    }

    try {
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      const now = context.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, now);
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      oscillator.connect(volume);
      volume.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (error) {
      console.error("Notification sound error:", error);
    }
  }, []);

  const enableNotificationSound = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextConstructor =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextConstructor) return;

      audioContextRef.current = new AudioContextConstructor();
    }

    const context = audioContextRef.current;

    const playPendingSound = () => {
      if (pendingNotificationSoundRef.current) {
        pendingNotificationSoundRef.current = false;
        playNotificationSound();
      }
    };

    if (context.state === "suspended") {
      context.resume().then(playPendingSound).catch(() => {});
    } else {
      playPendingSound();
    }
  }, [playNotificationSound]);

  // Fetch requests belonging to the logged-in user
  const fetchMyRequests = useCallback(async () => {
    try {
      const response = await apiFetch("get_my_requests.php", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch requests.");
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.requests)) {
        const groupedRequests = groupRequests(data.requests);
        const receivedCodes = groupedRequests
          .filter((request) => request.claim_code)
          .map((request) => `${request.group_key}:${request.claim_code}`);

        if (knownClaimCodesRef.current === null) {
          knownClaimCodesRef.current = new Set(receivedCodes);
        } else {
          const knownCodes = knownClaimCodesRef.current;

          const hasNewCode = receivedCodes.some(
            (code) => !knownCodes.has(code)
          );

          receivedCodes.forEach((code) => knownCodes.add(code));

          if (hasNewCode) {
            playNotificationSound();
          }
        }

        setMyRequests(data.requests);

        setSelectedRequest((current) => {
          if (!current) return null;

          return (
            groupedRequests.find(
              (request) =>
                request.group_key === current.group_key ||
                request.request_ids.some(
                  (id) => String(id) === String(current.id),
                ) ||
                String(request.id) === String(current.id),
            ) || null
          );
        });
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  }, [playNotificationSound]);

  // Show system / Chrome push notification
  const showUserPushNotification = useCallback((title, body) => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: "spmu-user-notif-" + Date.now(),
        });
        notif.onclick = () => {
          window.focus();
          setActiveTab("my-requests");
          notif.close();
        };
      } catch (e) {
        console.error("Browser push notification error:", e);
      }
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Fetch DB notifications (approved/cancelled by admin)
  const fetchDbNotifications = useCallback(async () => {
    try {
      const res = await apiFetch("get_notifications.php", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        const ids = data.notifications.map((n) => n.id);
        if (knownDbNotifIdsRef.current === null) {
          knownDbNotifIdsRef.current = new Set(ids);
        } else {
          const known = knownDbNotifIdsRef.current;
          const newNotifs = data.notifications.filter((n) => !known.has(n.id));
          ids.forEach((id) => known.add(id));
          if (newNotifs.length > 0) {
            playNotificationSound();
            newNotifs.forEach((n) => {
              showUserPushNotification(n.title, n.message);
            });
          }
        }
        setDbNotifications(data.notifications);
        setDbUnreadCount(data.unread_count);
      }
    } catch (err) {
      console.error("DB notification fetch error:", err);
    }
  }, [playNotificationSound, showUserPushNotification]);

  const markDbNotifsRead = async () => {
    try {
      await apiFetch("mark_notifications_read.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      setDbNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setDbUnreadCount(0);
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  // Refresh inventory and request history
  const refreshUserData = useCallback(async () => {
    if (refreshInProgress.current) return;

    refreshInProgress.current = true;

    try {
      const fetchStocks = async () => {
        const response = await apiFetch("get_available_stocks.php");

        if (!response.ok) {
          throw new Error("Failed to fetch inventory.");
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.stocks)) {
          setStocks(data.stocks);
        }
      };

      await Promise.allSettled([
        fetchStocks(),
        fetchMyRequests(),
        fetchDbNotifications(),
      ]);
    } finally {
      refreshInProgress.current = false;
      setLoading(false);
    }
  }, [fetchMyRequests, fetchDbNotifications]);

  // Auto-refresh (runs in background tabs so push notifications trigger)
  useEffect(() => {
    const handleInitialInteraction = () => {
      enableNotificationSound();
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    };

    const audioEvents = ["pointerdown", "keydown"];

    audioEvents.forEach((eventName) => {
      document.addEventListener(
        eventName,
        handleInitialInteraction,
        { once: true }
      );
    });

    refreshUserData();

    // Poll every 3 seconds continuously so background tabs detect notifications
    const intervalId = setInterval(() => {
      refreshUserData();
    }, 3000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshUserData();
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      clearInterval(intervalId);

      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);

      audioEvents.forEach((eventName) => {
        document.removeEventListener(
          eventName,
          handleInitialInteraction
        );
      });

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [enableNotificationSound, refreshUserData]);

  // =========================================================
  // MULTI-ITEM SELECTION
  // =========================================================

  const toggleStockSelection = (stock) => {
    const id = String(stock.id);

    if (Number(stock.amount) <= 0) return;

    setSelectedItems((current) => {
      const updated = { ...current };

      if (updated[id]) {
        delete updated[id];
      } else {
        updated[id] = {
          stock,
          amount: 1,
        };
      }

      return updated;
    });
  };

  const updateSelectedQuantity = (stockId, value) => {
    const id = String(stockId);

    setSelectedItems((current) => {
      const entry = current[id];

      if (!entry) return current;

      if (value === "") {
        return {
          ...current,
          [id]: {
            ...entry,
            amount: "",
          },
        };
      }

      const quantity = Number(value);
      const available = Number(entry.stock.amount);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return current;
      }

      if (quantity > available) {
        alert(
          `Only ${available} unit(s) of ${entry.stock.item_name} are available.`
        );
        return current;
      }

      return {
        ...current,
        [id]: {
          ...entry,
          amount: quantity,
        },
      };
    });
  };

  const removeSelectedItem = (stockId) => {
    setSelectedItems((current) => {
      const updated = { ...current };
      delete updated[String(stockId)];
      return updated;
    });
  };

  const clearSelectedItems = () => {
    if (!bulkRequesting) {
      setSelectedItems({});
    }
  };

  // Submit all selected items in one request
  const submitBulkRequest = async () => {
    const items = Object.values(selectedItems);

    if (items.length === 0) {
      alert("Please select at least one supply.");
      return;
    }

    for (const entry of items) {
      const quantity = Number(entry.amount);
      const available = Number(entry.stock.amount);

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > available
      ) {
        alert(
          `Please enter a valid quantity for ${entry.stock.item_name}.`
        );
        return;
      }
    }

    setBulkRequesting(true);

    try {
      const response = await apiFetch("request_stock.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          items: items.map(({ stock, amount }) => ({
            stock_id: stock.id,
            amount: Number(amount),
          })),
        }),
      });

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Invalid server response:", responseText);
        throw new Error(
          "Invalid server response. Please check request_stock.php."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to submit your request."
        );
      }

      setSelectedItems({});
      setSelectedCatalogItem(null);
      setSelectedRequest(null);

      await refreshUserData();

      setDashboardTab("requests");

      alert(
        data.message ||
          "Your combined supply request has been submitted successfully."
      );
    } catch (error) {
      console.error("Bulk request error:", error);
      alert(error.message || "Unable to submit your request.");
    } finally {
      setBulkRequesting(false);
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    try {
      await apiFetch("logout.php", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    onLogout();
  };

  // =========================================================
  // PROFILE UPDATE
  // =========================================================

  const handleSaveProfile = async (event) => {
    event.preventDefault();

    setProfileError("");
    setProfileSuccess("");

    if (!profileName.trim() || !profileEmail.trim()) {
      setProfileError("Name and email are required.");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setProfileError(
          "New password must be at least 6 characters."
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        setProfileError("New passwords do not match.");
        return;
      }

      if (!currentPassword) {
        setProfileError(
          "Enter your current password to confirm the changes."
        );
        return;
      }
    }

    setProfileUpdating(true);

    try {
      const response = await apiFetch(
        "update_profile.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: profileName.trim(),
            email: profileEmail.trim(),
            current_password: currentPassword,
            new_password: newPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to update profile."
        );
      }

      setProfileSuccess(
        data.message || "Profile updated successfully."
      );

      if (data.user && onLogin) {
        onLogin(data.user);
      }

      if (data.user) {
        setProfileName(data.user.name || "");
        setProfileEmail(data.user.email || "");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        setIsEditingProfile(false);
        setProfileSuccess("");
      }, 1500);
    } catch (error) {
      console.error("Update profile error:", error);
      setProfileError(
        error.message || "Unable to update your profile."
      );
    } finally {
      setProfileUpdating(false);
    }
  };

  // =========================================================
  // DISPLAY HELPERS
  // =========================================================

  const getRequestProgress = (status) => {
    const normalized = String(status || "").toLowerCase();

    return [
      {
        label: "Request Submitted",
        done: [
          "pending",
          "approved",
          "processing",
          "processed",
          "completed",
        ].includes(normalized),
      },
      {
        label: "Approved by SPMU",
        done: [
          "approved",
          "processing",
          "processed",
          "completed",
        ].includes(normalized),
      },
      {
        label: "Ready for Claim",
        done: [
          "approved",
          "processing",
          "processed",
          "completed",
        ].includes(normalized),
      },
      {
        label: "Item Received",
        done: ["processed", "completed"].includes(normalized),
      },
    ];
  };

  const pendingCount = groupedMyRequests.filter(
    (request) =>
      String(request.status).toLowerCase() === "pending"
  ).length;

  const approvedCount = groupedMyRequests.filter(
    (request) =>
      String(request.status).toLowerCase() === "approved"
  ).length;

  const completedCount = groupedMyRequests.filter((request) =>
    ["processed", "completed"].includes(
      String(request.status).toLowerCase()
    )
  ).length;

  // Total notification count: claim codes + DB unread
  const totalNotifCount = claimCodeNotifications.length + dbUnreadCount;

  const filteredStocks = stocks.filter((stock) =>
    String(stock.item_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase().trim())
  );

  const filteredRequests = groupedMyRequests.filter((request) => {
    const status = String(request.status || "").toLowerCase();

    if (requestStatusFilter === "all") return true;
    if (requestStatusFilter === "pending") return status === "pending";
    if (requestStatusFilter === "approved") return status === "approved";

    if (requestStatusFilter === "completed") {
      return ["processed", "completed"].includes(status);
    }

    return true;
  });

  const selectedCount = Object.keys(selectedItems).length;

  const totalSelectedUnits = Object.values(selectedItems).reduce(
    (total, entry) => total + (Number(entry.amount) || 0),
    0
  );

  const hasInvalidQuantity = Object.values(selectedItems).some(
    (entry) =>
      !Number.isInteger(Number(entry.amount)) ||
      Number(entry.amount) < 1 ||
      Number(entry.amount) > Number(entry.stock.amount)
  );

  const userInitial = (user?.name || "U")
    .charAt(0)
    .toUpperCase();

  const stockImageUrl = (image) => apiUrl(`uploads/stocks/${image}`);

  // =========================================================
  // USER INTERFACE
  // =========================================================

  return (
    <div className="user-app-layout">
      {sidebarMobileOpen && (
        <div
          className="user-sidebar-scrim"
          onClick={() => setSidebarMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`user-sidebar ${
          sidebarCollapsed ? "is-collapsed" : ""
        } ${sidebarMobileOpen ? "is-mobile-open" : ""}`}
      >
        <div className="user-sidebar-header">
          <div className="user-sidebar-brand">
            <span className="user-brand-icon">S</span>
            {!sidebarCollapsed && (
              <span className="user-brand-title">
                SPMU<span className="brand-dot">.</span>
              </span>
            )}
          </div>

          <button
            type="button"
            className="user-sidebar-toggle-btn"
            onClick={() =>
              setSidebarCollapsed((current) => !current)
            }
            title="Toggle sidebar"
          >
            ☰
          </button>
        </div>

        <div className="user-sidebar-profile-card">
          <div className="user-sidebar-avatar">{userInitial}</div>

          {!sidebarCollapsed && (
            <div className="user-sidebar-meta">
              <strong>{user?.name || "Requester"}</strong>
              <span>{user?.email || "User Account"}</span>
            </div>
          )}
        </div>

        <nav className="user-sidebar-nav" aria-label="Portal Navigation">
          <button
            type="button"
            className={`user-nav-link ${
              activeNav === "dashboard" ? "active" : ""
            }`}
            onClick={() => {
              setActiveNav("dashboard");
              setSidebarMobileOpen(false);
            }}
          >
            <span className="user-nav-icon"><FiGrid /></span>
            {!sidebarCollapsed && (
              <span className="user-nav-text">Dashboard</span>
            )}
            {!sidebarCollapsed &&
              totalNotifCount > 0 && (
                <span className="user-nav-pill">
                  {totalNotifCount}
                </span>
              )}
          </button>

          <button
            type="button"
            className={`user-nav-link ${
              activeNav === "profile" ? "active" : ""
            }`}
            onClick={() => {
              setActiveNav("profile");
              setSidebarMobileOpen(false);
            }}
          >
            <span className="user-nav-icon"><FiUser /></span>
            {!sidebarCollapsed && (
              <span className="user-nav-text">Profile</span>
            )}
          </button>
        </nav>

        <div className="user-sidebar-footer">
          <button
            type="button"
            className="user-nav-link logout-btn"
            onClick={handleLogout}
            title="Log out"
          >
            <span className="user-nav-icon"><FiLogOut /></span>
            {!sidebarCollapsed && (
              <span className="user-nav-text">Log out</span>
            )}
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="user-main-wrapper">
        <header className="user-topbar">
          <div className="user-topbar-left">
            <button
              type="button"
              className="user-mobile-menu-trigger"
              onClick={() => setSidebarMobileOpen(true)}
              aria-label="Open sidebar"
            >
              <FiMenu />
            </button>

            <div className="user-topbar-title">
              <h1>
                {activeNav === "dashboard"
                  ? "Portal Dashboard"
                  : "User Profile"}
              </h1>
              <p>
                {activeNav === "dashboard"
                  ? "Browse inventory supplies and manage requests"
                  : "View and edit your account details"}
              </p>
            </div>
          </div>

          <div className="user-topbar-right">
            <div className="user-notification-wrapper">
              <button
                type="button"
                className="user-notification-bell"
                onClick={() => {
                  setNotificationsOpen((current) => !current);
                  if (!notificationsOpen && dbUnreadCount > 0) markDbNotifsRead();
                }}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
              >
                <FiBell />
                {totalNotifCount > 0 && (
                  <span className="user-notification-badge">
                    {totalNotifCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  className="user-notification-dropdown"
                  id="user-notification-dropdown"
                >
                  <div className="user-notification-dropdown-header">
                    <h4>Notifications</h4>
                    <span>
                      {totalNotifCount} new
                    </span>
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

                  {totalNotifCount === 0 && dbNotifications.length === 0 ? (
                    <div className="user-notification-empty-state">
                      <p>No notifications yet.</p>
                      <small>
                        You'll be notified when your requests are updated.
                      </small>
                    </div>
                  ) : (
                    <div className="user-notification-list">
                      {/* DB Notifications (approved/cancelled) */}
                      {dbNotifications.map((n) => (
                        <div
                          key={`db-${n.id}`}
                          className={`user-notification-row db-notif-row ${!n.is_read ? "unread" : ""}`}
                          onClick={() => {
                            setActiveNav("dashboard");
                            setDashboardTab("requests");
                            setNotificationsOpen(false);
                          }}
                        >
                          <div className="db-notif-icon-col">
                            {n.type === "request_approved" ? "✅" : n.type === "request_cancelled" ? "❌" : "🔔"}
                          </div>
                          <div>
                            <strong>{n.title}</strong>
                            <span>{n.message}</span>
                            <small style={{ display: "block", opacity: 0.6, marginTop: 2 }}>
                              {new Date(n.created_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </small>
                          </div>
                          {!n.is_read && <span className="db-notif-unread-dot" />}
                        </div>
                      ))}

                      {/* Claim Code Notifications */}
                      {claimCodeNotifications.map((request) => (
                        <button
                          type="button"
                          key={request.group_key}
                          className="user-notification-row"
                          aria-label={`View claim code for ${request.item_name}`}
                          onClick={() => {
                            setActiveNav("dashboard");
                            setDashboardTab("requests");
                            setRequestStatusFilter("all");
                            setSelectedRequest(request);
                            setNotificationsOpen(false);
                          }}
                        >
                          <div>
                            <strong>{request.item_name}</strong>
                            <span>
                              {request.items.length} item(s) ready for pickup
                            </span>
                            {request.items.length > 1 && (
                              <small className="user-notification-items">
                                {request.items
                                  .map((item) => item.item_name)
                                  .join(", ")}
                              </small>
                            )}
                          </div>
                          <span className="claim-badge-sm">
                            {request.claim_code}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="user-topbar-user"
              onClick={() => setActiveNav("profile")}
              title="View profile"
            >
              <div className="user-topbar-avatar">{userInitial}</div>
              <div className="user-topbar-info">
                <strong>{user?.name || "User"}</strong>
                <span>Requester</span>
              </div>
            </button>
          </div>
        </header>

        <main className="user-content-body">
          {/* DASHBOARD */}
          {activeNav === "dashboard" && (
            <div className="user-dashboard-view">
              <div className="user-welcome-banner">
                <div className="user-welcome-text">
                  <h2>
                    Welcome back, {user?.name || "Requester"} 👋
                  </h2>
                  <p>
                    Select multiple supplies, submit one request,
                    and track approval progress here.
                  </p>
                </div>
                <div className="user-welcome-badge">
                  <span>Supply Property Management Unit</span>
                </div>
              </div>

              {/* STATISTICS */}
              <div className="user-stats-grid">
                <div className="user-stat-card">
                  <div className="user-stat-icon-wrapper stat-blue">
                    <FiBox />
                  </div>
                  <div className="user-stat-data">
                    <span className="stat-label">Available Supplies</span>
                    <h3>{loading ? "..." : stocks.length}</h3>
                  </div>
                </div>

                <div className="user-stat-card">
                  <div className="user-stat-icon-wrapper stat-amber">
                    <FiClock />
                  </div>
                  <div className="user-stat-data">
                    <span className="stat-label">Pending Approval</span>
                    <h3>{pendingCount}</h3>
                  </div>
                </div>

                <div className="user-stat-card">
                  <div className="user-stat-icon-wrapper stat-green">
                    <FiKey />
                  </div>
                  <div className="user-stat-data">
                    <span className="stat-label">Ready to Claim</span>
                    <h3>{approvedCount}</h3>
                  </div>
                </div>

                <div className="user-stat-card">
                  <div className="user-stat-icon-wrapper stat-purple">
                    <FiCheckCircle />
                  </div>
                  <div className="user-stat-data">
                    <span className="stat-label">Completed Items</span>
                    <h3>{completedCount}</h3>
                  </div>
                </div>
              </div>

              {/* TABS */}
              <div className="user-dashboard-tabs-bar">
                <div className="user-segmented-controls">
                  <button
                    type="button"
                    className={`segmented-tab ${
                      dashboardTab === "supplies" ? "active" : ""
                    }`}
                    onClick={() => {
                      setDashboardTab("supplies");
                      setSelectedRequest(null);
                    }}
                  >
                    <FiBox />
                    <span>Available Supplies Catalog</span>
                    <span className="tab-counter">{stocks.length}</span>
                  </button>

                  <button
                    type="button"
                    className={`segmented-tab ${
                      dashboardTab === "requests" ? "active" : ""
                    }`}
                    onClick={() => {
                      setDashboardTab("requests");
                      setSelectedCatalogItem(null);
                    }}
                  >
                    <FiClock />
                    <span>My Requests & Tracking</span>
                    <span className="tab-counter">
                      {groupedMyRequests.length}
                    </span>
                  </button>
                </div>

                {dashboardTab === "supplies" && (
                  <div className="user-catalog-search">
                    <FiSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search available items..."
                      value={searchQuery}
                      onChange={(event) =>
                        setSearchQuery(event.target.value)
                      }
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        className="clear-search"
                        onClick={() => setSearchQuery("")}
                      >
                        ×
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* SUPPLIES TAB */}
              {dashboardTab === "supplies" && (
                <div className="user-supplies-section">
                  {loading ? (
                    <div className="user-empty-state-box">
                      <div className="loading-spinner" />
                      <p>Loading available supplies...</p>
                    </div>
                  ) : filteredStocks.length === 0 ? (
                    <div className="user-empty-state-box">
                      <FiBox className="empty-state-icon" />
                      <h4>No supplies found</h4>
                      <p>
                        {searchQuery
                          ? `No items match "${searchQuery}".`
                          : "There are currently no available inventory items."}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* SELECTED SUPPLIES PANEL */}
                      {selectedCount > 0 && (
                        <section className="bulk-request-panel">
                          <div className="bulk-request-header">
                            <div>
                              <h3>Selected Supplies</h3>
                              <p>
                                {selectedCount} item(s) selected.
                                Review the quantities before submitting.
                              </p>
                            </div>

                            <button
                              type="button"
                              className="bulk-clear-btn"
                              onClick={clearSelectedItems}
                              disabled={bulkRequesting}
                            >
                              Clear All
                            </button>
                          </div>

                          <div className="bulk-request-list">
                            {Object.entries(selectedItems).map(
                              ([id, entry]) => (
                                <div
                                  className="bulk-request-row"
                                  key={id}
                                >
                                  <div className="bulk-item-info">
                                    {entry.stock.image ? (
                                      <img
                                        src={stockImageUrl(
                                          entry.stock.image
                                        )}
                                        alt={entry.stock.item_name}
                                      />
                                    ) : (
                                      <div className="bulk-item-placeholder">
                                        SPMU
                                      </div>
                                    )}

                                    <div>
                                      <strong>
                                        {entry.stock.item_name}
                                      </strong>
                                      <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "2px 0" }}>
                                        <span
                                          style={{
                                            fontSize: "10.5px",
                                            fontWeight: "600",
                                            padding: "1px 6px",
                                            borderRadius: "8px",
                                            background: entry.stock.item_type === "returnable" ? "#e0e7ff" : "#f1f5f9",
                                            color: entry.stock.item_type === "returnable" ? "#4338ca" : "#64748b",
                                          }}
                                        >
                                          {entry.stock.item_type === "returnable" ? "🔄 Returnable (Must Return)" : "📦 Non-Returnable"}
                                        </span>
                                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                                          Avail: {entry.stock.amount}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bulk-quantity-control">
                                    <label htmlFor={`bulk-qty-${id}`}>
                                      Quantity
                                    </label>
                                    <input
                                      id={`bulk-qty-${id}`}
                                      type="number"
                                      min="1"
                                      max={entry.stock.amount}
                                      step="1"
                                      value={entry.amount}
                                      disabled={bulkRequesting}
                                      onChange={(event) =>
                                        updateSelectedQuantity(
                                          id,
                                          event.target.value
                                        )
                                      }
                                    />
                                  </div>

                                  <button
                                    type="button"
                                    className="bulk-remove-btn"
                                    disabled={bulkRequesting}
                                    onClick={() =>
                                      removeSelectedItem(id)
                                    }
                                    aria-label={`Remove ${entry.stock.item_name}`}
                                    title="Remove item"
                                  >
                                    <FiTrash2 />
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          <div className="bulk-request-footer">
                            <div className="bulk-total">
                              <span>Total units requested</span>
                              <strong>{totalSelectedUnits}</strong>
                            </div>

                            <button
                              type="button"
                              className="bulk-submit-btn"
                              onClick={submitBulkRequest}
                              disabled={
                                bulkRequesting || hasInvalidQuantity
                              }
                            >
                              {bulkRequesting
                                ? "Submitting Request..."
                                : `Submit ${selectedCount} Item(s)`}
                            </button>
                          </div>
                        </section>
                      )}

                      {/* INVENTORY CARDS */}
                      <div className="user-catalog-grid">
                        {filteredStocks.map((stock) => {
                          const isSelected =
                            Boolean(selectedItems[String(stock.id)]);

                          return (
                            <div
                              className="user-catalog-card"
                              key={stock.id}
                              onClick={() =>
                                setSelectedCatalogItem(stock)
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  setSelectedCatalogItem(stock);
                                }
                              }}
                              title="Click to view details"
                            >
                              <div className="catalog-image-box">
                                {stock.image ? (
                                  <img
                                    src={stockImageUrl(stock.image)}
                                    alt={stock.item_name}
                                  />
                                ) : (
                                  <span className="no-image-mark">
                                    SPMU
                                  </span>
                                )}
                                <span className="stock-qty-badge">
                                  {stock.amount} in stock
                                </span>
                              </div>

                              <div className="catalog-card-body">
                                <h4 className="catalog-item-title">
                                  {stock.item_name}
                                </h4>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "4px 0 6px" }}>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontWeight: "600",
                                      padding: "2px 8px",
                                      borderRadius: "12px",
                                      background: stock.item_type === "returnable" ? "#e0e7ff" : "#f1f5f9",
                                      color: stock.item_type === "returnable" ? "#4338ca" : "#64748b",
                                      border: stock.item_type === "returnable" ? "1px solid #c7d2fe" : "1px solid #e2e8f0",
                                    }}
                                  >
                                    {stock.item_type === "returnable" ? "🔄 Returnable (Return Required: Yes)" : "📦 Non-Returnable (Return Required: No)"}
                                  </span>
                                </div>

                                {stock.details && (
                                  <p className="catalog-item-desc">
                                    {stock.details}
                                  </p>
                                )}

                                <div className="catalog-card-footer">
                                  <span className="catalog-view-hint">
                                    View Details →
                                  </span>

                                  <button
                                    type="button"
                                    className={`user-request-action-btn ${
                                      isSelected ? "is-selected" : ""
                                    }`}
                                    disabled={
                                      Number(stock.amount) <= 0 ||
                                      bulkRequesting
                                    }
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      toggleStockSelection(stock);
                                    }}
                                  >
                                    {isSelected ? (
                                      <>
                                        <FiCheck /> Selected
                                      </>
                                    ) : (
                                      <>
                                        <FiCheckCircle /> Add to Request
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* REQUESTS TAB */}
              {dashboardTab === "requests" && (
                <div className="user-requests-section">
                  {selectedRequest ? (
                    <div className="request-detail-view-card">
                      <button
                        type="button"
                        className="back-to-list-btn"
                        onClick={() => setSelectedRequest(null)}
                      >
                        <FiArrowLeft /> Back to all requests
                      </button>

                      <div className="request-detail-grid">
                        <div className="request-detail-preview">
                          <div className="detail-image-frame">
                            {selectedRequest.items?.[0]?.image ||
                            selectedRequest.image ? (
                              <img
                                src={stockImageUrl(
                                  selectedRequest.items?.[0]?.image ||
                                    selectedRequest.image
                                )}
                                alt={
                                  selectedRequest.items?.[0]?.item_name ||
                                  selectedRequest.item_name
                                }
                              />
                            ) : (
                              <span className="detail-no-img">
                                SPMU
                              </span>
                            )}
                          </div>

                          {selectedRequest.claim_code &&
                            String(
                              selectedRequest.status
                            ).toLowerCase() === "approved" && (
                              <div className="claim-code-callout">
                                <span className="callout-label">
                                  Your Claim Code
                                </span>
                                <strong className="callout-code">
                                  {selectedRequest.claim_code}
                                </strong>
                                <small>
                                  Present this code when collecting
                                  your supplies.
                                </small>
                              </div>
                            )}
                        </div>

                        <div className="request-detail-info-pane">
                          <div className="detail-header-row">
                            <h3>
                              {selectedRequest.items?.length > 1
                                ? `${selectedRequest.items.length} requested supplies`
                                : selectedRequest.item_name ||
                                  "Supply Request"}
                            </h3>
                            <span
                              className={`status-pill pill-${String(
                                selectedRequest.status || ""
                              ).toLowerCase()}`}
                            >
                              {selectedRequest.status}
                            </span>
                          </div>

                          <div className="detail-meta-table">
                            <div className="meta-box">
                              <span>Quantity Requested</span>
                              <strong>
                                {selectedRequest.total_amount ??
                                  selectedRequest.amount}
                              </strong>
                            </div>

                            <div className="meta-box">
                              <span>Date Requested</span>
                              <strong>
                                {selectedRequest.created_at
                                  ? new Date(
                                      selectedRequest.created_at
                                    ).toLocaleDateString()
                                  : "Today"}
                              </strong>
                            </div>

                            <div className="meta-box">
                              <span>Request ID</span>
                              <strong>
                                #
                                {selectedRequest.request_group_id ||
                                  selectedRequest.id}
                              </strong>
                            </div>
                          </div>

                          {selectedRequest.items?.length > 0 && (
                            <div className="user-request-detail-items">
                              <h4>Requested supplies</h4>
                              <div className="user-request-detail-item-list">
                                {selectedRequest.items.map((item, index) => (
                                  <div
                                    className="user-request-detail-item"
                                    key={item.id ?? `${item.item_name}-${index}`}
                                  >
                                    <div className="user-request-detail-item-image">
                                      {item.image ? (
                                        <img
                                          src={stockImageUrl(item.image)}
                                          alt=""
                                        />
                                      ) : (
                                        <FiBox aria-hidden="true" />
                                      )}
                                    </div>
                                    <div className="user-request-detail-item-copy">
                                      <strong>{item.item_name}</strong>
                                      <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "2px 0" }}>
                                        <span
                                          style={{
                                            fontSize: "10.5px",
                                            fontWeight: "600",
                                            padding: "1px 6px",
                                            borderRadius: "8px",
                                            background: item.item_type === "returnable" ? "#e0e7ff" : "#f1f5f9",
                                            color: item.item_type === "returnable" ? "#4338ca" : "#64748b",
                                          }}
                                        >
                                          {item.item_type === "returnable" ? "🔄 Returnable" : "📦 Non-Returnable"}
                                        </span>
                                        <span>Quantity: {item.amount}</span>
                                      </div>
                                      {item.item_type === "returnable" && item.expected_return_date && (
                                        <small style={{ color: "#4338ca", fontWeight: "500", display: "block" }}>
                                          Expected Return: {item.expected_return_date}
                                        </small>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="status-timeline-wrapper">
                            <h4>Request Lifecycle</h4>
                            <div className="timeline-steps">
                              {getRequestProgress(
                                selectedRequest.status
                              ).map((step, index) => (
                                <div
                                  key={step.label}
                                  className={`timeline-step ${
                                    step.done ? "is-completed" : ""
                                  }`}
                                >
                                  <div className="timeline-node">
                                    {step.done ? (
                                      <FiCheck />
                                    ) : (
                                      index + 1
                                    )}
                                  </div>
                                  <span className="timeline-title">
                                    {step.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="requests-filter-row">
                        <div className="filter-chips">
                          {[
                            ["all", "All Requests"],
                            ["pending", "Pending"],
                            ["approved", "Approved / Ready"],
                            ["completed", "Completed"],
                          ].map(([key, label]) => (
                            <button
                              type="button"
                              key={key}
                              className={`filter-chip ${
                                requestStatusFilter === key
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() =>
                                setRequestStatusFilter(key)
                              }
                            >
                              {label}
                            </button>
                          ))}
                        </div>

                        <span className="requests-count-text">
                          Showing {filteredRequests.length} request(s)
                        </span>
                      </div>

                      {filteredRequests.length === 0 ? (
                        <div className="user-empty-state-box">
                          <FiClock className="empty-state-icon" />
                          <h4>No requests found</h4>
                          <p>
                            You have no requests in this category yet.
                          </p>
                          <button
                            type="button"
                            className="primary-button-sm"
                            onClick={() => setDashboardTab("supplies")}
                          >
                            Browse Supplies
                          </button>
                        </div>
                      ) : (
                        <div className="requests-card-grid">
                          {filteredRequests.map((request) => (
                            <div
                              key={request.id}
                              className="user-request-item-card"
                              onClick={() =>
                                setSelectedRequest(request)
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  setSelectedRequest(request);
                                }
                              }}
                            >
                              <div className="req-card-img">
                                {request.items?.[0]?.image || request.image ? (
                                  <img
                                    src={stockImageUrl(
                                      request.items?.[0]?.image ||
                                        request.image
                                    )}
                                    alt={request.item_name}
                                  />
                                ) : (
                                  <span>SPMU</span>
                                )}
                              </div>

                              <div className="req-card-body">
                                <div className="req-card-top">
                                  <h4>
                                    {request.item_name ||
                                      "Supply Request"}
                                  </h4>
                                  <span
                                    className={`status-pill pill-${String(
                                      request.status || ""
                                    ).toLowerCase()}`}
                                  >
                                    {request.status}
                                  </span>
                                </div>

                                <p className="req-card-amount">
                                  Quantity:{" "}
                                  <strong>
                                    {request.total_amount ?? request.amount}
                                  </strong>
                                </p>

                                {request.items?.length > 1 && (
                                  <div className="req-card-items">
                                    {request.items.map((item, index) => (
                                      <span
                                        key={
                                          item.id ??
                                          `${item.item_name}-${index}`
                                        }
                                      >
                                        {item.item_name} × {item.amount}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {request.claim_code &&
                                  String(
                                    request.status
                                  ).toLowerCase() === "approved" && (
                                    <div className="req-claim-preview">
                                      <span>Claim Code:</span>
                                      <strong>
                                        {request.claim_code}
                                      </strong>
                                    </div>
                                  )}

                                <div className="req-card-foot">
                                  <small>
                                    {request.created_at
                                      ? new Date(
                                          request.created_at
                                        ).toLocaleDateString()
                                      : "Recent"}
                                  </small>
                                  <span className="view-link">
                                    View details <FiChevronRight />
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PROFILE */}
          {activeNav === "profile" && (
            <div className="user-profile-view">
              <div className="profile-hero-card">
                <div className="profile-hero-main">
                  <div className="profile-large-avatar">
                    {userInitial}
                  </div>
                  <div className="profile-hero-titles">
                    <h2>{user?.name || "User Account"}</h2>
                    <p>{user?.email || "No email registered"}</p>
                    <div className="profile-badges-row">
                      <span className="badge-role">
                        <FiShield /> Authorized Requester
                      </span>
                      <span className="badge-status">
                        <FiCheckCircle /> Active Account
                      </span>
                    </div>
                  </div>
                </div>

                {!isEditingProfile && (
                  <button
                    type="button"
                    className="edit-profile-trigger-btn"
                    onClick={() => {
                      setIsEditingProfile(true);
                      setProfileError("");
                      setProfileSuccess("");
                      setProfileName(user?.name || "");
                      setProfileEmail(user?.email || "");
                    }}
                  >
                    <FiEdit2 /> Edit Profile
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                <div className="profile-sections-grid">
                  <div className="profile-box">
                    <div className="profile-box-header">
                      <h3>Account Information</h3>
                      <p>Your official account details</p>
                    </div>

                    <div className="profile-info-list">
                      <div className="info-row">
                        <span className="info-label">Full Name</span>
                        <strong className="info-val">
                          {user?.name || "—"}
                        </strong>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Email / Account</span>
                        <strong className="info-val">
                          {user?.email || "—"}
                        </strong>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Account Role</span>
                        <strong className="info-val">
                          {user?.role || "user"}
                        </strong>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Password</span>
                        <strong className="info-val">
                          ••••••••••••
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="profile-box">
                    <div className="profile-box-header">
                      <h3>Activity Summary</h3>
                      <p>Your supply request history</p>
                    </div>

                    <div className="profile-stats-list">
                      <div className="stat-row">
                        <span>Total Requests</span>
                        <strong>{groupedMyRequests.length}</strong>
                      </div>
                      <div className="stat-row">
                        <span>Items Claimed / Received</span>
                        <strong>{completedCount}</strong>
                      </div>
                      <div className="stat-row">
                        <span>Active Unclaimed Items</span>
                        <strong>{approvedCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="profile-edit-card">
                  <div className="edit-card-header">
                    <h3>Edit Account Information</h3>
                    <p>
                      Update your name, email, or password.
                    </p>
                  </div>

                  {profileError && (
                    <div className="profile-alert alert-error">
                      {profileError}
                    </div>
                  )}

                  {profileSuccess && (
                    <div className="profile-alert alert-success">
                      {profileSuccess}
                    </div>
                  )}

                  <form
                    className="profile-edit-form"
                    onSubmit={handleSaveProfile}
                  >
                    <div className="form-group-section">
                      <h4>Personal Details</h4>
                      <div className="form-row">
                        <div className="input-group">
                          <input
                            type="text"
                            id="profName"
                            placeholder=" "
                            required
                            value={profileName}
                            onChange={(event) =>
                              setProfileName(event.target.value)
                            }
                          />
                          <label htmlFor="profName">Full Name</label>
                        </div>

                        <div className="input-group">
                          <input
                            type="email"
                            id="profEmail"
                            placeholder=" "
                            required
                            value={profileEmail}
                            onChange={(event) =>
                              setProfileEmail(event.target.value)
                            }
                          />
                          <label htmlFor="profEmail">
                            Email / Account ID
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group-section">
                      <h4><FiKey /> Change Password (Optional)</h4>
                      <p className="section-note">
                        Leave these fields blank if you do not want
                        to change your password.
                      </p>

                      <div className="form-row password-row">
                        <div className="input-group">
                          <input
                            type="password"
                            id="currentPass"
                            placeholder=" "
                            value={currentPassword}
                            onChange={(event) =>
                              setCurrentPassword(event.target.value)
                            }
                          />
                          <label htmlFor="currentPass">
                            Current Password
                          </label>
                        </div>

                        <div className="input-group">
                          <input
                            type="password"
                            id="newPass"
                            placeholder=" "
                            value={newPassword}
                            onChange={(event) =>
                              setNewPassword(event.target.value)
                            }
                          />
                          <label htmlFor="newPass">
                            New Password
                          </label>
                        </div>

                        <div className="input-group">
                          <input
                            type="password"
                            id="confirmPass"
                            placeholder=" "
                            value={confirmPassword}
                            onChange={(event) =>
                              setConfirmPassword(event.target.value)
                            }
                          />
                          <label htmlFor="confirmPass">
                            Confirm New Password
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-actions-bar">
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfileError("");
                          setProfileSuccess("");
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="btn-save"
                        disabled={profileUpdating}
                      >
                        {profileUpdating
                          ? "Saving Changes..."
                          : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* CATALOG ITEM DETAILS */}
      {selectedCatalogItem && (
        <div
          className="catalog-detail-overlay"
          onClick={() => setSelectedCatalogItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Supply details"
        >
          <div
            className="catalog-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="catalog-detail-close"
              onClick={() => setSelectedCatalogItem(null)}
              aria-label="Close"
            >
              <FiX />
            </button>

            <div className="catalog-detail-image-wrap">
              {selectedCatalogItem.image ? (
                <img
                  src={stockImageUrl(selectedCatalogItem.image)}
                  alt={selectedCatalogItem.item_name}
                  className="catalog-detail-img"
                />
              ) : (
                <div className="catalog-detail-no-img">SPMU</div>
              )}

              <span className="catalog-detail-qty-badge">
                {selectedCatalogItem.amount} in stock
              </span>
            </div>

            <div className="catalog-detail-info">
              <span className="catalog-detail-tag">
                Inventory Supply
              </span>

              <h2 className="catalog-detail-title">
                {selectedCatalogItem.item_name}
              </h2>

              <p
                className={`catalog-detail-desc ${
                  !selectedCatalogItem.details
                    ? "catalog-detail-no-desc"
                    : ""
                }`}
              >
                {selectedCatalogItem.details ||
                  "No description provided."}
              </p>

              <div className="catalog-detail-meta-row">
                <div className="catalog-detail-meta-box">
                  <span>Available Units</span>
                  <strong>{selectedCatalogItem.amount}</strong>
                </div>

                <div className="catalog-detail-meta-box">
                  <span>Item ID</span>
                  <strong>#{selectedCatalogItem.id}</strong>
                </div>

                <div className="catalog-detail-meta-box">
                  <span>Status</span>
                  <strong
                    style={{
                      color:
                        Number(selectedCatalogItem.amount) > 0
                          ? "#22c55e"
                          : "#ef4444",
                    }}
                  >
                    {Number(selectedCatalogItem.amount) > 0
                      ? "Available"
                      : "Out of Stock"}
                  </strong>
                </div>

                <div
                  className="catalog-detail-meta-box"
                  style={{
                    gridColumn: "span 3",
                    background:
                      selectedCatalogItem.item_type === "returnable"
                        ? "#f0f4ff"
                        : "#f8fafc",
                    border:
                      selectedCatalogItem.item_type === "returnable"
                        ? "1px solid #c7d2fe"
                        : "1px solid #e2e8f0",
                  }}
                >
                  <span style={{ color: "#475569" }}>Item Classification & Return Policy</span>
                  <div style={{ marginTop: "4px" }}>
                    <strong style={{ color: selectedCatalogItem.item_type === "returnable" ? "#3730a3" : "#334155", fontSize: "14px" }}>
                      {selectedCatalogItem.item_type === "returnable" ? "🔄 Returnable Equipment" : "📦 Non-Returnable Consumable"}
                    </strong>
                    <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b" }}>
                      {selectedCatalogItem.item_type === "returnable"
                        ? "Return Required: Yes · Equipment is borrowed for temporary use and must be returned in good condition."
                        : "Return Required: No · Consumable supply that does not need to be returned once issued."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="catalog-detail-actions">
                <button
                  type="button"
                  className="catalog-detail-cancel-btn"
                  onClick={() => setSelectedCatalogItem(null)}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="catalog-detail-request-btn"
                  disabled={
                    Number(selectedCatalogItem.amount) <= 0 ||
                    bulkRequesting
                  }
                  onClick={() => {
                    toggleStockSelection(selectedCatalogItem);
                    setSelectedCatalogItem(null);
                  }}
                >
                  {Number(selectedCatalogItem.amount) <= 0
                    ? "Out of Stock"
                    : selectedItems[
                        String(selectedCatalogItem.id)
                      ]
                      ? "Remove from Request"
                      : "Add to Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPage;
