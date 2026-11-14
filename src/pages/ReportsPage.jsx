import { groupRequests } from "../utils/requestGroups";

function ReportsPage({
  activeReportTab,
  approveAccount,
  claimCode,
  claimDocument,
  claimError,
  claimItem,
  claimLoading,
  claimResult,
  handleConfirmClaim,
  loadingAccountRequests,
  loadingRequests,
  page,
  pendingAccountRequests,
  pendingRequests,
  receivedBy,
  refreshDashboardData,
  rejectAccount,
  returnDueDateTime,
  selectedAccountRequest,
  selectedRequest,
  setActiveReportTab,
  setClaimCode,
  setClaimDocument,
  setReceivedBy,
  setReturnDueDateTime,
  setSelectedAccountRequest,
  setSelectedRequest,
  setShowClaimPopup,
  showClaimPopup,
  stats,
  updateRequestStatus,
  updatingRequest,
}) {
  const groupedPendingRequests = groupRequests(pendingRequests);

  const selectedRequestItems =
    selectedRequest?.items?.length > 0
      ? selectedRequest.items
      : selectedRequest
        ? [
            {
              id: selectedRequest.id,
              item_name: selectedRequest.item_name || "Unknown item",
              amount: Number(selectedRequest.amount) || 0,
              image: selectedRequest.image || "",
            },
          ]
        : [];

  const selectedRequestTotalUnits = selectedRequestItems.reduce(
    (total, item) => total + (Number(item.amount) || 0),
    0,
  );

  return (
    <div className="reports-page">
      <div className="page-heading reports-heading">
        <div>
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>Reports & requests</h1>
          <p className="page-description">
            A clear view of inventory health, claim verification, and requests waiting for action.
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => {
            refreshDashboardData();
          }}
        >
          Refresh report
        </button>
      </div>
      <div className="reports-tabs">
        <button
          className={activeReportTab === "items" ? "active" : ""}
          onClick={() => setActiveReportTab("items")}
        >
          Request Items
        </button>

        <button
          className={activeReportTab === "permissions" ? "active" : ""}
          onClick={() => setActiveReportTab("permissions")}
        >
          Request Permissions
        </button>

        <button
          className={activeReportTab === "claim" ? "active" : ""}
          onClick={() => setActiveReportTab("claim")}
        >
          Request Management
        </button>
      </div>
      {activeReportTab === "items" && (
        <>
          <div className="reports-summary">
            <article className="report-stat report-stat-primary">
              <span className="report-stat-icon">◒</span>
              <div>
                <span>Pending requests</span>
                <strong>{groupedPendingRequests.length}</strong>
              </div>
              <small>Awaiting review</small>
            </article>
            <article className="report-stat">
              <span className="report-stat-icon green">▦</span>
              <div>
                <span>Items in stock</span>
                <strong>{stats.inStock}</strong>
              </div>
              <small>Available now</small>
            </article>
            <article className="report-stat">
              <span className="report-stat-icon orange">◈</span>
              <div>
                <span>Low stock items</span>
                <strong>{stats.lowStock}</strong>
              </div>
              <small>Need attention</small>
            </article>
          </div>

          <div className="reports-grid">
            <article className="panel reports-requests-panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Request pipeline</p>
                  <h2>Latest requests</h2>
                </div>

                <span className="report-count">
                  {groupedPendingRequests.length} group(s)
                </span>
              </div>

              {loadingRequests ? (
                <div className="report-empty">Loading requests...</div>
              ) : groupedPendingRequests.length === 0 ? (
                <div className="report-empty">
                  <strong>All caught up</strong>
                  <span>No pending requests to review.</span>
                </div>
              ) : (
                <div className="reports-request-list">
                  {groupedPendingRequests.map((request) => (
                    <button
                      type="button"
                      className={`report-request-row ${
                        selectedRequest?.group_key === request.group_key ||
                        selectedRequest?.id === request.id
                          ? "selected"
                          : ""
                      }`}
                      key={request.group_key}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <span className="report-request-avatar">
                        {(request.user_name || "U").charAt(0).toUpperCase()}
                      </span>

                      <span className="report-request-copy">
                        <strong>
                          {request.items.length === 1
                            ? request.items[0].item_name
                            : `${request.items.length} supplies in this request`}
                        </strong>

                        <span>
                          {request.user_name || "Unknown user"} ·{" "}
                          {request.items.length} item(s) ·{" "}
                          {request.total_amount} total units
                        </span>

                        <span className="report-request-items">
                          {request.items.map((item) => (
                            <span className="report-request-item" key={item.id}>
                              {item.item_name} × {item.amount}
                            </span>
                          ))}
                        </span>
                      </span>

                      <span className="report-request-date">
                        {request.created_at
                          ? new Date(request.created_at).toLocaleDateString()
                          : "Recent"}
                      </span>

                      <span className="report-arrow" aria-hidden="true">
                        →
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="panel reports-detail-panel">
              {selectedRequest ? (
                <>
                  {/* Header */}
                  <div className="panel-heading report-detail-heading">
                    <div>
                      <p className="panel-kicker">Selected request</p>

                      <h2>
                        Request #
                        {selectedRequest.id}
                      </h2>

                      <p className="report-detail-subtitle">
                        {selectedRequestItems.length} item(s) submitted together
                      </p>
                    </div>

                    <button
                      type="button"
                      className="report-close"
                      onClick={() => setSelectedRequest(null)}
                      aria-label="Close request details"
                    >
                      ×
                    </button>
                  </div>

                  {/* Requester information */}
                  <div className="report-requester-card">
                    <div className="report-requester-avatar">
                      {(selectedRequest.user_name || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="report-requester-info">
                      <span>Requested by</span>
                      <strong>
                        {selectedRequest.user_name || "Unknown user"}
                      </strong>

                      <small>
                        Submitted{" "}
                        {selectedRequest.created_at
                          ? new Date(
                              selectedRequest.created_at,
                            ).toLocaleDateString()
                          : "on an unknown date"}
                      </small>
                    </div>
                  </div>

                  {/* All supplies in this grouped request */}
                  <div className="report-detail-items-section">
                    <div className="report-detail-items-heading">
                      <h3>Requested supplies</h3>

                      <span className="report-items-count">
                        {selectedRequestItems.length} item(s)
                      </span>
                    </div>

                    <div className="report-detail-items">
                      {selectedRequestItems.map((item, index) => (
                        <div
                          className="report-detail-item"
                          key={item.id ?? `${item.item_name}-${index}`}
                        >
                          <div className="report-detail-item-image">
                            {item.image ? (
                              <img
                                src={`http://localhost/smplDB/uploads/stocks/${item.image}`}
                                alt={item.item_name}
                              />
                            ) : (
                              <span>SPMU</span>
                            )}
                          </div>

                          <div className="report-detail-item-copy">
                            <strong>{item.item_name}</strong>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "2px 0" }}>
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "600",
                                  padding: "1px 6px",
                                  borderRadius: "8px",
                                  background: item.item_type === "returnable" ? "#e0e7ff" : "#f1f5f9",
                                  color: item.item_type === "returnable" ? "#4338ca" : "#64748b",
                                }}
                              >
                                {item.item_type === "returnable" ? "🔄 Returnable Equipment" : "📦 Non-Returnable Consumable"}
                              </span>
                            </div>
                            {item.item_type === "returnable" && item.expected_return_date && (
                              <small style={{ color: "#4338ca", fontSize: "11px", fontWeight: "500" }}>
                                Expected return: {item.expected_return_date}
                              </small>
                            )}
                          </div>

                          <div className="report-detail-item-quantity">
                            <span>Quantity</span>
                            <strong>{item.amount}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="report-detail-summary">
                    <div className="report-detail-summary-row">
                      <span>Different items</span>
                      <strong>{selectedRequestItems.length}</strong>
                    </div>

                    <div className="report-detail-summary-row report-detail-total">
                      <span>Total units requested</span>
                      <strong>{selectedRequestTotalUnits}</strong>
                    </div>

                    <div className="report-detail-summary-row">
                      <span>Request status</span>
                      <strong
                        className={`report-status ${
                          String(selectedRequest.status).toUpperCase() ===
                          "PENDING"
                            ? "status-pending"
                            : String(selectedRequest.status).toUpperCase() ===
                                "APPROVED"
                              ? "status-approved"
                              : "status-other"
                        }`}
                      >
                        {selectedRequest.status || "PENDING"}
                      </strong>
                    </div>
                  </div>

                  {/* One action for the entire group */}
                  <div className="report-detail-actions">
                    <button
                      type="button"
                      className="primary-button report-confirm"
                      onClick={() => updateRequestStatus("APPROVED")}
                      disabled={
                        updatingRequest ||
                        String(selectedRequest.status).toUpperCase() !==
                          "PENDING"
                      }
                    >
                      {updatingRequest
                        ? "Processing..."
                        : "Approve Entire Request"}
                    </button>

                    <button
                      type="button"
                      className="primary-button report-cancel"
                      onClick={() => updateRequestStatus("CANCELLED")}
                      disabled={
                        updatingRequest ||
                        String(selectedRequest.status).toUpperCase() !==
                          "PENDING"
                      }
                    >
                      {updatingRequest
                        ? "Processing..."
                        : "Cancel Entire Request"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="report-detail-empty">
                  <span className="detail-placeholder">▤</span>
                  <h2>Select a request</h2>
                  <p>
                    Choose a request from Latest requests to see all its
                    supplies and review it.
                  </p>
                </div>
              )}
            </article>
          </div>
        </>
      )}
      {activeReportTab === "permissions" && (
        <>
          <div className="reports-grid">
            <article className="panel reports-requests-panel">
              <div className="panel-heading">
                <div>
                  <p className="panel-kicker">Account pipeline</p>
                  <h2>Account Requests</h2>
                </div>

                <span className="report-count">
                  {pendingAccountRequests.length} pending
                </span>
              </div>

              {loadingAccountRequests ? (
                <div className="report-empty">Loading account requests...</div>
              ) : pendingAccountRequests.length === 0 ? (
                <div className="report-empty">
                  <strong>All caught up</strong>
                  <span>No pending account requests.</span>
                </div>
              ) : (
                <div className="reports-request-list">
                  {pendingAccountRequests.map((request) => (
                    <button
                      className={`report-request-row ${
                        selectedAccountRequest?.id === request.id
                          ? "selected"
                          : ""
                      }`}
                      key={request.id}
                      onClick={() => setSelectedAccountRequest(request)}
                    >
                      <span className="report-request-avatar">
                        {(request.name || "U").charAt(0).toUpperCase()}
                      </span>

                      <span className="report-request-copy">
                        <strong>{request.name}</strong>

                        <span>{request.email}</span>
                      </span>

                      <span className="report-request-date">
                        {request.created_at
                          ? new Date(request.created_at).toLocaleDateString()
                          : "Recent"}
                      </span>

                      <span className="report-arrow">-&gt;</span>
                    </button>
                  ))}
                </div>
              )}
            </article>

            <article className="panel reports-detail-panel">
              {selectedAccountRequest ? (
                <>
                  <div className="panel-heading">
                    <div>
                      <p className="panel-kicker">Account Request</p>

                      <h2>Request #{selectedAccountRequest.id}</h2>
                    </div>

                    <button
                      className="report-close"
                      onClick={() => setSelectedAccountRequest(null)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="report-detail-rows">
                    <div>
                      <span>Full Name</span>
                      <strong>{selectedAccountRequest.name}</strong>
                    </div>

                    <div>
                      <span>Email</span>
                      <strong>{selectedAccountRequest.email}</strong>
                    </div>

                    <div>
                      <span>Role</span>
                      <strong>{selectedAccountRequest.role}</strong>
                    </div>

                    <div>
                      <span>Status</span>
                      <strong className="report-status">
                        {selectedAccountRequest.status}
                      </strong>
                    </div>

                    <div>
                      <span>Date submitted</span>
                      <strong>
                        {selectedAccountRequest.created_at
                          ? new Date(
                              selectedAccountRequest.created_at,
                            ).toLocaleDateString()
                          : "Unknown"}
                      </strong>
                    </div>
                  </div>

                  <button
                    className="primary-button report-confirm"
                    onClick={() => approveAccount(selectedAccountRequest.id)}
                  >
                    Approve Account
                  </button>

                  <button
                    className="primary-button report-cancel"
                    onClick={() => rejectAccount(selectedAccountRequest.id)}
                  >
                    Reject
                  </button>
                </>
              ) : (
                <div className="report-detail-empty">
                  <span className="detail-placeholder">▤</span>

                  <h2>Select an account request</h2>

                  <p>Choose a request to see its details here.</p>
                </div>
              )}
            </article>
          </div>
        </>
      )}

      {activeReportTab === "claim" && (
        <>
          <div className="management-empty-state" />

          <div className="management-container">
            <div className="input-card">
              <label htmlFor="code">Enter Claim Code</label>

              <div className="claim-code-input">
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="Enter 6-digit code"
                  value={claimCode}
                  onChange={(e) => setClaimCode(e.target.value)}
                />

                <button
                  className="primary-button"
                  onClick={claimItem}
                  disabled={claimLoading}
                >
                  {claimLoading ? "Checking..." : "Check Code"}
                </button>
              </div>

              {claimError && <p className="claim-error">{claimError}</p>}

              {claimResult && (
                <div className="claim-result">
                  <h3>Request Found</h3>

                  <div className="claim-details">
                    <p>
                      <strong>Item:</strong> {claimResult.item_name}
                    </p>

                    <p>
                      <strong>Amount:</strong> {claimResult.amount}
                    </p>

                    <p>
                      <strong>Requested by:</strong> {claimResult.user_name}
                    </p>

                    <p>
                      <strong>Email:</strong> {claimResult.email}
                    </p>

                    <p>
                      <strong>Status:</strong> {claimResult.status}
                    </p>

                    <p>
                      <strong>Request Date:</strong> {claimResult.created_at}
                    </p>

                    {/* DOCUMENT UPLOAD */}
                    <div className="claim-document">
                      <label htmlFor="claimDocument">
                        <strong>Claim Document / Proof</strong>
                      </label>

                      <p className="document-help">
                        Upload an image or PDF document before receiving the
                        item.
                      </p>

                      <input
                        id="claimDocument"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];

                          if (file) {
                            setClaimDocument(file);
                          }
                        }}
                      />

                      {/* Selected file */}
                      {claimDocument && (
                        <div className="selected-document">
                          <p>
                            <strong>Selected file:</strong> {claimDocument.name}
                          </p>

                          <small>
                            {(claimDocument.size / 1024 / 1024).toFixed(2)} MB
                          </small>
                        </div>
                      )}
                    </div>

                    <button
                      className="primary-button"
                      onClick={() => setShowClaimPopup(true)}
                      disabled={!claimResult?.id || !claimDocument}
                    >
                      Confirm Claim
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {showClaimPopup && (
            <div className="claim-popup-overlay">
              <div className="claim-popup">
                <button
                  className="claim-popup-close"
                  onClick={() => {
                    setShowClaimPopup(false);
                    setReceivedBy("");
                  }}
                >
                  ×
                </button>

                <h2>Confirm Item Claim</h2>

                <p>
                  Please enter the name of the person who received the item.
                </p>

                <div className="claim-popup-item">
                  <strong>{claimResult?.item_name}</strong>
                  <span>Quantity: {claimResult?.amount}</span>
                  {claimResult?.item_type === "returnable" && (
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: "4px",
                        fontSize: "11px",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "#e0e7ff",
                        color: "#4338ca",
                      }}
                    >
                      🔄 Returnable Equipment
                    </span>
                  )}
                </div>

                <div className="input-group">
                  <input
                    type="text"
                    id="receivedBy"
                    placeholder=" "
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                  />
                  <label htmlFor="receivedBy">Received by (Borrower / Staff)</label>
                </div>

                {claimResult?.item_type === "returnable" && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "8px",
                      padding: "12px",
                      margin: "14px 0",
                      textAlign: "left",
                    }}
                  >
                    <label
                      htmlFor="returnDueDateTime"
                      style={{
                        display: "block",
                        fontSize: "12px",
                        fontWeight: "700",
                        color: "#166534",
                        marginBottom: "4px",
                      }}
                    >
                      ⏰ When is this equipment due to be returned? (Date & Time) *
                    </label>
                    <input
                      type="datetime-local"
                      id="returnDueDateTime"
                      value={returnDueDateTime}
                      onChange={(e) => setReturnDueDateTime(e.target.value)}
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "6px",
                        border: "1px solid #86efac",
                        fontSize: "13.5px",
                        background: "#fff",
                        color: "#1e293b",
                      }}
                    />
                    <small style={{ display: "block", marginTop: "4px", fontSize: "11px", color: "#15803d" }}>
                      Specify the exact date and deadline time the borrower must return the equipment.
                    </small>
                  </div>
                )}

                {claimError && <p className="claim-error">{claimError}</p>}

                <div className="claim-popup-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setShowClaimPopup(false);
                      setReceivedBy("");
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className="primary-button"
                    disabled={
                      !receivedBy.trim() ||
                      !claimDocument ||
                      claimLoading ||
                      (claimResult?.item_type === "returnable" && !returnDueDateTime)
                    }
                    onClick={handleConfirmClaim}
                  >
                    {claimLoading ? "Saving..." : "Confirm Claim"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ReportsPage;
