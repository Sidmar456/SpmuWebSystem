import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import { AuthProvider, useAuth } from './lib/auth';
import AccountList from './pages/accounts/AccountList';
import Login from './pages/auth/Login';
import { ForgotPassword, ResetPassword } from './pages/auth/PasswordReset';
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

// Print slips and the inspection and procurement screens load only when opened, to keep the first download small.
const slip = (name) => lazy(() => import('./pages/print/Slips').then((m) => ({ default: m[name] })));
const [ClearanceSlip, IirupSlip, InquirySlip, IarSlip, IcsSlip, InspectionSlip, ParSlip, PurchaseRequestSlip, RequestSlip, TurnoverSlip] = [
    'ClearanceSlip', 'IirupSlip', 'InquirySlip', 'IarSlip', 'IcsSlip', 'InspectionSlip', 'ParSlip', 'PurchaseRequestSlip', 'RequestSlip', 'TurnoverSlip',
].map(slip);
const PurchaseRequestDetail = lazy(() => import('./pages/procurement/PurchaseRequestDetail'));
const PurchaseRequestForm = lazy(() => import('./pages/procurement/PurchaseRequestForm'));
const PurchaseRequestList = lazy(() => import('./pages/procurement/PurchaseRequestList'));
const InquiryDetail = lazy(() => import('./pages/procurement/InquiryDetail'));
const InquiryForm = lazy(() => import('./pages/procurement/InquiryForm'));
const InquiryList = lazy(() => import('./pages/procurement/InquiryList'));
const IirupDetail = lazy(() => import('./pages/turnovers/IirupDetail'));
const Unserviceable = lazy(() => import('./pages/turnovers/Unserviceable'));
const InspectionDetail = lazy(() => import('./pages/inspections/InspectionDetail'));
const InspectionForm = lazy(() => import('./pages/inspections/InspectionForm'));
const InspectionList = lazy(() => import('./pages/inspections/InspectionList'));

/** Logged-in screens. `admin` also requires the admin role. */
function RequireAuth({ admin = false }) {
    const { user, isAdmin } = useAuth();
    const location = useLocation();
    if (user === undefined) return <Spinner />;
    if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    if (admin && !isAdmin) return <Navigate to="/" replace />;
    return <Outlet />;
}

/** Admins start on the dashboard, BAC validators on PRs waiting for them, personnel on the stock list. */
function Home() {
    const { isAdmin, isValidator } = useAuth();
    return <Navigate to={isAdmin ? '/dashboard' : isValidator ? '/purchase-requests?waiting=1' : '/stocks'} replace />;
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
                <Route path="/inspections/:id/print" element={<InspectionSlip />} />
                <Route path="/iirups/:id/print" element={<IirupSlip />} />
                <Route path="/inquiries/:id/print" element={<InquirySlip />} />
                <Route path="/purchase-requests/:id/print" element={<PurchaseRequestSlip />} />
                <Route path="/purchase-requests/:id/iar" element={<IarSlip />} />
                <Route path="/purchase-requests/:id/ics" element={<IcsSlip />} />
                <Route path="/purchase-requests/:id/par" element={<ParSlip />} />
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
                    <Route path="/inquiries" element={<InquiryList />} />
                    <Route path="/inquiries/new" element={<InquiryForm />} />
                    <Route path="/inquiries/:id" element={<InquiryDetail />} />
                    <Route path="/purchase-requests" element={<PurchaseRequestList />} />
                    <Route path="/purchase-requests/new" element={<PurchaseRequestForm />} />
                    <Route path="/purchase-requests/:id" element={<PurchaseRequestDetail />} />
                    <Route path="/inspections" element={<InspectionList />} />
                    <Route path="/inspections/new" element={<InspectionForm />} />
                    <Route path="/inspections/:id" element={<InspectionDetail />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route element={<RequireAuth admin />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/accounts" element={<AccountList />} />
                        <Route path="/unserviceable" element={<Unserviceable />} />
                        <Route path="/iirups/:id" element={<IirupDetail />} />
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
                <Suspense fallback={<Spinner />}>
                    <App />
                </Suspense>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
);
