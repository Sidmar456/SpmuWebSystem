import { useState } from "react";

function ActivityPage({
  loadingStocks,
  newProductIcon,
  outOfStockIcon,
  page,
  refreshDashboardData,
  selectPage,
  setStocks,
  statsIcon,
  stockSummary,
  stocks,
}) {
  // Modal State for Editing Stock
  const [editingStock, setEditingStock] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editName, setEditName] = useState("");
  const [editItemType, setEditItemType] = useState("non_returnable");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  const handleOpenEdit = (stock) => {
    setEditingStock(stock);
    setEditAmount(String(stock.amount ?? 0));
    setEditDetails(stock.details || "");
    setEditName(stock.item_name || "");
    setEditItemType(stock.item_type || "non_returnable");
    setEditError("");
    setEditSuccess("");
  };

  const handleCloseEdit = () => {
    if (!savingEdit) {
      setEditingStock(null);
      setEditError("");
      setEditSuccess("");
    }
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    if (!editingStock) return;

    const parsedAmount = parseInt(editAmount, 10);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setEditError("Please enter a valid non-negative amount.");
      return;
    }

    try {
      setSavingEdit(true);
      setEditError("");

      const response = await fetch("http://localhost/smplDB/update_stock.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editingStock.id,
          amount: parsedAmount,
          details: editDetails,
          item_name: editName,
          item_type: editItemType,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || "Failed to update stock.");
      }

      // Update local stocks array immediately
      if (setStocks) {
        setStocks((prev) =>
          prev.map((s) =>
            s.id === editingStock.id
              ? {
                  ...s,
                  amount: parsedAmount,
                  details: editDetails,
                  item_name: editName,
                  item_type: editItemType,
                  status: data.stock?.status || s.status,
                }
              : s
          )
        );
      }

      setEditSuccess("Stock updated successfully!");
      if (refreshDashboardData) {
        refreshDashboardData();
      }

      setTimeout(() => {
        setEditingStock(null);
      }, 700);
    } catch (err) {
      console.error("Update stock error:", err);
      setEditError(err.message || "Server error updating stock.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Compute real recently added / updated items from stocks array
  const recentStockUpdates = [...stocks]
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : Number(b.id) || 0;
      return bTime - aTime;
    })
    .slice(0, 7);

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return "Recently added";
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return "Recently added";
    const now = Date.now();
    const diffSec = Math.floor((now - then) / 1000);

    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hour(s) ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} day(s) ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const getAvatarColorClass = (idx) => {
    const classes = ["blue", "yellow", "pink", "green", "purple"];
    return classes[idx % classes.length];
  };

  return (
    <>
      {/* Edit Stock Modal Popup */}
      {editingStock && (
        <div className="supplier-modal-overlay" onClick={handleCloseEdit}>
          <div
            className="supplier-modal edit-stock-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="supplier-modal-header">
              <div>
                <h2>Edit Stock</h2>
                <p>Update quantity and details for #{editingStock.id} {editingStock.item_name}</p>
              </div>
              <button
                type="button"
                className="supplier-modal-close"
                onClick={handleCloseEdit}
                disabled={savingEdit}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="supplier-form">
              {editError && <div className="claim-error">{editError}</div>}
              {editSuccess && (
                <div style={{ color: "#16a34a", fontSize: "13px", fontWeight: "600", padding: "8px 0" }}>
                  ✓ {editSuccess}
                </div>
              )}

              <div className="supplier-form-group">
                <label>Stock Item Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Item name"
                  required
                />
              </div>

              <div className="supplier-form-group">
                <label>Available Quantity (Amount)</label>
                <input
                  type="number"
                  min="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="Enter current quantity"
                  required
                />
                <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
                  Status will automatically adjust: 0 = Out of Stock, ≤ 10 = Low Stock, &gt; 10 = In Stock.
                </small>
              </div>

              <div className="supplier-form-group">
                <label>Item Classification</label>
                <select
                  value={editItemType}
                  onChange={(e) => setEditItemType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    background: "#fff",
                    color: "#1e293b",
                  }}
                >
                  <option value="non_returnable">Non-Returnable (Consumables: Paper, Pens, Cleaning items)</option>
                  <option value="returnable">Returnable (Equipment: Laptops, Tablets, Projectors)</option>
                </select>
                <small style={{ color: "#64748b", fontSize: "11px", marginTop: "4px" }}>
                  Note: Cannot be set to Non-Returnable while there are active unreturned borrowings.
                </small>
              </div>

              <div className="supplier-form-group">
                <label>Details & Specifications</label>
                <textarea
                  rows="3"
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  placeholder="Add notes, specifications, brand, location or batch details..."
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    fontSize: "13.5px",
                    resize: "vertical",
                  }}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: 18 }}>
                <button
                  type="button"
                  className="supplier-modal-cancel"
                  onClick={handleCloseEdit}
                  disabled={savingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-heading">
        <div>
          <p className="eyebrow">{page?.eyebrow || "Workspace pulse"}</p>
          <h1>Stock Activity</h1>
          <p className="page-description">
            {page?.description || "Stay on top of the latest updates from your team."}
          </p>
        </div>
      </div>

      <div className="panel">
        <h2>Stock Activity Records</h2>

        <div className="stats-grid">
          {/* Total Stock */}
          <article className="stat-card">
            <span className="stat-icon">
              <img src={statsIcon} alt="" />
            </span>
            <p>Total Stock available</p>
            <strong>{stockSummary?.total_stock ?? 0}</strong>
            <small>
              <b>Current</b> total quantity
            </small>
          </article>

          {/* New Stock */}
          <article className="stat-card">
            <span className="stat-icon green">
              <img src={newProductIcon} alt="" />
            </span>
            <p>New stock added</p>
            <strong>{stockSummary?.new_stock ?? 0}</strong>
            <small>
              <b>Current</b> stock records
            </small>
          </article>

          {/* Out of Stock */}
          <article className="stat-card">
            <span className="stat-icon orange">
              <img src={outOfStockIcon} alt="" />
            </span>
            <p>Out of stock</p>
            <strong>{stockSummary?.out_of_stock ?? 0}</strong>
            <small>
              <b>Items</b> currently out of stock
            </small>
          </article>
        </div>

        <div className="content-grid">
          {/* Stock Table */}
          <article className="panel chart-panel">
            <div className="head-grid">
              <h2>Stock Status</h2>
              <button
                className="add-btn"
                onClick={() => selectPage("projects")}
              >
                + Add stock
              </button>
            </div>

            <div className="stock-table-container">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Stock name</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Details</th>
                    <th>Edit Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStocks ? (
                    <tr>
                      <td colSpan="5">Loading stocks...</td>
                    </tr>
                  ) : stocks.length === 0 ? (
                    <tr>
                      <td colSpan="5">No stock records found.</td>
                    </tr>
                  ) : (
                    stocks.map((stock) => {
                      const amountNum = Number(stock.amount) || 0;
                      const badgeClass =
                        amountNum === 0
                          ? "status-badge status-out"
                          : amountNum <= 10
                          ? "status-badge status-low"
                          : "status-badge status-progress";

                      return (
                        <tr key={stock.id}>
                          <td className="department-name">
                            <strong>{stock.item_name}</strong>
                          </td>

                          <td className="requested-item">
                            {stock.amount} units
                          </td>

                          <td>
                            <span className={badgeClass}>
                              {stock.status || (amountNum === 0 ? "OUT OF STOCK" : "IN STOCK")}
                            </span>
                          </td>

                          <td style={{ fontSize: "12px", color: "#64748b", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {stock.details ? stock.details : "—"}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="edit-btn"
                              onClick={() => handleOpenEdit(stock)}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </article>

          {/* Real Updates Panel */}
          <article className="panel updates-panel">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Real-time inventory</p>
                <h2>Recent stock updates</h2>
              </div>
              <button
                className="text-button"
                onClick={() => selectPage("projects")}
              >
                View all <span>→</span>
              </button>
            </div>

            <div className="update-list">
              {stocks.length === 0 ? (
                <div style={{ padding: "30px 10px", textAlign: "center", color: "#94a3b8" }}>
                  No stock items recorded yet.
                </div>
              ) : (
                recentStockUpdates.map((item, idx) => {
                  const initials = item.item_name
                    ? item.item_name.substring(0, 2).toUpperCase()
                    : "ST";
                  const colorClass = getAvatarColorClass(idx);
                  const isLow = Number(item.amount) <= 10 && Number(item.amount) > 0;
                  const isOut = Number(item.amount) === 0;

                  return (
                    <div
                      key={item.id}
                      className="update-item"
                      onClick={() => handleOpenEdit(item)}
                      style={{ cursor: "pointer" }}
                      title="Click to edit stock"
                    >
                      <div className={`update-avatar ${colorClass}`}>
                        {initials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: "block" }}>
                          {item.item_name}{" "}
                          <span>
                            {isOut
                              ? "is out of stock"
                              : isLow
                              ? "running low on stock"
                              : "in inventory"}
                          </span>
                        </strong>

                        <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "2px 0" }}>
                          <span
                            style={{
                              fontSize: "10.5px",
                              fontWeight: "600",
                              padding: "1px 6px",
                              borderRadius: "10px",
                              background: item.item_type === "returnable" ? "#e0e7ff" : "#f1f5f9",
                              color: item.item_type === "returnable" ? "#4338ca" : "#64748b",
                            }}
                          >
                            {item.item_type === "returnable" ? "🔄 Returnable" : "📦 Non-Returnable"}
                          </span>
                          <span style={{ fontSize: "12px", color: "#475569" }}>
                            {item.amount} unit(s) available
                          </span>
                        </div>
                        {item.details && (
                          <p style={{ margin: "1px 0 3px", fontSize: "12px", color: "#64748b" }}>
                            {item.details}
                          </p>
                        )}

                        <small style={{ color: "#94a3b8" }}>
                          {getRelativeTime(item.created_at)}
                        </small>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}

export default ActivityPage;
