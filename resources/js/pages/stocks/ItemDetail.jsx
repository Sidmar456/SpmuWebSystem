import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PencilSimple, Plus, ShoppingCartSimple, SlidersHorizontal } from '@phosphor-icons/react';
import {
    Alert,
    BackLink,
    Button,
    buttonClass,
    Card,
    Detail,
    EmptyState,
    formatDateTime,
    Input,
    Modal,
    MovementBadge,
    Pagination,
    Spinner,
    StockBadge,
    Textarea,
    useErrorFocus,
} from '../../components/ui';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import ItemPhoto from './ItemPhoto';

export default function ItemDetail() {
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const item = useApi(`/items/${id}`);
    const [page, setPage] = useState(1);
    const movements = useApi(isAdmin ? '/stock-movements' : null, { item_id: id, page });
    const [dialog, setDialog] = useState(null); // 'stock-in' | 'adjust' | null
    const [notice, setNotice] = useState('');

    if (item.loading && !item.data) return <Spinner />;
    if (item.error) return <Alert>{item.error}</Alert>;
    const it = item.data.item;

    function done(message) {
        setDialog(null);
        setNotice(message);
        item.reload();
        movements.reload();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <BackLink to="/stocks">Stocks</BackLink>
                    <h1 className="mt-1 text-xl font-semibold text-slate-900">{it.name}</h1>
                    <p className="font-mono text-xs text-slate-500">{it.stock_no}</p>
                </div>
                {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setDialog('stock-in')}>
                            <Plus size={18} weight="bold" aria-hidden="true" />
                            Stock in
                        </Button>
                        <Button variant="secondary" onClick={() => setDialog('adjust')}>
                            <SlidersHorizontal size={18} aria-hidden="true" />
                            Adjust
                        </Button>
                        <Link to={`/stocks/${it.id}/edit`} className={buttonClass('secondary')}>
                            <PencilSimple size={18} aria-hidden="true" />
                            Edit
                        </Link>
                    </div>
                )}
            </div>

            <Alert kind="success">{notice}</Alert>

            <Card>
                <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                    <ItemPhoto item={it} size={480} />
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <StockBadge status={it.stock_status} />
                                <span className="text-sm text-slate-500 capitalize">{it.type}</span>
                            </div>
                            <p className="text-slate-700">
                                <span className={`text-4xl font-semibold tabular-nums ${it.quantity === 0 ? 'text-red-700' : 'text-slate-900'}`}>{it.quantity}</span>{' '}
                                <span className="text-lg">{it.unit} available</span>
                            </p>
                            {it.quantity > 0 ? (
                                <Link to={`/requests/new?item=${it.id}`} className={`${buttonClass('primary')} w-full sm:w-auto`}>
                                    <ShoppingCartSimple size={18} aria-hidden="true" />
                                    Request this item
                                </Link>
                            ) : (
                                <p className="text-sm text-slate-600">Out of stock. Check again after the next delivery.</p>
                            )}
                        </div>

                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Specifications</h2>
                            <p className="mt-1 text-sm whitespace-pre-line text-slate-700">{it.description || 'No specifications written yet.'}</p>
                        </div>

                        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-slate-200 pt-4 text-sm">
                        <Detail label="Reorder at">
                            {it.reorder_level} {it.unit}
                        </Detail>
                        <Detail label="Unit">
                            {it.unit}
                            <p className="text-xs text-slate-500">{it.type === 'property' ? 'Property: can be turned over' : 'Consumable: used up when issued'}</p>
                        </Detail>
                        <Detail label="Category">{it.category || '—'}</Detail>
                        <Detail label="Supplier">
                            {it.supplier && isAdmin ? (
                                <Link to={`/suppliers/${it.supplier.id}`} className="inline-flex min-h-11 items-center text-brand hover:underline sm:min-h-0">
                                    {it.supplier.name}
                                </Link>
                            ) : (
                                it.supplier?.name || '—'
                            )}
                        </Detail>
                        </dl>
                    </div>
                </div>
            </Card>

            {isAdmin && (
                <Card title="Stock card">
                    <Alert>{movements.error}</Alert>
                    {movements.loading && !movements.data ? (
                        <Spinner />
                    ) : movements.data?.data.length === 0 ? (
                        <EmptyState>No stock movements yet.</EmptyState>
                    ) : (
                        movements.data && (
                            <>
                                <div className="-mx-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Stock card">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                                            <tr>
                                                <th scope="col" className="px-4 py-2 font-medium">Date</th>
                                                <th scope="col" className="px-4 py-2 font-medium">Movement</th>
                                                <th scope="col" className="px-4 py-2 text-right font-medium">Qty</th>
                                                <th scope="col" className="px-4 py-2 text-right font-medium">Balance</th>
                                                <th scope="col" className="px-4 py-2 font-medium">Reference / remarks</th>
                                                <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">By</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {movements.data.data.map((m) => {
                                                return (
                                                    <tr key={m.id}>
                                                        <td className="px-4 py-2 whitespace-nowrap text-slate-600">{formatDateTime(m.created_at)}</td>
                                                        <td className="px-4 py-2">
                                                            <MovementBadge type={m.type} />
                                                        </td>
                                                        <td className={`px-4 py-2 text-right tabular-nums ${m.quantity < 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-medium tabular-nums">{m.balance_after}</td>
                                                        <td className="px-4 py-2 text-slate-600">{m.remarks || '—'}</td>
                                                        <td className="hidden px-4 py-2 text-slate-600 md:table-cell">{m.user?.name ?? '—'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <Pagination meta={movements.data} onPage={setPage} />
                            </>
                        )
                    )}
                </Card>
            )}

            <Modal open={dialog === 'stock-in'} title={`Stock in: ${it.name}`} onClose={() => setDialog(null)}>
                <MovementForm
                    url={`/items/${it.id}/stock-in`}
                    unit={it.unit}
                    quantityHint="Number of units received."
                    remarksLabel="Remarks (optional)"
                    submitLabel="Add to stock"
                    onDone={(q) => done(`Added ${q} ${it.unit} to stock.`)}
                />
            </Modal>

            <Modal open={dialog === 'adjust'} title={`Adjust: ${it.name}`} onClose={() => setDialog(null)}>
                <MovementForm
                    url={`/items/${it.id}/adjust`}
                    unit={it.unit}
                    allowNegative
                    quantityHint={`Use a negative number to remove units (e.g. -2). Current balance: ${it.quantity} ${it.unit}.`}
                    remarksLabel="Reason"
                    remarksRequired
                    submitLabel="Save adjustment"
                    onDone={(q) => done(`Adjusted stock by ${q > 0 ? '+' : ''}${q} ${it.unit}.`)}
                />
            </Modal>
        </div>
    );
}

function MovementForm({ url, unit, allowNegative = false, quantityHint, remarksLabel, remarksRequired = false, submitLabel, onDone }) {
    const [form, setForm] = useState({ quantity: '', remarks: '' });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            const quantity = Number(form.quantity);
            await api.post(url, { quantity, remarks: form.remarks });
            onDone(quantity);
        } catch (error) {
            const fields = fieldErrors(error);
            Object.keys(fields).length ? setErrors(fields) : setMessage(errorMessage(error));
        } finally {
            setBusy(false);
        }
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <Input
                label={`Quantity (${unit})`}
                type="number"
                inputMode="numeric"
                step="1"
                min={allowNegative ? undefined : 1}
                required
                autoFocus
                hint={quantityHint}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                error={errors.quantity}
            />
            <Textarea
                label={remarksLabel}
                required={remarksRequired}
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                error={errors.remarks}
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || form.quantity === ''}>
                    {busy ? 'Saving…' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
