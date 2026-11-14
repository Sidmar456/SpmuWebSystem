import { useCallback, useEffect, useState } from "react";

function EquipmentBorrowingPage({ page }) {
  const [borrowings, setBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    borrowed: 0,
    due_soon: 0,
    overdue: 0,
    returned: 0,
    damaged_missing: 0,
  });

  // Modal state for recording return
  const [returnModalItem, setReturnModalItem] = useState(null);
  const [returnCondition, setReturnCondition] = useState("Good");
  const [receivedBy, setReceivedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState("");
  const [returnSuccess, setReturnSuccess] = useState("");

  // Modal state for detail view
  const [viewDetailItem, setViewDetailItem] = useState(null);

  // Fetch borrowings from backend
  const fetchBorrowings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);
      if (search.trim()) params.append("search", search.trim());

      const res = await fetch(
        `http://localhost/smplDB/get_equipment_borrowings.php?${params.toString()}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (data.success) {
        setBorrowings(data.borrowings || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error("Error fetching borrowings:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchBorrowings();
    const interval = setInterval(fetchBorrowings, 10000);
    return () => clearInterval(interval);
  }, [fetchBorrowings]);

  // Open return modal
  const handleOpenReturnModal = (item) => {
    setReturnModalItem(item);
    setReturnCondition("Good");
    setReceivedBy("");
    setRemarks("");
    setReturnError("");
    setReturnSuccess("");
  };

  const handleCloseReturnModal = () => {
    if (!submittingReturn) {
      setReturnModalItem(null);
      setReturnError("");
      setReturnSuccess("");
    }
  };

  // Submit return confirmation
  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!returnModalItem) return;

    try {
      setSubmittingReturn(true);
      setReturnError("");

      const res = await fetch("http://localhost/smplDB/record_equipment_return.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          borrowing_id: returnModalItem.id,
          equipment_condition: returnCondition,
          received_by: receivedBy.trim(),
          remarks: remarks.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to confirm equipment return.");
      }

      setReturnSuccess(
        `Return confirmed in ${returnCondition} condition.${
          data.stock_restored ? " Stock quantity was restored to inventory." : " Equipment flagged for inspection."
        }`
      );

      fetchBorrowings();

      setTimeout(() => {
        handleCloseReturnModal();
      }, 1200);
    } catch (err) {
      console.error("Return confirmation error:", err);
      setReturnError(err.message || "Failed to confirm return.");
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Status badge styling
  const renderStatusBadge = (item) => {
    if (item.status === "RETURNED") {
      return (
        <span
          style={{
            padding: "3px 9px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "600",
            background: "#dcfce7",
            color: "#15803d",
          }}
        >
          ✓ Returned
        </span>
      );
    }
    if (item.status === "DAMAGED") {
      return (
        <span
          style={{
            padding: "3px 9px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "600",
            background: "#fee2e2",
            color: "#b91c1c",
          }}
        >
          ⚠ Damaged
        </span>
      );
    }
    if (item.status === "MISSING") {
      return (
        <span
          style={{
            padding: "3px 9px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "600",
            background: "#fef3c7",
            color: "#b45309",
          }}
        >
          ❓ Missing
        </span>
      );
    }
    if (item.is_overdue) {
      return (
        <span
          style={{
            padding: "3px 9px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "700",
            background: "#fee2e2",
            color: "#dc2626",
            animation: "pulse 2s infinite",
          }}
        >
          ⏰ Overdue
        </span>
      );
    }
    if (item.is_due_soon) {
      return (
        <span
          style={{
            padding: "3px 9px",
            borderRadius: "12px",
            fontSize: "11px",
            fontWeight: "600",
            background: "#fef3c7",
            color: "#d97706",
          }}
        >
          ⏳ Due Soon
        </span>
      );
    }
    return (
      <span
        style={{
          padding: "3px 9px",
          borderRadius: "12px",
          fontSize: "11px",
          fontWeight: "600",
          background: "#e0e7ff",
          color: "#4338ca",
        }}
      >
        🔄 Borrowed
      </span>
    );
  };

  return (
    <div className="reports-page equipment-borrowing-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{page?.eyebrow || "Asset & loan governance"}</p>
          <h1>Equipment Borrowing & Returns</h1>
          <p className="page-description">
            {page?.description ||
              "Track returnable assets, monitor active loans, confirm returns, and inspect equipment conditions."}
          </p>
        </div>
      </div>

      {/* SUMMARY STATS CARDS */}
      <div className="stats-grid" style={{ marginBottom: "20px" }}>
        <article
          className={`stat-card ${filter === "all" ? "active-stat" : ""}`}
          onClick={() => setFilter("all")}
          style={{ cursor: "pointer" }}
        >
          <span className="stat-icon" style={{ background: "#eff6ff", color: "#2563eb", fontSize: "20px" }}>
            📋
          </span>
          <div>
            <span className="stat-label">Total Loans</span>
            <strong>{stats.total}</strong>
          </div>
        </article>

        <article
          className={`stat-card ${filter === "borrowed" ? "active-stat" : ""}`}
          onClick={() => setFilter("borrowed")}
          style={{ cursor: "pointer" }}
        >
          <span className="stat-icon" style={{ background: "#e0e7ff", color: "#4f46e5", fontSize: "20px" }}>
            🔄
          </span>
          <div>
            <span className="stat-label">Currently Borrowed</span>
            <strong>{stats.borrowed}</strong>
          </div>
        </article>

        <article
          className={`stat-card ${filter === "due_soon" ? "active-stat" : ""}`}
          onClick={() => setFilter("due_soon")}
          style={{ cursor: "pointer" }}
        >
          <span className="stat-icon" style={{ background: "#fef3c7", color: "#d97706", fontSize: "20px" }}>
            ⏳
          </span>
          <div>
            <span className="stat-label">Due Soon (2 Days)</span>
            <strong style={{ color: "#d97706" }}>{stats.due_soon}</strong>
          </div>
        </article>

        <article
          className={`stat-card ${filter === "overdue" ? "active-stat" : ""}`}
          onClick={() => setFilter("overdue")}
          style={{ cursor: "pointer" }}
        >
          <span className="stat-icon" style={{ background: "#fee2e2", color: "#dc2626", fontSize: "20px" }}>
            ⏰
          </span>
          <div>
            <span className="stat-label">Overdue</span>
            <strong style={{ color: "#dc2626" }}>{stats.overdue}</strong>
          </div>
        </article>

        <article
          className={`stat-card ${filter === "returned" ? "active-stat" : ""}`}
          onClick={() => setFilter("returned")}
          style={{ cursor: "pointer" }}
        >
          <span className="stat-icon" style={{ background: "#dcfce7", color: "#16a34a", fontSize: "20px" }}>
            ✓
          </span>
          <div>
            <span className="stat-label">Returned</span>
            <strong style={{ color: "#16a34a" }}>{stats.returned}</strong>
          </div>
        </article>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="panel" style={{ padding: "16px 20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", justifyContent: "space-between" }}>
          {/* Segmented Filter Buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "all", label: "All Records" },
              { id: "borrowed", label: "Currently Borrowed" },
              { id: "due_soon", label: "Due Soon" },
              { id: "overdue", label: "Overdue" },
              { id: "returned", label: "Returned" },
              { id: "damaged_missing", label: "Damaged / Missing" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={`secondary-button ${filter === f.id ? "active-tab-btn" : ""}`}
                style={{
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  borderRadius: "6px",
                  background: filter === f.id ? "#1e293b" : "#f1f5f9",
                  color: filter === f.id ? "#ffffff" : "#475569",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: filter === f.id ? "600" : "500",
                }}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "260px" }}>
            <input
              type="text"
              placeholder="Search item, borrower, serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
              🔍
            </span>
          </div>
        </div>
      </div>

      {/* MAIN BORROWING TABLE */}
      <div className="panel">
        <div className="panel-heading" style={{ marginBottom: "16px" }}>
          <div>
            <h2>Equipment Borrowing Records</h2>
            <p className="panel-subtitle">
              Showing {borrowings.length} loan record(s) based on current filter.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
            Loading borrowing records...
          </div>
        ) : borrowings.length === 0 ? (
          <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8" }}>
            <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>📦</span>
            <h4>No equipment borrowing records found</h4>
            <p style={{ fontSize: "13px" }}>
              {filter !== "all"
                ? `No records match the filter "${filter}". Try selecting "All Records".`
                : "Equipment borrowing records will be created automatically when users claim returnable items."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="custom-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b" }}>ID</th>
                  <th style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b" }}>Equipment</th>
                  <th style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b" }}>Borrower</th>
                  <th style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b" }}>Quantity</th>
                  <th style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b" }}>Date Borrowed</th>
                  <th style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b" }}>Expected Return</th>
                  <th style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b" }}>Status</th>
                  <th style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b" }}>Condition</th>
                  <th style={{ padding: "12px 14px", fontSize: "12px", color: "#64748b", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {borrowings.map((b) => (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      background: b.is_overdue ? "#fef2f2" : "#ffffff",
                    }}
                  >
                    <td style={{ padding: "12px 14px", fontSize: "13px", fontWeight: "600", color: "#475569" }}>
                      #{b.id}
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {b.item_image ? (
                          <img
                            src={`http://localhost/smplDB/uploads/stocks/${b.item_image}`}
                            alt=""
                            style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "6px",
                              background: "#e2e8f0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "10px",
                              fontWeight: "700",
                              color: "#64748b",
                            }}
                          >
                            SPMU
                          </div>
                        )}
                        <div>
                          <strong style={{ fontSize: "13.5px", color: "#1e293b", display: "block" }}>
                            {b.item_name}
                          </strong>
                          {b.asset_number && (
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              Asset: {b.asset_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <strong style={{ fontSize: "13px", color: "#1e293b", display: "block" }}>
                        {b.borrower_name}
                      </strong>
                      <span style={{ fontSize: "11.5px", color: "#64748b" }}>{b.borrower_email}</span>
                    </td>

                    <td style={{ padding: "12px 14px", fontSize: "13.5px", fontWeight: "600" }}>
                      {b.amount} unit(s)
                    </td>

                    <td style={{ padding: "12px 14px", fontSize: "12.5px", color: "#475569" }}>
                      {b.borrowed_at ? new Date(b.borrowed_at).toLocaleDateString() : "—"}
                    </td>

                    <td style={{ padding: "12px 14px" }}>
                      <strong
                        style={{
                          fontSize: "12.5px",
                          color: b.is_overdue ? "#dc2626" : b.is_due_soon ? "#d97706" : "#1e293b",
                        }}
                      >
                        {b.expected_return_date}
                      </strong>
                    </td>

                    <td style={{ padding: "12px 14px" }}>{renderStatusBadge(b)}</td>

                    <td style={{ padding: "12px 14px", fontSize: "12px", color: "#475569" }}>
                      {b.equipment_condition || (b.status === "BORROWED" ? "In Use" : "—")}
                    </td>

                    <td style={{ padding: "12px 14px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="secondary-button"
                          style={{ padding: "5px 9px", fontSize: "11.5px", borderRadius: "5px" }}
                          onClick={() => setViewDetailItem(b)}
                          title="View Details"
                        >
                          👁 Details
                        </button>

                        {b.status === "BORROWED" && (
                          <button
                            type="button"
                            className="primary-button"
                            style={{
                              padding: "5px 10px",
                              fontSize: "11.5px",
                              borderRadius: "5px",
                              background: "#16a34a",
                              borderColor: "#16a34a",
                            }}
                            onClick={() => handleOpenReturnModal(b)}
                          >
                            ↩ Return
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD RETURN MODAL */}
      {returnModalItem && (
        <div
          className="product-popup-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseReturnModal();
          }}
        >
          <div className="product-card product-popup-card" style={{ maxWidth: "520px" }}>
            <div className="product-card-header">
              <h2>Record Equipment Return</h2>
              <button
                type="button"
                className="product-popup-close"
                onClick={handleCloseReturnModal}
                disabled={submittingReturn}
              >
                &times;
              </button>
            </div>

            <p className="product-popup-subtitle">
              Confirm receiving returned equipment and inspect its condition.
            </p>

            {returnError && <div className="claim-error" style={{ marginBottom: "12px" }}>{returnError}</div>}
            {returnSuccess && (
              <div style={{ color: "#16a34a", fontWeight: "600", fontSize: "13px", marginBottom: "12px" }}>
                ✓ {returnSuccess}
              </div>
            )}

            <form onSubmit={handleConfirmReturn} className="supplier-form">
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "14px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Equipment:</span>
                  <strong style={{ fontSize: "13px", color: "#1e293b" }}>{returnModalItem.item_name}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Borrower:</span>
                  <strong style={{ fontSize: "13px", color: "#1e293b" }}>{returnModalItem.borrower_name}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Quantity:</span>
                  <strong style={{ fontSize: "13px", color: "#1e293b" }}>{returnModalItem.amount} unit(s)</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>Expected Return:</span>
                  <strong style={{ fontSize: "13px", color: returnModalItem.is_overdue ? "#dc2626" : "#1e293b" }}>
                    {returnModalItem.expected_return_date} {returnModalItem.is_overdue ? "(OVERDUE)" : ""}
                  </strong>
                </div>
              </div>

              <div className="supplier-form-group">
                <label>Equipment Condition Upon Return *</label>
                <select
                  value={returnCondition}
                  onChange={(e) => setReturnCondition(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13.5px",
                    background: "#fff",
                  }}
                >
                  <option value="Good">Good (Ready for re-issuing / available immediately)</option>
                  <option value="Needs Maintenance">Needs Maintenance (Cleaning, inspection, or repairs required)</option>
                  <option value="Damaged">Damaged (Broken / not working)</option>
                  <option value="Missing">Missing (Equipment lost or unrecovered)</option>
                </select>
                <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
                  Note: If returned in 'Good' condition, stock will automatically be restored. If Damaged or Needs Maintenance, stock remains held.
                </small>
              </div>

              <div className="supplier-form-group">
                <label>Received By (Staff Member Name) *</label>
                <input
                  type="text"
                  placeholder="Enter staff receiver name"
                  value={receivedBy}
                  onChange={(e) => setReceivedBy(e.target.value)}
                  required
                />
              </div>

              <div className="supplier-form-group">
                <label>Remarks / Inspection Notes (Optional)</label>
                <textarea
                  rows="3"
                  placeholder="Notes on scratches, missing chargers, cleanliness, or test results..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: "18px" }}>
                <button
                  type="button"
                  className="supplier-modal-cancel"
                  onClick={handleCloseReturnModal}
                  disabled={submittingReturn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={submittingReturn}
                  style={{ background: "#16a34a", borderColor: "#16a34a" }}
                >
                  {submittingReturn ? "Confirming..." : "Confirm Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {viewDetailItem && (
        <div
          className="product-popup-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewDetailItem(null);
          }}
        >
          <div className="product-card product-popup-card" style={{ maxWidth: "560px" }}>
            <div className="product-card-header">
              <h2>Borrowing Record Details</h2>
              <button
                type="button"
                className="product-popup-close"
                onClick={() => setViewDetailItem(null)}
              >
                &times;
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "14px" }}>
              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Loan ID</span>
                <strong style={{ fontSize: "14px" }}>#{viewDetailItem.id}</strong>
              </div>

              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Request Ref</span>
                <strong style={{ fontSize: "14px" }}>Request #{viewDetailItem.request_id}</strong>
              </div>

              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Equipment Item</span>
                <strong style={{ fontSize: "14px" }}>{viewDetailItem.item_name}</strong>
              </div>

              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Quantity Borrowed</span>
                <strong style={{ fontSize: "14px" }}>{viewDetailItem.amount} unit(s)</strong>
              </div>

              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Borrower Name</span>
                <strong style={{ fontSize: "14px" }}>{viewDetailItem.borrower_name}</strong>
              </div>

              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Borrower Email</span>
                <strong style={{ fontSize: "13px" }}>{viewDetailItem.borrower_email}</strong>
              </div>

              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Borrow Date</span>
                <strong style={{ fontSize: "13px" }}>
                  {viewDetailItem.borrowed_at ? new Date(viewDetailItem.borrowed_at).toLocaleString() : "—"}
                </strong>
              </div>

              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Expected Return</span>
                <strong style={{ fontSize: "13px", color: viewDetailItem.is_overdue ? "#dc2626" : "inherit" }}>
                  {viewDetailItem.expected_return_date} {viewDetailItem.is_overdue ? "(OVERDUE)" : ""}
                </strong>
              </div>

              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Actual Return Date</span>
                <strong style={{ fontSize: "13px" }}>
                  {viewDetailItem.actual_return_date ? new Date(viewDetailItem.actual_return_date).toLocaleString() : "Not returned yet"}
                </strong>
              </div>

              <div style={{ padding: "10px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Condition / Received By</span>
                <strong style={{ fontSize: "13px" }}>
                  {viewDetailItem.equipment_condition || "—"} {viewDetailItem.received_by ? `(by ${viewDetailItem.received_by})` : ""}
                </strong>
              </div>
            </div>

            {viewDetailItem.remarks && (
              <div style={{ marginTop: "14px", padding: "12px", background: "#f1f5f9", borderRadius: "8px" }}>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>Remarks</span>
                <p style={{ margin: 0, fontSize: "13px", color: "#334155" }}>{viewDetailItem.remarks}</p>
              </div>
            )}

            <div style={{ marginTop: "18px", textAlign: "right" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setViewDetailItem(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentBorrowingPage;
