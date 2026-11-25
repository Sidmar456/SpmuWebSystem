import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, BackLink, Button, Card, ErrorSummary, Input, Spinner, Textarea, useErrorFocus } from '../../components/ui';
import { api, formErrors } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const LABELS = { name: 'Supplier name', contact_person: 'Contact person', email: 'Email', phone: 'Phone', address: 'Address', notes: 'Notes' };
const EMPTY = Object.fromEntries(Object.keys(LABELS).map((key) => [key, '']));

export default function SupplierForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const existing = useApi(id ? `/suppliers/${id}` : null);
    const [form, setForm] = useState(EMPTY);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    useEffect(() => {
        const s = existing.data?.supplier;
        if (s) setForm(Object.fromEntries(Object.keys(LABELS).map((key) => [key, s[key] ?? ''])));
    }, [existing.data]);

    const field = (name) => ({ name, value: form[name], onChange: (e) => setForm({ ...form, [name]: e.target.value }), error: errors[name] });

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            const res = id ? await api.put(`/suppliers/${id}`, form) : await api.post('/suppliers', form);
            navigate(`/suppliers/${res.data.supplier.id}`);
        } catch (error) {
            const result = formErrors(error, Object.keys(LABELS));
            setErrors(result.errors);
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    if (id && existing.loading) return <Spinner />;
    if (existing.error) return <Alert>{existing.error}</Alert>;

    return (
        <div className="space-y-4">
            <div>
                <BackLink to={id ? `/suppliers/${id}` : '/suppliers'}>{id ? 'Supplier details' : 'Suppliers'}</BackLink>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">{id ? `Edit ${existing.data.supplier.name}` : 'Add supplier'}</h1>
            </div>
            <Card>
                <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                    <Alert>{message}</Alert>
                    <ErrorSummary errors={errors} labels={LABELS} />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Supplier name" required autoComplete="organization" {...field('name')} />
                        <Input label="Contact person" autoComplete="off" {...field('contact_person')} />
                        <Input label="Email" type="email" autoComplete="off" hint="Used when sending stock requests." {...field('email')} />
                        <Input label="Phone" type="tel" autoComplete="off" {...field('phone')} />
                    </div>
                    <Input label="Address" autoComplete="off" {...field('address')} />
                    <Textarea label="Notes" hint="e.g. delivery days, PhilGEPS number, terms." {...field('notes')} />
                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => navigate(-1)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy}>
                            {busy ? 'Saving…' : id ? 'Save changes' : 'Add supplier'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
