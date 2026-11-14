import { useEffect, useState } from "react";
import {
  FiUser,
  FiMail,
  FiLock,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit2,
  FiSave,
  FiX,
  FiKey,
} from "react-icons/fi";
import { apiFetch } from "../utils/api";

function AdminProfilePage({ page, user, onUpdateUser }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleStartEdit = () => {
    setIsEditing(true);
    setErrorMsg("");
    setSuccessMsg("");
    setName(user?.name || "");
    setEmail(user?.email || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg("");
    setSuccessMsg("");
    setName(user?.name || "");
    setEmail(user?.email || "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim() || !email.trim()) {
      setErrorMsg("Name and email are required.");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setErrorMsg("New password must be at least 6 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("New passwords do not match.");
        return;
      }
      if (!currentPassword) {
        setErrorMsg("Current password is required to set a new password.");
        return;
      }
    }

    setUpdating(true);

    try {
      const response = await apiFetch("update_profile.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMsg(data.message || "Profile updated successfully!");

        if (data.user && onUpdateUser) {
          onUpdateUser(data.user);
        }

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");

        setTimeout(() => {
          setIsEditing(false);
          setSuccessMsg("");
        }, 1500);
      } else {
        setErrorMsg(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Profile update error:", err);
      setErrorMsg("Unable to connect to server. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const adminInitial = (user?.name || "Admin").charAt(0).toUpperCase();

  return (
    <div className="admin-profile-container">
      {/* Page Heading */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">{page?.eyebrow || "Account Management"}</p>
          <h1>{page?.title || "Administrator Profile"}</h1>
          <p className="page-description">
            {page?.description ||
              "Manage your administrator credentials, contact information, and security settings."}
          </p>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="admin-profile-card">
        {/* Profile Header Banner */}
        <div className="admin-profile-banner">
          <div className="admin-avatar-large">{adminInitial}</div>
          <div className="admin-banner-meta">
            <h2>{user?.name || "System Administrator"}</h2>
            <p className="admin-email-text">{user?.email || "spmuinventory@gmail.com"}</p>
            <div className="admin-badge-strip">
              <span className="badge-admin-role">
                <FiShield /> System Administrator
              </span>
              <span className="badge-admin-status">
                <FiCheckCircle /> Active Admin
              </span>
            </div>
          </div>

          {!isEditing && (
            <button
              type="button"
              className="btn-edit-admin-profile"
              onClick={handleStartEdit}
            >
              <FiEdit2 /> Edit Profile
            </button>
          )}
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="admin-profile-alert error">
            <FiAlertCircle /> <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="admin-profile-alert success">
            <FiCheckCircle /> <span>{successMsg}</span>
          </div>
        )}

        {/* Read-Only Mode */}
        {!isEditing ? (
          <div className="admin-profile-grid">
            <div className="admin-card-section">
              <h3>Admin Credentials</h3>
              <p className="section-subtitle">Basic details used for system identification</p>

              <div className="admin-info-rows">
                <div className="admin-info-row">
                  <span className="label">
                    <FiUser /> Full Name
                  </span>
                  <span className="value">{user?.name || "Administrator"}</span>
                </div>

                <div className="admin-info-row">
                  <span className="label">
                    <FiMail /> Email Address
                  </span>
                  <span className="value">{user?.email || "—"}</span>
                </div>

                <div className="admin-info-row">
                  <span className="label">
                    <FiShield /> Assigned Role
                  </span>
                  <span className="value role-highlight">
                    {String(user?.role || "admin").toUpperCase()}
                  </span>
                </div>

                <div className="admin-info-row">
                  <span className="label">
                    <FiLock /> Password
                  </span>
                  <span className="value">••••••••••••••</span>
                </div>
              </div>
            </div>

            <div className="admin-card-section">
              <h3>System Security & Privileges</h3>
              <p className="section-subtitle">Scope of administrative control</p>

              <ul className="admin-privilege-list">
                <li>
                  <FiCheckCircle className="check-icon" />
                  <div>
                    <strong>Inventory Management</strong>
                    <p>Create, update stock, and archive inventory supplies.</p>
                  </div>
                </li>
                <li>
                  <FiCheckCircle className="check-icon" />
                  <div>
                    <strong>Supplier Communications</strong>
                    <p>Send official stock request notices and procurement queries.</p>
                  </div>
                </li>
                <li>
                  <FiCheckCircle className="check-icon" />
                  <div>
                    <strong>Request Approval & Claim Code Dispatch</strong>
                    <p>Approve user requests, trigger Gmail claim codes, and verify documents.</p>
                  </div>
                </li>
                <li>
                  <FiCheckCircle className="check-icon" />
                  <div>
                    <strong>User Access Authorization</strong>
                    <p>Approve or deny employee registration and access privileges.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          /* Edit Mode Form */
          <form className="admin-profile-form" onSubmit={handleSubmit}>
            <div className="form-subheading">
              <h3>Update Account Information</h3>
              <p>Change your contact name, email, or password credentials.</p>
            </div>

            <div className="admin-form-group">
              <label htmlFor="adminNameInput">Full Name</label>
              <input
                id="adminNameInput"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="adminEmailInput">Email Address</label>
              <input
                id="adminEmailInput"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>

            <div className="admin-password-block">
              <div className="password-block-header">
                <h4>
                  <FiKey /> Change Password (Optional)
                </h4>
                <p>Leave blank if you do not want to alter your password.</p>
              </div>

              <div className="admin-form-group">
                <label htmlFor="currentPasswordInput">Current Password</label>
                <input
                  id="currentPasswordInput"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Required only if changing password"
                />
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label htmlFor="newPasswordInput">New Password</label>
                  <input
                    id="newPasswordInput"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="confirmPasswordInput">Confirm New Password</label>
                  <input
                    id="confirmPasswordInput"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                className="btn-admin-cancel"
                onClick={handleCancelEdit}
                disabled={updating}
              >
                <FiX /> Cancel
              </button>
              <button
                type="submit"
                className="btn-admin-save"
                disabled={updating}
              >
                <FiSave /> {updating ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminProfilePage;
