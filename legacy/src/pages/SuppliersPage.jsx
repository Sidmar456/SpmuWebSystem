import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

function SuppliersPage({ page }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);

  const [supplierName, setSupplierName] = useState("");
  const [supplierContact, setSupplierContact] = useState("");
  const [supplierContactNumber, setSupplierContactNumber] = useState("");
  const [supplierContract, setSupplierContract] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [requestItems, setRequestItems] = useState([
    { item_name: "", quantity: "1" },
  ]);

  const [requestMessage, setRequestMessage] = useState("");

  const [sendingRequest, setSendingRequest] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const suppliersPerPage = 5;

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiFetch(
        "get_suppliers.php",
        {
          method: "GET",
          credentials: "include",
        },
      );

      const data = await response.json();

      console.log("Suppliers:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to load suppliers.");
      }

      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error("Supplier error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const totalPages = Math.ceil(suppliers.length / suppliersPerPage);

  const startIndex = (currentPage - 1) * suppliersPerPage;

  const currentSuppliers = suppliers.slice(
    startIndex,
    startIndex + suppliersPerPage,
  );

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Actions
  |--------------------------------------------------------------------------
  */

  const handleAddSupplier = () => {
    setSupplierName("");
    setSupplierContact("");
    setSupplierContactNumber("");
    setSupplierContract("");
    setShowAddSupplier(true);
  };
  const saveSupplier = async () => {
    if (!supplierName.trim()) {
      alert("Please enter the supplier name.");
      return;
    }

    if (!supplierContact.trim()) {
      alert("Please enter the supplier email.");
      return;
    }

    if (!supplierContactNumber.trim()) {
      alert("Please enter the contact number.");
      return;
    }

    if (!supplierContract.trim()) {
      alert("Please enter the contract.");
      return;
    }

    setAddingSupplier(true);

    try {
      const response = await apiFetch("add_supplier.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",

        body: JSON.stringify({
          name: supplierName.trim(),
          email: supplierContact.trim(),
          phone: supplierContactNumber.trim(),
          contract: supplierContract.trim(),
        }),
      });

      const data = await response.json();

      console.log("Add supplier response:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to add supplier.");
      }

      alert("Supplier added successfully!");

      setShowAddSupplier(false);

      setSupplierName("");
      setSupplierContact("");
      setSupplierContactNumber("");
      setSupplierContract("");

      await fetchSuppliers();

      setCurrentPage(1);
    } catch (error) {
      console.error("Add supplier error:", error);

      alert(`Failed to add supplier: ${error.message}`);
    } finally {
      setAddingSupplier(false);
    }
  };

  const handleSendRequest = (supplier) => {
    if (!supplier.email) {
      alert("This supplier does not have an email address.");
      return;
    }

    setSelectedSupplier(supplier);

    // Start with one empty item row
    setRequestItems([{ item_name: "", quantity: "1" }]);

    setRequestMessage(
      "Please provide your best quotation, available quantity, expected delivery date, and payment terms.",
    );

    setShowRequestModal(true);
  };

  const sendSupplierRequest = async () => {
    if (!selectedSupplier) {
      alert("No supplier selected.");
      return;
    }

    // Validate all item rows
    const items = requestItems.map((item) => ({
      item_name: item.item_name.trim(),
      quantity: Number(item.quantity),
    }));

    if (items.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    const invalidItem = items.find(
      (item) =>
        !item.item_name ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0,
    );

    if (invalidItem) {
      alert(
        "Please enter an item name and a valid whole-number quantity for every item.",
      );
      return;
    }

    if (!requestMessage.trim()) {
      alert("Please enter a message.");
      return;
    }

    setSendingRequest(true);

    try {
      const response = await apiFetch(
        "send_supplier_request.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            supplier_id: selectedSupplier.id,
            items: items,
            message: requestMessage.trim(),
          }),
        },
      );

      const data = await response.json();

      console.log("Supplier request response:", data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to send supplier request.");
      }

      const itemSummary = items
        .map((item) => `${item.item_name} — Quantity: ${item.quantity}`)
        .join("\n");

      alert(
        `Request sent successfully!\n\n` +
          `Supplier: ${selectedSupplier.name}\n\n` +
          `Requested items:\n${itemSummary}`,
      );

      setShowRequestModal(false);
      setSelectedSupplier(null);
      setRequestItems([{ item_name: "", quantity: "1" }]);
      setRequestMessage("");
    } catch (error) {
      console.error("Send supplier request error:", error);

      alert(`Failed to send request:\n\n${error.message}`);
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRemoveSupplier = async (supplier) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${supplier.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        "remove_supplier.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            id: supplier.id,
          }),
        },
      );

      const data = await response.json();

      console.log("Remove supplier response:", data);

      if (!data.success) {
        throw new Error(data.message || "Failed to remove supplier.");
      }

      alert("Supplier removed successfully.");

      // Reload suppliers from database
      await fetchSuppliers();

      // Go back to page 1 if the current page becomes empty
      if (suppliers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      console.error("Remove supplier error:", error);

      alert(`Failed to remove supplier: ${error.message}`);
    }
  };

  return (
    <>
      {showRequestModal && selectedSupplier && (
        <div className="supplier-modal-overlay">
          <div className="supplier-modal">
            <div className="supplier-modal-header">
              <div>
                <h2>Send Stock Request</h2>

                <p>Create a stock request for this supplier.</p>
              </div>

              <button
                type="button"
                className="supplier-modal-close"
                onClick={() => {
                  if (!sendingRequest) {
                    setShowRequestModal(false);
                  }
                }}
                disabled={sendingRequest}
              >
                ×
              </button>
            </div>

            <div className="supplier-form">
              {/* Supplier */}
              <div className="supplier-form-group">
                <label>Supplier</label>

                <input type="text" value={selectedSupplier.name} disabled />
              </div>

              {/* Supplier Email */}
              <div className="supplier-form-group">
                <label>Supplier Email</label>

                <input type="email" value={selectedSupplier.email} disabled />
              </div>

              {/* Multiple Items */}
              <div className="supplier-form-group">
                <div className="request-items-header">
                  <label>Requested Items</label>

                  <button
                    type="button"
                    className="add-request-item-btn"
                    onClick={() =>
                      setRequestItems((prev) => [
                        ...prev,
                        { item_name: "", quantity: "1" },
                      ])
                    }
                    disabled={sendingRequest}
                  >
                    + Add Item
                  </button>
                </div>

                {requestItems.map((item, index) => (
                  <div className="request-item-row" key={index}>
                    <div className="request-item-input">
                      <label>Item Name {index + 1}</label>

                      <input
                        type="text"
                        placeholder="Example: Bond Paper"
                        value={item.item_name}
                        onChange={(e) => {
                          const value = e.target.value;

                          setRequestItems((prev) =>
                            prev.map((row, i) =>
                              i === index ? { ...row, item_name: value } : row,
                            ),
                          );
                        }}
                        disabled={sendingRequest}
                      />
                    </div>

                    <div className="request-quantity-input">
                      <label>Quantity</label>

                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Quantity"
                        value={item.quantity}
                        onChange={(e) => {
                          const value = e.target.value;

                          setRequestItems((prev) =>
                            prev.map((row, i) =>
                              i === index ? { ...row, quantity: value } : row,
                            ),
                          );
                        }}
                        disabled={sendingRequest}
                      />
                    </div>

                    <button
                      type="button"
                      className="remove-request-item-btn"
                      onClick={() =>
                        setRequestItems((prev) =>
                          prev.filter((_, i) => i !== index),
                        )
                      }
                      disabled={sendingRequest || requestItems.length === 1}
                      title="Remove item"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {/* Message */}
              <div className="supplier-form-group">
                <label>Message</label>

                <textarea
                  placeholder="Enter your request message..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  rows="6"
                  disabled={sendingRequest}
                />
              </div>
              <div className="supplier-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowRequestModal(false)}
                  disabled={sendingRequest}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={sendSupplierRequest}
                  disabled={sendingRequest}
                >
                  {sendingRequest ? "Sending..." : "Send Request"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddSupplier && (
        <div className="supplier-modal-overlay">
          <div className="supplier-modal">
            <div className="supplier-modal-header">
              <div>
                <h2>Add Supplier</h2>
                <p>Enter the supplier information below.</p>
              </div>

              <button
                type="button"
                className="supplier-modal-close"
                onClick={() => setShowAddSupplier(false)}
              >
                ×
              </button>
            </div>

            <div className="supplier-form">
              <div className="supplier-form-group">
                <label>Supplier Name</label>

                <input
                  type="text"
                  placeholder="Enter supplier name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </div>

              <div className="supplier-form-group">
                <label>Contact Email</label>

                <input
                  type="email"
                  placeholder="Email"
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                />
              </div>
              <div className="supplier-form-group">
                <label>Contact Number</label>

                <input
                  type="tel"
                  placeholder="Enter contact number"
                  value={supplierContactNumber}
                  onChange={(e) => setSupplierContactNumber(e.target.value)}
                />
              </div>
              <div className="supplier-form-group">
                <label>Contract</label>

                <input
                  type="text"
                  placeholder="Enter contract information"
                  value={supplierContract}
                  onChange={(e) => setSupplierContract(e.target.value)}
                />
              </div>
              <div className="supplier-modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowAddSupplier(false)}
                  disabled={addingSupplier}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={saveSupplier}
                  disabled={addingSupplier}
                >
                  {addingSupplier ? "Adding..." : "Add Supplier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="page-heading">
        <div>
          <p className="eyebrow">{page.eyebrow}</p>

          <h1>Suppliers</h1>

          <p className="page-description">{page.description}</p>
        </div>

        <button className="primary-button" onClick={handleAddSupplier}>
          + Add supplier
        </button>
      </div>

      <div className="page-panel">
        <div className="suppliers-table-main">
          <h2>Manage Suppliers</h2>

          <p className="page-description">
            Manage your suppliers and their contracts.
          </p>

          {loading && <p>Loading suppliers...</p>}

          {error && <p className="error-message">{error}</p>}

          {!loading && !error && (
            <table className="suppliers-table">
              <thead className="suppliers-table-head">
                <tr>
                  <th>Suppliers</th>
                  <th>Contact</th>
                  <th>Contract</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {currentSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: "center" }}>
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  currentSuppliers.map((supplier) => (
                    <tr key={supplier.id}>
                      <td>
                        <strong>{supplier.name}</strong>
                      </td>

                      <td>
                        <div>{supplier.email || "No email"}</div>

                        {supplier.phone && <small>{supplier.phone}</small>}
                      </td>

                      <td>{supplier.contract || "No contract"}</td>

                      <td>
                        <div className="supplier-actions">
                          <button
                            className="edit-button"
                            onClick={() => handleSendRequest(supplier)}
                          >
                            Send Request
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveSupplier(supplier)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          <div className="btn-table">
            <button
              className="back-table"
              onClick={previousPage}
              disabled={currentPage === 1}
            >
              Back
            </button>

            <span>
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              className="next-table"
              onClick={nextPage}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SuppliersPage;
