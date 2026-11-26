import { Plus, Trash } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, BackLink, Button, Card, EmptyState, ErrorSummary, formatPeso, Input, Spinner, Textarea, useErrorFocus } from '../../components/ui';
import { api, formErrors } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const blank = () => ({ inquiry_line_id: null, description: '', unit: '', quantity: '1', unit_cost: '' });

/**
 * Two sources, as in the office flow: ?inquiry= (items the SAI tagged not available)
 * or ?inspection= (parts for equipment found for replacement, repair or recoverable).
 */
export default function PurchaseRequestForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inquiryId = searchParams.get('inquiry');
    const inspectionId = searchParams.get('inspection');
    const source = useApi(inquiryId ? `/inquiries/${inquiryId}` : inspectionId ? `/inspections/${inspectionId}` : null);
    const [purpose, setPurpose] = useState('');
    const [lines, setLines] = useState([]);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    // Fill the form once the source loads.
    useEffect(() => {
        if (!source.data) return;
        if (inquiryId) {
            const q = source.data.inquiry;
            setPurpose(q.purpose);
            setLines(
                q.lines
                    .filter((l) => l.availability === 'not_available' && !l.purchase_request_line)
                    .map((l) => ({ inquiry_line_id: l.id, description: l.description, unit: l.unit, quantity: String(l.quantity), unit_cost: '' })),
            );
        } else {
            const i = source.data.inspection;
            setPurpose(`Parts for ${i.line.item.name} (${i.line.item.stock_no}), per ${i.inspection_no}`);
            setLines([blank()]);
        }
    }, [source.data]);

    const setLine = (index, field) => (e) => setLines(lines.map((l, i) => (i === index ? { ...l, [field]: e.target.value } : l)));
    const lineTotal = (l) => (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0);
    const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);

    const labels = { purpose: 'Purpose', lines: 'Items', inquiry_id: 'Availability inquiry', inspection_id: 'Pre-inspection report' };
    lines.forEach((_, i) => {
        labels[`lines.${i}.description`] = `Item ${i + 1} description`;
        labels[`lines.${i}.unit`] = `Item ${i + 1} unit`;
        labels[`lines.${i}.quantity`] = `Item ${i + 1} quantity`;
        labels[`lines.${i}.unit_cost`] = `Item ${i + 1} estimated unit cost`;
        labels[`lines.${i}.inquiry_line_id`] = `Item ${i + 1}`;
    });

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            const res = await api.post('/purchase-requests', {
                purpose,
                ...(inquiryId ? { inquiry_id: Number(inquiryId) } : { inspection_id: Number(inspectionId) }),
                lines: lines.map((l) => ({ ...l, quantity: Number(l.quantity), unit_cost: l.unit_cost === '' ? '' : Number(l.unit_cost) })),
            });
            navigate(`/purchase-requests/${res.data.purchase_request.id}`, { state: { notice: 'Purchase request submitted. Print it and forward it to the TWG for checking.' } });
        } catch (error) {
            const result = formErrors(error, Object.keys(labels));
            setErrors(result.errors);
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    if (!inquiryId && !inspectionId) {
        return (
            <EmptyState>
                Start a purchase request from an{' '}
                <Link to="/inquiries" className="font-medium text-brand underline underline-offset-2">
                    answered availability inquiry
                </Link>{' '}
                or a pre-inspection report.
            </EmptyState>
        );
    }
    if (source.loading && !source.data) return <Spinner />;
    if (source.error) return <Alert>{source.error}</Alert>;

    const fromLabel = inquiryId ? source.data.inquiry.inquiry_no : source.data.inspection.inspection_no;
    const freeLines = !!inspectionId;

    return (
        <div className="space-y-4">
            <div>
                <BackLink to={inquiryId ? `/inquiries/${inquiryId}` : `/inspections/${inspectionId}`}>{fromLabel}</BackLink>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">New purchase request</h1>
                <p className="text-sm text-slate-600">
                    {inquiryId ? 'Items the Supply Office tagged not available. Add the specifications and an estimated unit cost.' : 'Parts or consumables for the inspected equipment.'}
                </p>
            </div>

            {lines.length === 0 && inquiryId ? (
                <Card>
                    <EmptyState>Every not-available item in {fromLabel} is already in a purchase request.</EmptyState>
                </Card>
            ) : (
                <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                    <Alert>{message}</Alert>
                    <ErrorSummary errors={errors} labels={labels} />

                    <Card>
                        <Input label="Purpose" name="purpose" required maxLength={255} value={purpose} onChange={(e) => setPurpose(e.target.value)} error={errors.purpose} />
                    </Card>

                    <Card
                        title={`Items (${lines.length})`}
                        actions={
                            freeLines && (
                                <Button variant="secondary" disabled={lines.length >= 30} onClick={() => setLines([...lines, blank()])}>
                                    <Plus size={18} aria-hidden="true" />
                                    Add item
                                </Button>
                            )
                        }
                    >
                        {errors.lines && <p className="mb-3 text-sm text-red-700">{errors.lines}</p>}
                        <ol className="divide-y divide-slate-100">
                            {lines.map((line, i) => (
                                <li key={i} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[6rem_6rem_9rem_1fr_auto] sm:items-start">
                                    <div className="sm:col-span-5">
                                        <Textarea
                                            label={`Item ${i + 1} description and specifications`}
                                            name={`lines.${i}.description`}
                                            required
                                            maxLength={500}
                                            rows={2}
                                            value={line.description}
                                            onChange={setLine(i, 'description')}
                                            error={errors[`lines.${i}.description`] ?? errors[`lines.${i}.inquiry_line_id`]}
                                        />
                                    </div>
                                    <Input label="Unit" name={`lines.${i}.unit`} required maxLength={30} readOnly={!freeLines} value={line.unit} onChange={setLine(i, 'unit')} error={errors[`lines.${i}.unit`]} />
                                    <Input
                                        label="Quantity"
                                        name={`lines.${i}.quantity`}
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        step="1"
                                        required
                                        value={line.quantity}
                                        onChange={setLine(i, 'quantity')}
                                        error={errors[`lines.${i}.quantity`]}
                                    />
                                    <Input
                                        label="Est. unit cost (₱)"
                                        name={`lines.${i}.unit_cost`}
                                        type="number"
                                        inputMode="decimal"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={line.unit_cost}
                                        onChange={setLine(i, 'unit_cost')}
                                        error={errors[`lines.${i}.unit_cost`]}
                                    />
                                    <div className="sm:pt-7">
                                        <p className="text-sm text-slate-600">
                                            Total <span className="font-medium tabular-nums text-slate-900">{formatPeso(lineTotal(line))}</span>
                                        </p>
                                    </div>
                                    <div className="sm:pt-6">
                                        <Button variant="ghost" aria-label={`Remove item ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, x) => x !== i))}>
                                            <Trash size={18} aria-hidden="true" />
                                            <span className="sm:hidden">Remove</span>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ol>
                        <p className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3 text-sm" aria-live="polite">
                            Estimated total <span className="font-semibold tabular-nums text-slate-900">{formatPeso(total)}</span>
                        </p>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => navigate(-1)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy || lines.length === 0}>
                            {busy ? 'Submitting…' : 'Submit purchase request'}
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}
