import { useEffect, useMemo, useState } from "react";

function UserOverviewPage({ page }) {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'approved', 'pending'
  const [activeTab, setActiveTab] = useState("receipts"); // 'receipts', 'all-requests', 'pending', 'approved'
  const [viewReceiptModal, setViewReceiptModal] = useState(null);

  useEffect(() => {
    fetchUsersOverview();
  }, []);

  const fetchUsersOverview = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost/smplDB/get_all_users_overview.php",
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to load user overview data.");
      }

      // Filter out admin users: ONLY keep user role accounts
      const onlyRegularUsers = (data.users || []).filter(
        (u) => String(u.role || "").toLowerCase() !== "admin"
      );

      setUsers(onlyRegularUsers);
      setRequests(data.requests || []);
    } catch (err) {
      console.error("User overview error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group requests and count per user
  const userStatsMap = useMemo(() => {
    const stats = {};

    users.forEach((u) => {
      stats[u.id] = {
        total: 0,
        completed: 0,
        pending: 0,
        approved: 0,
        cancelled: 0,
        other: 0,
      };
    });

    requests.forEach((req) => {
      const uId = req.user_id;
      if (!stats[uId]) {
        stats[uId] = {
          total: 0,
          completed: 0,
          pending: 0,
          approved: 0,
          cancelled: 0,
          other: 0,
        };
      }

      stats[uId].total += 1;
      const statusUpper = String(req.status || "").toUpperCase().trim();

      if (statusUpper === "COMPLETED") {
        stats[uId].completed += 1;
      } else if (statusUpper === "PENDING") {
        stats[uId].pending += 1;
      } else if (statusUpper === "APPROVED") {
        stats[uId].approved += 1;
      } else if (statusUpper === "CANCELLED" || statusUpper === "REJECTED") {
        stats[uId].cancelled += 1;
      } else {
        stats[uId].other += 1;
      }
    });

    return stats;
  }, [users, requests]);

  // Filtered users list (Only user roles, matching search and status)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(u.id).includes(searchQuery);

      const matchStatus =
        statusFilter === "all" ||
        String(u.status).toLowerCase() === statusFilter.toLowerCase();

      return matchSearch && matchStatus;
    });
  }, [users, searchQuery, statusFilter]);

  // Selected User Object
  const selectedUser = useMemo(() => {
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Selected User Requests
  const selectedUserRequests = useMemo(() => {
    if (!selectedUserId) return [];
    return requests.filter((r) => r.user_id === selectedUserId);
  }, [requests, selectedUserId]);

  // Selected User Receipts / Transactions (Completed requests)
  const selectedUserReceipts = useMemo(() => {
    return selectedUserRequests.filter(
      (r) => String(r.status).toUpperCase().trim() === "COMPLETED"
    );
  }, [selectedUserRequests]);

  // Selected User Pending
  const selectedUserPending = useMemo(() => {
    return selectedUserRequests.filter(
      (r) => String(r.status).toUpperCase().trim() === "PENDING"
    );
  }, [selectedUserRequests]);

  // Selected User Approved (Ready to Claim)
  const selectedUserApproved = useMemo(() => {
    return selectedUserRequests.filter(
      (r) => String(r.status).toUpperCase().trim() === "APPROVED"
    );
  }, [selectedUserRequests]);

  const selectedStats = selectedUserId
    ? userStatsMap[selectedUserId] || {
        total: 0,
        completed: 0,
        pending: 0,
        approved: 0,
      }
    : { total: 0, completed: 0, pending: 0, approved: 0 };

  return (
    <>
      {/* Receipt Details Modal */}
      {viewReceiptModal && (
        <div
          className="supplier-modal-overlay"
          onClick={() => setViewReceiptModal(null)}
        >
          <div
            className="supplier-modal user-receipt-modal formal-receipt-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="supplier-modal-header formal-modal-header no-print">
              <div>
                <h2>Official Supply Issuance Receipt</h2>
                <p>Transaction #{String(viewReceiptModal.id).padStart(6, "0")} • Formal Inventory Voucher</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  className="formal-print-btn"
                  onClick={() => window.print()}
                >
                  🖨️ Print Receipt
                </button>
                <button
                  type="button"
                  className="supplier-modal-close"
                  onClick={() => setViewReceiptModal(null)}
                  title="Close receipt"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Scrollable Receipt Body */}
            <div className="formal-receipt-scroll-container">
              <div className="formal-receipt-paper" id="printable-receipt-slip">
                {/* Formal Organization Header */}
                <div className="formal-receipt-letterhead">
                  <div className="formal-seal-icon">🏛️</div>
                  <div className="formal-letterhead-text">
                    <span className="formal-agency">SPMU • SUPPLY & PROPERTY MANAGEMENT UNIT</span>
                    <h1 className="formal-doc-title">OFFICIAL PROPERTY & SUPPLY ISSUANCE SLIP</h1>
                    <span className="formal-doc-sub">Property Custodianship & Supply Release Voucher</span>
                  </div>
                </div>

                <div className="formal-divider-double" />

                {/* Voucher Meta Info Bar */}
                <div className="formal-meta-band">
                  <div className="formal-meta-col">
                    <span className="formal-label">Voucher / Receipt No:</span>
                    <strong className="formal-val">REC-{String(viewReceiptModal.id).padStart(6, "0")}</strong>
                  </div>
                  <div className="formal-meta-col">
                    <span className="formal-label">Transaction Date:</span>
                    <span className="formal-val">
                      {viewReceiptModal.claimed_at
                        ? new Date(viewReceiptModal.claimed_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : new Date().toLocaleDateString()}
                    </span>
                  </div>
                  <div className="formal-meta-col">
                    <span className="formal-label">Status:</span>
                    <span className="formal-val-badge">OFFICIALLY RELEASED</span>
                  </div>
                </div>

                {/* Section 1: Borrower / Requestor Profile */}
                <div className="formal-section-box">
                  <div className="formal-section-title">I. RECIPIENT & BORROWER DETAILS</div>
                  <div className="formal-info-grid">
                    <div className="formal-info-cell">
                      <span className="formal-label">Requisitioned By:</span>
                      <strong>{selectedUser?.name || "Registered User"}</strong>
                    </div>
                    <div className="formal-info-cell">
                      <span className="formal-label">Email / ID:</span>
                      <span>{selectedUser?.email || "—"}</span>
                    </div>
                    <div className="formal-info-cell">
                      <span className="formal-label">Authorized Receiver:</span>
                      <strong>{viewReceiptModal.received_by || selectedUser?.name || "—"}</strong>
                    </div>
                    <div className="formal-info-cell">
                      <span className="formal-label">Request Submission Date:</span>
                      <span>
                        {viewReceiptModal.created_at
                          ? new Date(viewReceiptModal.created_at).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Items & Property Particulars */}
                <div className="formal-section-box">
                  <div className="formal-section-title">II. PARTICULARS OF SUPPLIES / ASSETS ISSUED</div>
                  <table className="formal-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: "60px" }}>Item #</th>
                        <th>Description / Specification</th>
                        <th style={{ width: "120px" }}>Classification</th>
                        <th style={{ width: "90px", textAlign: "right" }}>Quantity</th>
                        <th style={{ width: "120px", textAlign: "center" }}>Unit Condition</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ textAlign: "center" }}>1</td>
                        <td>
                          <strong>{viewReceiptModal.item_name}</strong>
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                            Stock Ref #{viewReceiptModal.stock_id || viewReceiptModal.id}
                          </div>
                        </td>
                        <td>
                          <span
                            className={
                              viewReceiptModal.item_type === "returnable"
                                ? "formal-pill-returnable"
                                : "formal-pill-consumable"
                            }
                          >
                            {viewReceiptModal.item_type === "returnable"
                              ? "Returnable Asset"
                              : "Consumable Supply"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>
                          {viewReceiptModal.amount} unit(s)
                        </td>
                        <td style={{ textAlign: "center" }}>Good / Serviceable</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Return Deadline Note if returnable */}
                  {viewReceiptModal.item_type === "returnable" && viewReceiptModal.expected_return_date && (
                    <div className="formal-return-notice">
                      <strong>⏰ EXPECTED RETURN DEADLINE:</strong>{" "}
                      {new Date(viewReceiptModal.expected_return_date).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#854d0e" }}>
                        Equipment must be surrendered back to the SPMU stockroom on or before the indicated schedule in good operational condition.
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 3: Official Release Verification */}
                <div className="formal-section-box">
                  <div className="formal-section-title">III. DISPATCH & RELEASE AUDIT LOG</div>
                  <div className="formal-info-grid">
                    <div className="formal-info-cell">
                      <span className="formal-label">Actual Release Timestamp:</span>
                      <span>
                        {viewReceiptModal.claimed_at
                          ? new Date(viewReceiptModal.claimed_at).toLocaleString()
                          : "—"}
                      </span>
                    </div>
                    <div className="formal-info-cell">
                      <span className="formal-label">Dispatching Authority:</span>
                      <span>SPMU Property Custodian / Admin Desk</span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Proof of Claim / Document Attachment */}
                {viewReceiptModal.claim_document && (
                  <div className="formal-section-box formal-proof-box">
                    <div className="formal-section-title">IV. ATTACHED PROOF OF CLAIM / REQUISITION SLIP</div>
                    <div className="formal-doc-wrapper">
                      {viewReceiptModal.claim_document.toLowerCase().endsWith(".pdf") ? (
                        <div className="formal-pdf-chip">
                          <span style={{ fontSize: "20px" }}>📄</span>
                          <div>
                            <strong>Official PDF Document:</strong>
                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#475569" }}>
                              {viewReceiptModal.claim_document}
                            </p>
                          </div>
                          <a
                            href={`http://localhost/smplDB/uploads/claims/${viewReceiptModal.claim_document}`}
                            target="_blank"
                            rel="noreferrer"
                            className="formal-doc-link-btn no-print"
                          >
                            Open Attached PDF ↗
                          </a>
                        </div>
                      ) : (
                        <div className="formal-img-preview-box">
                          <img
                            src={`http://localhost/smplDB/uploads/claims/${viewReceiptModal.claim_document}`}
                            alt="Claim Document Proof"
                            className="formal-claim-doc-img"
                          />
                          <p className="no-print" style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                            Verified attachment submitted during item claim.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 5: Formal Signatures & Acknowledgement */}
                <div className="formal-signatures-container">
                  <div className="formal-signature-block">
                    <div className="formal-sig-line" />
                    <strong className="formal-sig-name">
                      {viewReceiptModal.received_by || selectedUser?.name || "Recipient"}
                    </strong>
                    <span className="formal-sig-role">Received & Acknowledged By (Signature over Printed Name)</span>
                  </div>

                  <div className="formal-signature-block">
                    <div className="formal-sig-line" />
                    <strong className="formal-sig-name">Property Custodian / Admin</strong>
                    <span className="formal-sig-role">Issued & Verified By (SPMU Staff)</span>
                  </div>
                </div>

                {/* Institutional Footer */}
                <div className="formal-receipt-footer">
                  <p>This is a computer-generated official receipt voucher from the SPMU Supply & Property Management System.</p>
                  <span>Printed on {new Date().toLocaleString()} • Keep this voucher for inventory auditing purposes.</span>
                </div>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="formal-modal-actions no-print">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setViewReceiptModal(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => window.print()}
              >
                🖨️ Print Formal Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">{page?.eyebrow || "User Activity & Directory"}</p>
          <h1>
            {selectedUser
              ? `${selectedUser.name}'s Profile & Receipts`
              : page?.title || "Users & Receipts"}
          </h1>
          <p className="page-description">
            {selectedUser
              ? `Viewing complete transactions, receipts, and request counts for ${selectedUser.name}.`
              : "Browse registered users, click on any user to view their detailed transaction receipts and request breakdown."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          {selectedUser && (
            <button
              className="supplier-modal-cancel"
              onClick={() => setSelectedUserId(null)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              ← Back to Users List
            </button>
          )}

          <button
            className="primary-button"
            onClick={fetchUsersOverview}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>↻</span> {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {loading && users.length === 0 ? (
        <div className="page-panel" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="spinner-loader" style={{ margin: "0 auto 16px" }}></div>
          <p style={{ color: "#64748b", fontSize: "15px" }}>Loading users and transaction records...</p>
        </div>
      ) : error ? (
        <div className="page-panel">
          <div className="error-message" style={{ margin: 0 }}>
            <p>Error: {error}</p>
            <button
              onClick={fetchUsersOverview}
              className="primary-button"
              style={{ marginTop: 12 }}
            >
              Retry
            </button>
          </div>
        </div>
      ) : selectedUser ? (
        /* =========================================================================
           INDIVIDUAL USER PAGE VIEW (Appears when a user is clicked)
           ========================================================================= */
        <div className="user-details-fullpage">
          {/* Breadcrumb Bar */}
          <div className="user-page-breadcrumb">
            <button
              className="breadcrumb-back-btn"
              onClick={() => setSelectedUserId(null)}
            >
              ← All Users
            </button>
            <span className="breadcrumb-divider">/</span>
            <span className="breadcrumb-current">{selectedUser.name}</span>
          </div>

          {/* User Profile Summary Card */}
          <div className="user-fullpage-header-card">
            <div className="selected-user-main">
              <div className="selected-user-avatar">
                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="selected-user-meta">
                <h2>{selectedUser.name}</h2>
                <div className="selected-user-sub">
                  <span>✉ {selectedUser.email}</span>
                  <span>•</span>
                  <span className={`status-tag status-${selectedUser.status}`}>
                    {selectedUser.status?.toUpperCase() || "APPROVED"}
                  </span>
                  <span>•</span>
                  <span className="id-tag">User ID: #{selectedUser.id}</span>
                </div>
              </div>
            </div>

            {/* 4 Key Metric Stat Boxes */}
            <div className="selected-user-stats-strip">
              <div className="stat-box" onClick={() => setActiveTab("all-requests")} style={{ cursor: "pointer" }}>
                <span className="stat-label" style={{color: 'red'}}>Total Requests</span>
                <strong className="stat-num">{selectedStats.total}</strong>
                <span className="stat-subtext">All submitted</span>
              </div>
              <div className="stat-box completed" onClick={() => setActiveTab("receipts")} style={{ cursor: "pointer" }}>
                <span className="stat-label">Completed Receipts</span>
                <strong className="stat-num">{selectedStats.completed}</strong>
                <span className="stat-subtext">Claimed & released</span>
              </div>
              <div className="stat-box pending" onClick={() => setActiveTab("pending")} style={{ cursor: "pointer" }}>
                <span className="stat-label">Pending Requests</span>
                <strong className="stat-num">{selectedStats.pending}</strong>
                <span className="stat-subtext">Awaiting admin</span>
              </div>
              <div className="stat-box approved" onClick={() => setActiveTab("approved")} style={{ cursor: "pointer" }}>
                <span className="stat-label">Approved (Claimable)</span>
                <strong className="stat-num">{selectedStats.approved}</strong>
                <span className="stat-subtext">Awaiting user pickup</span>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="user-tabs-navigation">
            <button
              className={`user-tab-btn ${activeTab === "receipts" ? "active" : ""}`}
              onClick={() => setActiveTab("receipts")}
            >
              🧾 Transaction Receipts ({selectedUserReceipts.length})
            </button>
            <button
              className={`user-tab-btn ${activeTab === "all-requests" ? "active" : ""}`}
              onClick={() => setActiveTab("all-requests")}
            >
              📂 All Requests ({selectedUserRequests.length})
            </button>
            <button
              className={`user-tab-btn ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => setActiveTab("pending")}
            >
              ⏳ Pending Requests ({selectedUserPending.length})
            </button>
            <button
              className={`user-tab-btn ${activeTab === "approved" ? "active" : ""}`}
              onClick={() => setActiveTab("approved")}
            >
              ✓ Approved / Claimable ({selectedUserApproved.length})
            </button>
          </div>

          {/* TAB CONTENT: Receipts */}
          {activeTab === "receipts" && (
            <div className="user-tab-content-panel">
              <div className="tab-body-intro">
                <div>
                  <h3>Transaction Receipts</h3>
                  <p>All completed supply releases and official claim receipts for {selectedUser.name}.</p>
                </div>
                <span className="receipt-count-pill">
                  {selectedUserReceipts.length} Receipt(s)
                </span>
              </div>

              {selectedUserReceipts.length === 0 ? (
                <div className="empty-tab-state">
                  <div className="empty-icon">🧾</div>
                  <h4>No Transaction Receipts Found</h4>
                  <p>
                    This user does not have any completed item claims yet. Once an approved request is verified with its claim code and released, the receipt will show up here.
                  </p>
                </div>
              ) : (
                <div className="receipts-grid-list">
                  {selectedUserReceipts.map((rcpt) => (
                    <div key={rcpt.id} className="receipt-card-item">
                      <div className="receipt-card-top">
                        <div className="receipt-number">
                          #{String(rcpt.id).padStart(6, "0")}
                        </div>
                        <span className="badge-completed">COMPLETED</span>
                      </div>

                      <div className="receipt-item-info">
                        <h4 className="receipt-item-name">{rcpt.item_name}</h4>
                        <p className="receipt-qty-text">
                          Quantity: <strong>{rcpt.amount} unit(s)</strong>
                        </p>
                      </div>

                      <div className="receipt-meta-rows">
                        <div className="receipt-meta-row">
                          <span className="meta-key">Received By:</span>
                          <span className="meta-val">{rcpt.received_by || "—"}</span>
                        </div>
                        <div className="receipt-meta-row">
                          <span className="meta-key">Date Claimed:</span>
                          <span className="meta-val">
                            {rcpt.claimed_at
                              ? new Date(rcpt.claimed_at).toLocaleDateString()
                              : "—"}
                          </span>
                        </div>
                      </div>

                      <div className="receipt-card-actions">
                        <button
                          className="view-receipt-action-btn"
                          onClick={() => setViewReceiptModal(rcpt)}
                        >
                          View Official Receipt & Proof ↗
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: All Requests */}
          {activeTab === "all-requests" && (
            <div className="user-tab-content-panel">
              <div className="tab-body-intro">
                <div>
                  <h3>All Requests by {selectedUser.name}</h3>
                  <p>Complete chronology of requested stock items.</p>
                </div>
              </div>

              {selectedUserRequests.length === 0 ? (
                <div className="empty-tab-state">
                  <div className="empty-icon">📦</div>
                  <h4>No Requests Recorded</h4>
                  <p>This user hasn't submitted any supply requests yet.</p>
                </div>
              ) : (
                <div className="requests-table-wrapper">
                  <table className="user-requests-table">
                    <thead>
                      <tr>
                        <th>Req ID</th>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Status</th>
                        <th>Date Requested</th>
                        <th>Receipt / Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUserRequests.map((req) => {
                        const st = String(req.status || "").toUpperCase();
                        return (
                          <tr key={req.id}>
                            <td>#{String(req.id).padStart(5, "0")}</td>
                            <td>
                              <strong>{req.item_name}</strong>
                            </td>
                            <td>{req.amount}</td>
                            <td>
                              <span
                                className={`table-status-badge status-${st.toLowerCase()}`}
                              >
                                {st}
                              </span>
                            </td>
                            <td>
                              {req.created_at
                                ? new Date(req.created_at).toLocaleString()
                                : "—"}
                            </td>
                            <td>
                              {st === "COMPLETED" ? (
                                <button
                                  className="table-action-receipt-btn"
                                  onClick={() => setViewReceiptModal(req)}
                                >
                                  View Receipt
                                </button>
                              ) : (
                                <span className="no-receipt-label">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: Pending Requests */}
          {activeTab === "pending" && (
            <div className="user-tab-content-panel">
              <div className="tab-body-intro">
                <div>
                  <h3>Pending Requests</h3>
                  <p>Supply requests awaiting admin review or approval.</p>
                </div>
              </div>

              {selectedUserPending.length === 0 ? (
                <div className="empty-tab-state">
                  <div className="empty-icon">✓</div>
                  <h4>No Pending Requests</h4>
                  <p>All requests from {selectedUser.name} have been processed!</p>
                </div>
              ) : (
                <div className="pending-cards-grid">
                  {selectedUserPending.map((req) => (
                    <div key={req.id} className="pending-req-card">
                      <div className="pending-header">
                        <span className="badge-pending">PENDING APPROVAL</span>
                        <span className="req-time">
                          {req.created_at ? new Date(req.created_at).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <h4>{req.item_name}</h4>
                      <p className="pending-amount">
                        Requested Units: <strong>{req.amount}</strong>
                      </p>
                      <span className="pending-hint">
                        Go to the Requests page to approve or decline this request.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: Approved / Claimable */}
          {activeTab === "approved" && (
            <div className="user-tab-content-panel">
              <div className="tab-body-intro">
                <div>
                  <h3>Approved Requests (Ready for Claim)</h3>
                  <p>Items approved by admin awaiting pickup at the stockroom.</p>
                </div>
              </div>

              {selectedUserApproved.length === 0 ? (
                <div className="empty-tab-state">
                  <div className="empty-icon">📦</div>
                  <h4>No Approved Items</h4>
                  <p>There are no approved items waiting to be claimed right now.</p>
                </div>
              ) : (
                <div className="approved-cards-grid">
                  {selectedUserApproved.map((req) => (
                    <div key={req.id} className="approved-req-card">
                      <div className="approved-badge">READY TO CLAIM</div>
                      <h4>{req.item_name}</h4>
                      <p>Quantity: <strong>{req.amount}</strong></p>
                      <div className="claim-code-display" style={{ background: "#f8fafc", color: "#64748b" }}>
                        <span>Claim Code:</span>
                        <code style={{ letterSpacing: "2px", color: "#64748b" }}>••••••••</code>
                      </div>
                      <p className="approved-hint">
                        Claim code is held privately by the user. User must present their code upon pickup.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* =========================================================================
           USERS INLIST VIEW (Full-width clean table of all non-admin users)
           ========================================================================= */
        <div className="page-panel">
          <div className="users-list-panel-full">
            {/* Control Bar: Search & Status Filter */}
            <div className="users-table-controls">
              <div className="user-search-box fullwidth">
                <input
                  type="text"
                  placeholder="Search user by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="clear-search-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="users-filter-group">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="user-status-select"
                >
                  <option value="all">All Accounts ({users.length})</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                </select>
                <span className="results-count">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {/* Inlist Table */}
            {filteredUsers.length === 0 ? (
              <div className="empty-tab-state" style={{ margin: "20px 0" }}>
                <div className="empty-icon">👥</div>
                <h4>No users found</h4>
                <p>No user accounts matched your search criteria.</p>
              </div>
            ) : (
              <div className="users-table-wrapper">
                <table className="users-inlist-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Account Status</th>
                      <th style={{ textAlign: "center" }}>Total Requests</th>
                      <th style={{ textAlign: "center" }}>Completed</th>
                      <th style={{ textAlign: "center" }}>Pending</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const stat = userStatsMap[u.id] || {
                        total: 0,
                        completed: 0,
                        pending: 0,
                        approved: 0,
                      };

                      return (
                        <tr
                          key={u.id}
                          className="user-inlist-row"
                          onClick={() => {
                            setSelectedUserId(u.id);
                            setActiveTab("receipts");
                          }}
                        >
                          <td>
                            <div className="user-inlist-name-col">
                              <div className="user-inlist-avatar">
                                {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div>
                                <strong className="user-name-text">{u.name}</strong>
                                <span className="user-id-sub">ID: #{u.id}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="user-email-text">{u.email}</span>
                          </td>

                          <td>
                            <span className={`status-tag status-${u.status}`}>
                              {u.status?.toUpperCase() || "APPROVED"}
                            </span>
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <span className="inlist-metric-badge metric-total">
                              {stat.total}
                            </span>
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <span className="inlist-metric-badge metric-completed">
                              ✓ {stat.completed}
                            </span>
                          </td>

                          <td style={{ textAlign: "center" }}>
                            <span className="inlist-metric-badge metric-pending">
                              ⏳ {stat.pending}
                            </span>
                          </td>

                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="view-user-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserId(u.id);
                                setActiveTab("receipts");
                              }}
                            >
                              View User Page →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default UserOverviewPage;
