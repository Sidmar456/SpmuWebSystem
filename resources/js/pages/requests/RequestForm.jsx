import { Plus, Trash } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, BackLink, Button, Card, EmptyState, ErrorSummary, Input, StockBadge } from '../../components/ui';
import { api, formErrors } from '../../lib/api';
import { useApi } from '../../lib/useApi';

export default function RequestForm() {
    const navigate = useNavigate();
    const [purpose, setPurpose] = useState('');
    const [lines, setLines] = useState([]); // [{ item, quantity }]
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [focusTarget, setFocusTarget] = useState(null);
    const formRef = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => setQuery(search.trim()), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const results = useApi(query ? '/items' : null, { search: query });

    // "Request" on an item card opens this form with ?item=<id> already in the list.
    const [searchParams] = useSearchParams();
    const presetId = searchParams.get('item');
    const preset = useApi(presetId ? `/items/${presetId}` : null);
    useEffect(() => {
        const item = preset.data?.item;
        if (item && item.quantity > 0) setLines((current) => (current.some((l) => l.item.id === item.id) ? current : [{ item, quantity: '1' }, ...current]));
    }, [preset.data]);

    // Error summary first, as on the item form; line errors are keyed lines.N.quantity and match the input names.
    useEffect(() => {
        if (Object.keys(errors).length) formRef.current?.querySelector('[data-error-summary]')?.focus();
    }, [errors]);

    // After adding or removing a line, keep keyboard focus somewhere useful.
    useEffect(() => {
        if (!focusTarget) return;
        formRef.current?.elements[focusTarget]?.focus();
        setFocusTarget(null);
    }, [focusTarget]);

    function add(item) {
        setLines([...lines, { item, quantity: '1' }]);
        setFocusTarget(`lines.${lines.length}.quantity`);
    }

    function remove(index) {
        setLines(lines.filter((_, i) => i !== index));
        setErrors({});
        setFocusTarget('item_search');
    }

    const setQuantity = (index) => (e) => setLines(lines.map((line, i) => (i === index ? { ...line, quantity: e.target.value } : line)));

    const labels = { purpose: 'Purpose', lines: 'Items' };
    lines.forEach(({ item }, i) => {
        labels[`lines.${i}.quantity`] = `Quantity of ${item.name}`;
        labels[`lines.${i}.item_id`] = item.name;
    });

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            const res = await api.post('/requests', {
                purpose,
                lines: lines.map(({ item, quantity }) => ({ item_id: item.id, quantity: Number(quantity) })),
            });
            navigate(`/requests/${res.data.request.id}`, {
                state: { notice: 'Request submitted. You will get a notification when the Supply Office decides.' },
            });
        } catch (error) {
            const result = formErrors(error, ['purpose', 'lines']);
            setErrors(result.errors);
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    const added = new Set(lines.map(({ item }) => item.id));
    const shown = results.data?.data.slice(0, 8) ?? [];

    return (
        <div className="space-y-4">
            <div>
                <BackLink to="/requests">Requests</BackLink>
                <h1 className="mt-1 text-xl font-semibold text-slate-900">New request</h1>
                <p className="text-sm text-slate-600">Requisition and Issue Slip (RIS). Claim the items at the Supply Office once approved.</p>
            </div>

            <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
                <Alert>{message}</Alert>
                <ErrorSummary errors={errors} labels={labels} />

                <Card>
                    <Input
                        label="Purpose"
                        name="purpose"
                        required
                        maxLength={255}
                        placeholder="e.g. Handouts for the faculty seminar"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        error={errors.purpose}
                    />
                </Card>

                <Card title="Add items">
                    <div role="search" className="space-y-3">
                        <Input
                            label="Find an item"
                            name="item_search"
                            type="search"
                            autoComplete="off"
                            placeholder="Name, stock no. or category"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <p role="status" className="text-sm text-slate-600">
                            {query && results.data && (results.data.total === 0 ? 'No items found.' : `${results.data.total} found${results.data.total > shown.length ? `, showing the first ${shown.length}` : ''}.`)}
                        </p>
                        <Alert>{results.error}</Alert>
                        {shown.length > 0 && (
                            <ul className="divide-y divide-slate-100 rounded-md ring-1 ring-slate-200">
                                {shown.map((item) => {
                                    const isAdded = added.has(item.id);
                                    return (
                                        <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                                            <div className="min-w-0">
                                                <p className="font-medium text-slate-900">{item.name}</p>
                                                <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                    <span className="font-mono">{item.stock_no}</span>
                                                    <span>
                                                        {item.quantity} {item.unit} available
                                                    </span>
                                                    <StockBadge status={item.stock_status} />
                                                </p>
                                            </div>
                                            <Button
                                                variant="secondary"
                                                className="shrink-0"
                                                disabled={isAdded || item.quantity === 0}
                                                aria-label={isAdded ? `${item.name} added` : `Add ${item.name}`}
                                                onClick={() => add(item)}
                                            >
                                                {!isAdded && item.quantity > 0 && <Plus size={16} weight="bold" aria-hidden="true" />}
                                                {isAdded ? 'Added' : item.quantity === 0 ? 'Out of stock' : 'Add'}
                                            </Button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </Card>

                <Card title={`Items in this request (${lines.length})`}>
                    {errors.lines && <p className="mb-3 text-sm text-red-700">{errors.lines}</p>}
                    {lines.length === 0 ? (
                        <EmptyState>No items yet. Search above and add at least one.</EmptyState>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {lines.map(({ item, quantity }, i) => (
                                <li key={item.id} className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_10rem_auto] sm:items-start">
                                    <div className="min-w-0 sm:pt-7">
                                        <p className="font-medium text-slate-900">{item.name}</p>
                                        <p className="text-xs text-slate-500">
                                            <span className="font-mono">{item.stock_no}</span> · {item.quantity} {item.unit} available
                                        </p>
                                    </div>
                                    <Input
                                        label={`Quantity (${item.unit})`}
                                        name={`lines.${i}.quantity`}
                                        type="number"
                                        inputMode="numeric"
                                        min="1"
                                        max={item.quantity}
                                        step="1"
                                        required
                                        value={quantity}
                                        onChange={setQuantity(i)}
                                        error={errors[`lines.${i}.quantity`]}
                                    />
                                    <div className="sm:pt-6">
                                        <Button variant="ghost" aria-label={`Remove ${item.name}`} onClick={() => remove(i)}>
                                            <Trash size={18} aria-hidden="true" />
                                            <span className="sm:hidden">Remove</span>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => navigate(-1)}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={busy || lines.length === 0}>
                        {busy ? 'Submitting…' : 'Submit request'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
