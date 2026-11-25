import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import AccountList from './pages/accounts/AccountList';
import Login from './pages/auth/Login';
import { ForgotPassword, ResetPassword } from './pages/auth/PasswordReset';
import { ClearanceSlip, RequestSlip, TurnoverSlip } from './pages/print/Slips';
import Dashboard from './pages/dashboard/Dashboard';
import History from './pages/history/History';
import Notifications from './pages/notifications/Notifications';
import Register from './pages/auth/Register';
import RequestDetail from './pages/requests/RequestDetail';
import RequestForm from './pages/requests/RequestForm';
import RequestList from './pages/requests/RequestList';
import ItemDetail from './pages/stocks/ItemDetail';
import SupplierDetail from './pages/suppliers/SupplierDetail';
import SupplierForm from './pages/suppliers/SupplierForm';
import SupplierList from './pages/suppliers/SupplierList';
import TurnoverDetail from './pages/turnovers/TurnoverDetail';
import TurnoverForm from './pages/turnovers/TurnoverForm';
import TurnoverList from './pages/turnovers/TurnoverList';
import ItemForm from './pages/stocks/ItemForm';
import ItemList from './pages/stocks/ItemList';

/** Logged-in screens. `admin` also requires the admin role. */
function RequireAuth({ admin = false }) {
    const { user, isAdmin } = useAuth();
    const location = useLocation();
    if (user === undefined) return <Spinner />;
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    if (admin && !isAdmin) return <Navigate to="/" replace />;
    return <Outlet />;
}

/** Admins start on the dashboard, personnel on the stock list. */
function Home() {
    const { isAdmin } = useAuth();
    return <Navigate to={isAdmin ? '/dashboard' : '/stocks'} replace />;
}

/** Login and sign up: send logged-in people home. */
function GuestOnly() {
    const { user } = useAuth();
    if (user === undefined) return <Spinner />;
    return user ? <Navigate to="/" replace /> : <Outlet />;
}

function App() {
    return (
        <Routes>
            <Route element={<GuestOnly />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
            </Route>

            <Route element={<RequireAuth />}>
                {/* Paper slips: no sidebar or header. */}
                <Route path="/requests/:id/print" element={<RequestSlip />} />
                <Route path="/turnovers/:id/print" element={<TurnoverSlip />} />
                <Route path="/clearance/:id" element={<ClearanceSlip />} />
                <Route element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="/stocks" element={<ItemList />} />
                    <Route path="/stocks/:id" element={<ItemDetail />} />
                    <Route path="/requests" element={<RequestList />} />
                    <Route path="/requests/new" element={<RequestForm />} />
                    <Route path="/requests/:id" element={<RequestDetail />} />
                    <Route path="/turnovers" element={<TurnoverList />} />
                    <Route path="/turnovers/new" element={<TurnoverForm />} />
                    <Route path="/turnovers/:id" element={<TurnoverDetail />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route element={<RequireAuth admin />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/accounts" element={<AccountList />} />
                        <Route path="/suppliers" element={<SupplierList />} />
                        <Route path="/suppliers/new" element={<SupplierForm />} />
                        <Route path="/suppliers/:id" element={<SupplierDetail />} />
                        <Route path="/suppliers/:id/edit" element={<SupplierForm />} />
                        <Route path="/stocks/new" element={<ItemForm />} />
                        <Route path="/stocks/:id/edit" element={<ItemForm />} />
                    </Route>
                    <Route path="*" element={<p className="text-sm text-slate-600">Page not found.</p>} />
                </Route>
            </Route>
        </Routes>
    );
}

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <App />
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
);
