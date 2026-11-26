import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Input, useErrorFocus } from '../../components/ui';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import AuthShell from './AuthShell';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', office: '', password: '', password_confirmation: '', privacy_accepted: false });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            const res = await api.post('/register', form);
            navigate('/login', { state: { notice: res.data.message } });
        } catch (error) {
            const fields = fieldErrors(error);
            Object.keys(fields).length ? setErrors(fields) : setMessage(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthShell
            title="Request an account"
            subtitle="The Supply Office approves every account."
            footer={
                <>
                    Already approved?{' '}
                    <Link to="/login" className="font-medium text-brand hover:underline">
                        Log in
                    </Link>
                </>
            }
        >
            <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                <Alert>{message}</Alert>
                <Input label="Full name" autoComplete="name" required value={form.name} name="name" onChange={set('name')} error={errors.name} />
                <Input label="Email" type="email" autoComplete="email" required value={form.email} name="email" onChange={set('email')} error={errors.email} />
                <Input
                    label="College or office"
                    placeholder="e.g. College of Engineering"
                    required
                    value={form.office}
                    name="office" onChange={set('office')}
                    error={errors.office}
                />
                <Input
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    required
                    hint="At least 8 characters."
                    value={form.password}
                    name="password" onChange={set('password')}
                    error={errors.password}
                />
                <Input
                    label="Confirm password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={form.password_confirmation}
                    name="password_confirmation" onChange={set('password_confirmation')}
                />
                <div className="space-y-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                    <p className="font-medium text-slate-900">Privacy notice</p>
                    <p id="privacy-text">
                        Under the Data Privacy Act of 2012 (RA 10173), the ZPPSU Supply Office collects your name, email and office to approve your
                        account, process your item requests and turnovers, and send you updates. Only Supply Office staff can see it. Contact the Supply
                        Office to see, correct or remove your data.
                    </p>
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 pt-1">
                        <input
                            type="checkbox"
                            name="privacy_accepted"
                            checked={form.privacy_accepted}
                            onChange={(e) => setForm({ ...form, privacy_accepted: e.target.checked })}
                            aria-invalid={!!errors.privacy_accepted || undefined}
                            aria-describedby={errors.privacy_accepted ? 'privacy-error' : 'privacy-text'}
                            className="mt-0.5 size-5 shrink-0 accent-brand"
                        />
                        <span>I have read the privacy notice and agree.</span>
                    </label>
                    {errors.privacy_accepted && (
                        <p id="privacy-error" className="text-sm text-red-700">
                            {errors.privacy_accepted}
                        </p>
                    )}
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? 'Submitting…' : 'Submit request'}
                </Button>
            </form>
        </AuthShell>
    );
}
