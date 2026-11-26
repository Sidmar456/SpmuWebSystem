import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, BackLink, Button, Card, EmptyState, ErrorSummary, Select, Spinner, Textarea, useErrorFocus } from '../../components/ui';
import { api, formErrors } from '../../lib/api';
import { useApi } from '../../lib/useApi';

const LABELS = { item_request_line_id: 'Property item', problem: 'Problem' };

/** Personnel ask the Supply Office (inspectorate) to check a property item in their care. */
export default function InspectionForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const holdings = useApi('/turnovers/holdings');
    const [form, setForm] = useState({ item_request_line_id: searchParams.get('line') ?? '', problem: '' });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    const lines = holdings.data?.data ?? [];
    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            const res = await api.post('/inspections', form);
            navigate(`/inspections/${res.data.inspection.id}`, {
                state: { notice: 'Request sent. The Supply Office will set an inspection date and notify you.' },
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
                <BackLink to="/inspections">Inspections</BackLink>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">Request a pre-inspection</h1>
                <p className="text-sm text-slate-600">
                    Tell the Supply Office what is wrong with equipment in your care. They inspect it and say whether to repair, replace or turn it over.
                </p>
            </div>

            <Card>
                {lines.length === 0 ? (
                    <EmptyState>
                        You have no property in your care.{' '}
                        <Link to="/turnovers" className="font-medium text-brand underline underline-offset-2">
                            Back to my property
                        </Link>
                    </EmptyState>
                ) : (
                    <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                        <Alert>{message}</Alert>
                        <ErrorSummary errors={errors} labels={LABELS} />

                        <Select
                            label="Property item"
                            name="item_request_line_id"
                            required
                            value={form.item_request_line_id}
                            onChange={set('item_request_line_id')}
                            error={errors.item_request_line_id}
                        >
                            <option value="">Choose an item</option>
                            {lines.map((l) => (
                                <option key={l.id} value={l.id}>
                                    {l.item.name} ({l.item.stock_no}) · {l.request.request_no}
                                </option>
                            ))}
                        </Select>

                        <Textarea
                            label="Problem"
                            name="problem"
                            required
                            maxLength={500}
                            hint="What happens, since when, and the serial number if there is one."
                            value={form.problem}
                            onChange={set('problem')}
                            error={errors.problem}
                        />

                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => navigate(-1)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={busy}>
                                {busy ? 'Sending…' : 'Send request'}
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
}
