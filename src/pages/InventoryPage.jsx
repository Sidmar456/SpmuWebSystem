function InventoryPage({
  activeManagementTab,
  addStock,
  addingStock,
  amount,
  claimCode,
  claimDocument,
  claimError,
  claimItem,
  claimLoading,
  claimResult,
  fetchTransactions,
  handleConfirmClaim,
  itemDetails,
  itemName,
  itemType,
  page,
  receivedBy,
  setActiveManagementTab,
  setAmount,
  setClaimCode,
  setClaimDocument,
  setItemDetails,
  setItemImage,
  setItemName,
  setItemType,
  setReceivedBy,
  setShowAddStockPopup,
  setShowClaimPopup,
  showAddStockPopup,
  showClaimPopup,
  stocks,
  transactionLoading,
  transactions,
  viewAll,
}) {
  return <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{page.eyebrow}</p>
                  <h1>Inventory</h1>
                  <p className="page-description">{page.description}</p>
                </div>
                <div className="btn-group">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setActiveManagementTab("stock");
                      setShowAddStockPopup(true);
                    }}
                  >
                    <span>+</span> Add New Stock
                  </button>
                </div>
              </div>
              <div className="management-tabs">
                <button
                  className={activeManagementTab === "stock" ? "active" : ""}
                  onClick={() => setActiveManagementTab("stock")}
                >
                  Stock Management
                </button>

                <button
                  className={activeManagementTab === "receipt" ? "active" : ""}
                  onClick={() => setActiveManagementTab("receipt")}
                >
                  Transaction Receipt
                </button>
              </div>

              {activeManagementTab === "stock" && (
                <div
                  className={`product-grid ${viewAll ? "view-all-active" : ""}`}
                >
                  <div
                    className={`view-item ${viewAll ? "view-expanded" : ""}`}
                  >
                    <h2>View Stock</h2>
                    <div className="head-view">
                      <p className="page-description">
                        View and manage your stock items.
                      </p>
                      <div className="head-actions"></div>
                    </div>
                    <div className="view-container">
                      <div className="grid-item">
                        {stocks.map((stock) => (
                          <div className="stock-card" key={stock.id}>
                            <div className="stock-image">
                              {stock.image ? (
                                <img
                                  src={`http://localhost/smplDB/uploads/stocks/${stock.image}`}
                                  alt={stock.item_name}
                                />
                              ) : (
                                <span>No Image</span>
                              )}
                            </div>

                            <div className="stock-card-bottom">
                              <div className="stock-info">
                                <span className="stock-name">
                                  {stock.item_name}
                                </span>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center", margin: "4px 0" }}>
                                  <span
                                    style={{
                                      fontSize: "10.5px",
                                      fontWeight: "600",
                                      padding: "2px 7px",
                                      borderRadius: "12px",
                                      background: stock.item_type === "returnable" ? "#e0e7ff" : "#f1f5f9",
                                      color: stock.item_type === "returnable" ? "#4338ca" : "#64748b",
                                    }}
                                  >
                                    {stock.item_type === "returnable" ? "🔄 Returnable" : "📦 Non-Returnable"}
                                  </span>
                                </div>
                                {(stock.details || stock.description) && (
                                  <span
                                    className="stock-details-text"
                                    title={stock.details || stock.description}
                                  >
                                    {stock.details || stock.description}
                                  </span>
                                )}
                              </div>

                              <span className="stock-amount">
                                {stock.amount}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showAddStockPopup && (
                <div
                  className="product-popup-overlay"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setShowAddStockPopup(false);
                    }
                  }}
                >
                  <div className="product-card product-popup-card">
                    <div className="product-card-header">
                      <h2>Add New Stock</h2>
                      <button
                        type="button"
                        className="product-popup-close"
                        onClick={() => setShowAddStockPopup(false)}
                        aria-label="Close add stock popup"
                      >
                        &times;
                      </button>
                    </div>
                    <p className="product-popup-subtitle">
                      Enter details below to add a new item to stock.
                    </p>

                    <form className="product-form" onSubmit={addStock}>
                      <div className="input-group">
                        <input
                          type="text"
                          id="stockName"
                          placeholder=" "
                          required
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                        />
                        <label htmlFor="stockName">Stock Name</label>
                      </div>

                      <div className="input-group">
                        <input
                          type="number"
                          id="amount"
                          placeholder=" "
                          min="1"
                          required
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        <label htmlFor="amount">Amount</label>
                      </div>

                      <div className="input-group">
                        <select
                          id="itemType"
                          value={itemType || "non_returnable"}
                          onChange={(e) => setItemType(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontSize: "14px",
                            background: "#fff",
                            color: "#1e293b",
                            marginBottom: "12px",
                          }}
                        >
                          <option value="non_returnable">Non-Returnable (Consumables: Paper, Pens, Ink)</option>
                          <option value="returnable">Returnable (Equipment: Laptops, Tablets, Projectors)</option>
                        </select>
                        <span style={{ fontSize: "11px", color: "#64748b", marginTop: "-6px", display: "block" }}>
                          Returnable equipment will automatically track loan periods, expected returns, and condition upon return.
                        </span>
                      </div>

                      <div className="input-group">
                        <input
                          type="text"
                          id="stockDetails"
                          placeholder=" "
                          value={itemDetails}
                          onChange={(e) => setItemDetails(e.target.value)}
                        />
                        <label htmlFor="stockDetails">Details</label>
                      </div>

                      <div className="input-group">
                        <input
                          type="file"
                          id="itemImage"
                          accept="image/*"
                          onChange={(e) => setItemImage(e.target.files[0])}
                        />
                        <label htmlFor="itemImage">Item Image</label>
                      </div>

                      <div className="product-form-actions">
                        <button
                          type="button"
                          className="product-cancel-btn"
                          onClick={() => setShowAddStockPopup(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="product-submit-btn"
                          disabled={addingStock}
                        >
                          {addingStock ? "Adding..." : "Add Stock"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {activeManagementTab === "receipt" && (
                <div className="transaction-page">
                  <div className="transaction-header">
                    <div>
                      <h3>Transaction Receipt</h3>
                      <p>All completed stock transactions are recorded here.</p>
                    </div>

                    <button
                      className="secondary-button"
                      onClick={fetchTransactions}
                    >
                      Refresh
                    </button>
                  </div>

                  {transactionLoading ? (
                    <div className="transaction-empty">
                      Loading transactions...
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="transaction-empty">
                      No transactions recorded yet.
                    </div>
                  ) : (
                    <div className="transaction-table-wrapper">
                      <table className="transaction-table">
                        <thead>
                          <tr>
                            <th>Receipt #</th>
                            <th>Item</th>
                            <th>Quantity</th>
                            <th>Requested By</th>
                            <th>Received By</th>
                            <th>Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {transactions.map((transaction) => (
                            <tr key={transaction.id}>
                              <td data-label="Receipt #">
                                #{String(transaction.id).padStart(6, "0")}
                              </td>

                              <td data-label="Item">
                                <strong>{transaction.item_name}</strong>
                              </td>

                              <td data-label="Quantity">
                                {transaction.amount}
                              </td>

                              <td data-label="Requested by">
                                <div className="transaction-person">
                                  <strong>{transaction.user_name}</strong>
                                  <span>{transaction.email}</span>
                                </div>
                              </td>

                              <td data-label="Received by">
                                {transaction.received_by || "—"}
                              </td>

                              <td data-label="Date">
                                {transaction.claimed_at
                                  ? new Date(
                                      transaction.claimed_at,
                                    ).toLocaleString()
                                  : "—"}
                              </td>

                              <td data-label="Status">
                                <span className="transaction-status">
                                  {transaction.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>;
}

export default InventoryPage;
