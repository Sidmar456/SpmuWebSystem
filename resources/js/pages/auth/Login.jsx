import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Input, useErrorFocus } from '../../components/ui';
import { errorMessage, fieldErrors } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import AuthShell from './AuthShell';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const notice = location.state?.notice; // e.g. "Account request submitted" after sign up
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            await login(form.email, form.password);
            navigate(location.state?.from ?? '/', { replace: true });
        } catch (error) {
            const fields = fieldErrors(error);
            Object.keys(fields).length ? setErrors(fields) : setMessage(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthShell
            title="Log in"
            subtitle="Electronic Supply Requisition, PR Tracking, and Asset Turnover System"
            footer={
                <>
                    No account yet?{' '}
                    <Link to="/register" className="font-medium text-brand hover:underline">
                        Request an account
                    </Link>
                </>
            }
        >
            <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                {!message && <Alert kind="success">{notice}</Alert>}
                <Alert>{message}</Alert>
                <Input label="Email" name="email" type="email" autoComplete="email" required value={form.email} onChange={set('email')} error={errors.email} />
                <Input
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={set('password')}
                    error={errors.password}
                />
                <p className="text-right text-sm">
                    <Link to="/forgot-password" className="inline-flex min-h-11 items-center font-medium text-brand hover:underline sm:min-h-0">
                        Forgot password?
                    </Link>
                </p>
                <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? 'Logging in…' : 'Log in'}
                </Button>
            </form>
        </AuthShell>
    );
}
