import { Plus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, BackLink, Button, Card, ErrorSummary, Input, useErrorFocus } from '../../components/ui';
import { api, formErrors } from '../../lib/api';

const blank = () => ({ description: '', unit: '', quantity: '1' });

/** Free-text lines: the items may not be in the stock list at all. */
export default function InquiryForm() {
    const navigate = useNavigate();
    const [purpose, setPurpose] = useState('');
    const [lines, setLines] = useState([blank()]);
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    const setLine = (index, field) => (e) => setLines(lines.map((l, i) => (i === index ? { ...l, [field]: e.target.value } : l)));

    const labels = { purpose: 'Purpose', lines: 'Items' };
    lines.forEach((_, i) => {
        labels[`lines.${i}.description`] = `Item ${i + 1} description`;
        labels[`lines.${i}.unit`] = `Item ${i + 1} unit`;
        labels[`lines.${i}.quantity`] = `Item ${i + 1} quantity`;
    });

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            const res = await api.post('/inquiries', { purpose, lines: lines.map((l) => ({ ...l, quantity: Number(l.quantity) })) });
            navigate(`/inquiries/${res.data.inquiry.id}`, { state: { notice: 'Inquiry sent. The Supply Office will tag each item and notify you.' } });
        } catch (error) {
            const result = formErrors(error, Object.keys(labels));
            setErrors(result.errors);
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-4">
            <div>
                <BackLink to="/inquiries">Availability inquiries</BackLink>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">New availability inquiry</h1>
                <p className="text-sm text-slate-600">
                    List what you need. Items the Supply Office tags as not available can go into a purchase request. Check{' '}
                    <Link to="/stocks" className="font-medium text-brand underline underline-offset-2">
                        Stocks
                    </Link>{' '}
                    first: items in stock are requested directly.
                </p>
            </div>

            <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                <Alert>{message}</Alert>
                <ErrorSummary errors={errors} labels={labels} />

                <Card>
                    <Input label="Purpose" name="purpose" required maxLength={255} hint="e.g. Chemistry laboratory, 2nd semester." value={purpose} onChange={(e) => setPurpose(e.target.value)} error={errors.purpose} />
                </Card>

                <Card
                    title={`Items (${lines.length})`}
                    actions={
                        <Button variant="secondary" disabled={lines.length >= 30} onClick={() => setLines([...lines, blank()])}>
                            <Plus size={18} aria-hidden="true" />
                            Add item
                        </Button>
                    }
                >
                    {errors.lines && <p className="mb-3 text-sm text-red-700">{errors.lines}</p>}
                    <ol className="divide-y divide-slate-100">
                        {lines.map((line, i) => (
                            <li key={i} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_8rem_7rem_auto] sm:items-start">
                                <Input
                                    label={`Item ${i + 1}`}
                                    name={`lines.${i}.description`}
                                    required
                                    maxLength={255}
                                    hint={i === 0 ? 'Name and specifications, e.g. "Microscope, binocular, 1000x".' : undefined}
                                    value={line.description}
                                    onChange={setLine(i, 'description')}
                                    error={errors[`lines.${i}.description`]}
                                />
                                <Input label="Unit" name={`lines.${i}.unit`} required maxLength={30} placeholder="pc, ream, unit" value={line.unit} onChange={setLine(i, 'unit')} error={errors[`lines.${i}.unit`]} />
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
                                <div className="sm:pt-6">
                                    <Button variant="ghost" aria-label={`Remove item ${i + 1}`} disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, x) => x !== i))}>
                                        <Trash size={18} aria-hidden="true" />
                                        <span className="sm:hidden">Remove</span>
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ol>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => navigate(-1)}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={busy}>
                        {busy ? 'Sending…' : 'Send inquiry'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
