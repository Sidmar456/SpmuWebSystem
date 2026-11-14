import { useState } from "react";

function Login({ onLogin }) {
  // Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign up
  const [name, setName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // General states
  const [activeSection, setActiveSection] = useState("login");
  const [loading, setLoading] = useState(false);

  // Messages
  const [error, setError] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");

  // =========================
  // LOGIN
  // =========================

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost/smplDB/login.php", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      setLoading(false);
      onLogin(data.user ?? null);
      return;
    } catch (error) {
      console.error("Login error:", error);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SIGN UP
  // =========================

  const handleSignup = async (e) => {
    e.preventDefault();

    setSignupError("");
    setSignupSuccess("");

    // Check passwords
    if (signupPassword !== confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    // Minimum password length
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost/smplDB/signup.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email: signupEmail,
          password: signupPassword,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setSignupError(data.message || "Signup failed.");
        return;
      }

      setSignupSuccess(
        "Account request submitted successfully. Please wait while an administrator accepts your account request.",
      );

      // Clear form
      setName("");
      setSignupEmail("");
      setSignupPassword("");
      setConfirmPassword("");

      // Go back to login
      setTimeout(() => {
        setActiveSection("login");
        setSignupSuccess("");
      }, 1500);
    } catch (error) {
      console.error("Signup error:", error);
      setSignupError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // SWITCH TO SIGNUP
  // =========================

  const showSignup = () => {
    setError("");
    setSignupError("");
    setSignupSuccess("");
    setActiveSection("signup");
  };

  // =========================
  // SWITCH TO LOGIN
  // =========================

  const showLogin = () => {
    setError("");
    setSignupError("");
    setSignupSuccess("");
    setActiveSection("login");
  };

  return (
    <div className="login-page">
      {/* HEADER */}
      <header className="landing-header">
        <div className="brand-logo">
          SPMU<span>.</span>
        </div>
      </header>

      {/* ==================================================
          LOGIN PAGE
      ================================================== */}

      {activeSection === "login" && (
        <section className="login-section">
          <div className="login-box">
            <h1>Welcome Back</h1>

            <p>Sign in to continue to SPMU</p>

            <form onSubmit={handleLogin}>
              {/* EMAIL */}
              <div className="login-input">
                <label>Email</label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="login-input">
                <label>Password</label>

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* ERROR */}
              {error && <div className="login-error">{error}</div>}

              {/* LOGIN BUTTON */}
              <button type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>

            {/* SIGN UP LINK */}
            <div className="auth-switch">
              <span>Don't have an account?</span>

              <button type="button" onClick={showSignup}>
                Sign up
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ==================================================
          SIGN UP PAGE
      ================================================== */}

      {activeSection === "signup" && (
        <section className="login-section">
          <div className="login-box signup-box">
            <h1>Create Account</h1>

            <p>Create your SPMU account</p>

            <form onSubmit={handleSignup}>
              {/* NAME */}
              <div className="login-input">
                <label>Full Name</label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* EMAIL */}
              <div className="login-input">
                <label>Email</label>

                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* PASSWORD */}
              <div className="login-input">
                <label>Password</label>

                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="login-input">
                <label>Confirm Password</label>

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              {/* ERROR */}
              {signupError && <div className="login-error">{signupError}</div>}

              {/* SUCCESS */}
              {signupSuccess && (
                <div className="signup-success">{signupSuccess}</div>
              )}

              {/* CREATE ACCOUNT */}
              <button type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
            {signupSuccess && (
              <div className="signup-success">
                <strong>Request Submitted</strong>
                <span>{signupSuccess}</span>
              </div>
            )}

            {/* LOGIN LINK */}
            <div className="auth-switch">
              <span>Already have an account?</span>

              <button type="button" onClick={showLogin}>
                Login
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default Login;
