import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, BackLink, Button, Card, EmptyState, ErrorSummary, Input, Select, Spinner, Textarea, useErrorFocus } from '../../components/ui';
import { api, formErrors } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { CONDITIONS, REASONS } from './labels';

const LABELS = {
    item_request_line_id: 'Property item',
    quantity: 'Quantity',
    reason: 'Reason',
    condition: 'Condition',
    remarks: 'Remarks',
};

export default function TurnoverForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const holdings = useApi('/turnovers/holdings');
    const [form, setForm] = useState({ item_request_line_id: searchParams.get('line') ?? '', quantity: '1', reason: '', condition: 'serviceable', remarks: '' });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    const lines = holdings.data?.data.filter((l) => l.turnable_quantity > 0) ?? [];
    const line = lines.find((l) => String(l.id) === String(form.item_request_line_id));

    const set = (field) => (e) => {
        const value = e.target.value;
        // A damaged item is almost always unserviceable; preselect it, the person can still change it.
        setForm({ ...form, [field]: value, ...(field === 'reason' && value === 'unserviceable' ? { condition: 'unserviceable' } : {}) });
    };

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            const res = await api.post('/turnovers', { ...form, quantity: Number(form.quantity) });
            navigate(`/turnovers/${res.data.turnover.id}`, {
                state: { notice: 'Turnover submitted. Bring the item to the Supply Office so they can receive it.' },
            });
        } catch (error) {
            const result = formErrors(error, Object.keys(LABELS));
            setErrors(result.errors);
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    if (holdings.loading && !holdings.data) return <Spinner />;
    if (holdings.error) return <Alert>{holdings.error}</Alert>;

    return (
        <div className="space-y-4">
            <div>
                <BackLink to="/turnovers">My property</BackLink>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">Turn over property</h1>
                <p className="text-sm text-slate-600">Property Return Slip (PRS). Return a property item issued to you to the Supply Office.</p>
            </div>

            <Card>
                {lines.length === 0 ? (
                    <EmptyState>
                        You have no property to turn over.{' '}
                        <Link to="/turnovers" className="font-medium text-brand underline underline-offset-2">
                            Back to my property
                        </Link>
                    </EmptyState>
                ) : (
                    <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                        <Alert>{message}</Alert>
                        <ErrorSummary errors={errors} labels={LABELS} />

                        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                            <Select
                                label="Property item"
                                name="item_request_line_id"
                                required
                                value={form.item_request_line_id}
                                onChange={set('item_request_line_id')}
                                error={errors.item_request_line_id}
                                hint={line && `From ${line.request.request_no}. You can return up to ${line.turnable_quantity} ${line.item.unit}.`}
                            >
                                <option value="">Choose an item</option>
                                {lines.map((l) => (
                                    <option key={l.id} value={l.id}>
                                        {l.item.name} ({l.item.stock_no}) · {l.request.request_no}
                                    </option>
                                ))}
                            </Select>
                            <Input
                                label={line ? `Quantity (${line.item.unit})` : 'Quantity'}
                                name="quantity"
                                type="number"
                                inputMode="numeric"
                                min="1"
                                max={line?.turnable_quantity}
                                step="1"
                                required
                                value={form.quantity}
                                onChange={set('quantity')}
                                error={errors.quantity}
                            />
                        </div>

                        <Select label="Reason" name="reason" required value={form.reason} onChange={set('reason')} error={errors.reason}>
                            <option value="">Choose a reason</option>
                            {Object.entries(REASONS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </Select>

                        <fieldset aria-describedby={errors.condition ? 'condition-error' : undefined}>
                            <legend className="text-sm font-medium text-slate-700">
                                Condition
                                <span aria-hidden="true" className="text-red-600">
                                    {' '}
                                    *
                                </span>
                                <span className="sr-only"> (required)</span>
                            </legend>
                            <div className="mt-1 grid gap-2 sm:grid-cols-2">
                                {Object.entries(CONDITIONS).map(([value, [label, hint]]) => (
                                    <label
                                        key={value}
                                        className={`flex min-h-11 cursor-pointer gap-3 rounded-md p-3 text-sm ring-1 transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-brand ${
                                            form.condition === value ? 'bg-blue-50 ring-brand' : 'bg-white ring-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="condition"
                                            value={value}
                                            checked={form.condition === value}
                                            onChange={set('condition')}
                                            className="mt-0.5 size-4 accent-brand"
                                        />
                                        <span>
                                            <span className="block font-medium text-slate-900">{label}</span>
                                            <span className="block text-xs text-slate-600">{hint}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {errors.condition && (
                                <p id="condition-error" className="mt-1 text-sm text-red-700">
                                    {errors.condition}
                                </p>
                            )}
                        </fieldset>

                        <Textarea
                            label="Remarks (optional)"
                            name="remarks"
                            maxLength={255}
                            hint="e.g. serial number, missing parts, office it is moving to."
                            value={form.remarks}
                            onChange={set('remarks')}
                            error={errors.remarks}
                        />

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => navigate(-1)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={busy}>
                                {busy ? 'Submitting…' : 'Submit turnover'}
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}
