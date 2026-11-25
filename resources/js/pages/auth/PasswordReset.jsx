import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Input, useErrorFocus } from '../../components/ui';
import { api, formErrors } from '../../lib/api';
import AuthShell from './AuthShell';

const backToLogin = (
    <Link to="/login" className="font-medium text-brand hover:underline">
        Back to log in
    </Link>
);

/** Step 1: ask for the email. The answer is the same whether or not the account exists. */
export function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            setSent((await api.post('/forgot-password', { email })).data.message);
        } catch (error) {
            const result = formErrors(error, ['email']);
            setErrors(result.errors);
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthShell title="Reset your password" subtitle="We will email you a link to choose a new one." footer={backToLogin}>
            {sent ? (
                <Alert kind="success">{sent}</Alert>
            ) : (
                <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                    <Alert>{message}</Alert>
                    <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
                    <Button type="submit" className="w-full" disabled={busy}>
                        {busy ? 'Sending…' : 'Send reset link'}
                    </Button>
                </form>
            )}
        </AuthShell>
    );
}

/** Step 2: the link from the email lands here with ?token=…&email=… */
export function ResetPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [form, setForm] = useState({ password: '', password_confirmation: '' });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            const res = await api.post('/reset-password', { token, email, ...form });
            navigate('/login', { state: { notice: res.data.message } });
        } catch (error) {
            const result = formErrors(error, ['password']);
            setErrors(result.errors);
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthShell title="Choose a new password" subtitle={email} footer={backToLogin}>
            {!token || !email ? (
                <Alert>
                    This link is incomplete. <Link to="/forgot-password" className="font-medium underline">Ask for a new one.</Link>
                </Alert>
            ) : (
                <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                    <Alert>{message}</Alert>
                    <Input
                        label="New password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        hint="At least 8 characters."
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        error={errors.password}
                    />
                    <Input
                        label="Confirm new password"
                        name="password_confirmation"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={form.password_confirmation}
                        onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                    />
                    <Button type="submit" className="w-full" disabled={busy}>
                        {busy ? 'Saving…' : 'Change password'}
                    </Button>
                </form>
            )}
        </AuthShell>
    );
}
