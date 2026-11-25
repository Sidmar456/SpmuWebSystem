import { EnvelopeSimple, PencilSimple, Trash, Truck } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, BackLink, Badge, Button, buttonClass, Card, Detail, EmptyState, formatDateTime, Input, Modal, Spinner, Textarea, useErrorFocus } from '../../components/ui';
import { api, formErrors } from '../../lib/api';
import { useAction } from '../../lib/useAction';
import { useApi } from '../../lib/useApi';

export default function SupplierDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, error, loading, reload } = useApi(`/suppliers/${id}`);
    const orders = useApi(`/suppliers/${id}/orders`);
    const [confirming, setConfirming] = useState(false);
    const [ordering, setOrdering] = useState(false);
    const [delivering, setDelivering] = useState(null); // order being received
    const [notice, setNotice] = useState('');

    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const s = data.supplier;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <BackLink to="/suppliers">Suppliers</BackLink>
                    <h1 className="mt-1 text-xl font-semibold text-slate-900">{s.name}</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setOrdering(true)} disabled={!s.email || s.items.length === 0}>
                        <EnvelopeSimple size={18} aria-hidden="true" />
                        Request stock
                    </Button>
                    <Link to={`/suppliers/${s.id}/edit`} className={buttonClass('secondary')}>
                        <PencilSimple size={18} aria-hidden="true" />
                        Edit
                    </Link>
                    <Button variant="secondary" onClick={() => setConfirming(true)}>
                        <Trash size={18} aria-hidden="true" />
                        Remove
                    </Button>
                </div>
            </div>

            <Alert kind="success">{notice}</Alert>
            {(!s.email || s.items.length === 0) && (
                <p className="text-sm text-slate-600">
                    To email a stock request, {!s.email ? 'add an email address to this supplier' : "set this supplier on at least one item's edit form"} first.
                </p>
            )}

            <Card>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Contact person">{s.contact_person || '—'}</Detail>
                    <Detail label="Email">
                        {s.email ? (
                            <a href={`mailto:${s.email}`} className="inline-flex min-h-11 items-center break-all text-brand hover:underline sm:min-h-0">
                                {s.email}
                            </a>
                        ) : (
                            '—'
                        )}
                    </Detail>
                    <Detail label="Phone">
                        {s.phone ? (
                            <a href={`tel:${s.phone}`} className="inline-flex min-h-11 items-center text-brand hover:underline sm:min-h-0">
                                {s.phone}
                            </a>
                        ) : (
                            '—'
                        )}
                    </Detail>
                    <Detail label="Address">{s.address || '—'}</Detail>
                    {s.notes && (
                        <div className="col-span-full">
                            <Detail label="Notes">
                                <span className="whitespace-pre-line">{s.notes}</span>
                            </Detail>
                        </div>
                    )}
                </dl>
            </Card>

            <Card title={`Items supplied (${s.items.length})`}>
                {s.items.length === 0 ? (
                    <EmptyState>No items point to this supplier. Set the supplier on an item's edit form.</EmptyState>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {s.items.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                <Link to={`/stocks/${item.id}`} className="inline-flex min-h-11 min-w-0 flex-col justify-center hover:text-brand sm:min-h-0">
                                    <span className="font-medium text-slate-900 hover:underline">{item.name}</span>
                                    <span className="font-mono text-xs text-slate-500">{item.stock_no}</span>
                                </Link>
                                <span className={`text-sm whitespace-nowrap tabular-nums ${item.quantity <= item.reorder_level ? 'font-medium text-amber-800' : 'text-slate-700'}`}>
                                    {item.quantity} {item.unit}
                                    {item.quantity <= item.reorder_level && <span className="block text-right text-xs">Low stock</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card title="Stock requests">
                <Alert>{orders.error}</Alert>
                {orders.loading && !orders.data ? (
                    <Spinner />
                ) : orders.data?.data.length === 0 ? (
                    <EmptyState>No stock requests sent to this supplier yet.</EmptyState>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {orders.data?.data.map((o) => (
                            <li key={o.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                <div className="min-w-0 text-sm">
                                    <p className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono font-medium text-slate-900">{o.order_no}</span>
                                        <Badge color={o.status === 'delivered' ? 'green' : 'amber'}>{o.status === 'delivered' ? 'Delivered' : 'Sent'}</Badge>
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Sent {formatDateTime(o.created_at)} by {o.user?.name}
                                        {o.delivered_at && ` · delivered ${formatDateTime(o.delivered_at)}`}
                                    </p>
                                    <p className="text-slate-700">{o.lines.map(lineText).join(' · ')}</p>
                                </div>
                                {o.status === 'sent' && (
                                    <Button variant="secondary" onClick={() => setDelivering(o)} aria-label={`Mark ${o.order_no} delivered`}>
                                        <Truck size={18} aria-hidden="true" />
                                        Mark delivered
                                    </Button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Modal open={ordering} title={`Request stock from ${s.name}`} onClose={() => setOrdering(false)}>
                <OrderForm
                    supplier={s}
                    onDone={(order) => {
                        setOrdering(false);
                        setNotice(`${order.order_no} emailed to ${s.email}.`);
                        orders.reload();
                    }}
                />
            </Modal>
            <Modal open={!!delivering} title={`Receive ${delivering?.order_no ?? ''}`} onClose={() => setDelivering(null)}>
                {delivering && (
                    <DeliverForm
                        order={delivering}
                        onDone={() => {
                            setNotice(`${delivering.order_no} received. The quantities were added to stock.`);
                            setDelivering(null);
                            orders.reload();
                            reload();
                        }}
                    />
                )}
            </Modal>

            <Modal open={confirming} title={`Remove ${s.name}?`} onClose={() => setConfirming(false)}>
                <RemoveConfirm supplier={s} onKeep={() => setConfirming(false)} onDone={() => navigate('/suppliers')} />
            </Modal>
        </div>
    );
}

function RemoveConfirm({ supplier, onKeep, onDone }) {
    const { message, busy, run } = useAction([]);
    const blocked = supplier.items.length > 0;

    return (
        <div className="space-y-4">
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-600">
                {blocked
                    ? `${supplier.items.length} ${supplier.items.length === 1 ? 'item still points' : 'items still point'} to this supplier. Move them to another supplier on each item's edit form first.`
                    : 'This deletes the supplier record. It cannot be undone.'}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={onKeep}>
                    {blocked ? 'Close' : 'Keep supplier'}
                </Button>
                {!blocked && (
                    <Button variant="danger" disabled={busy} onClick={() => run(`/suppliers/${supplier.id}`, null, onDone, 'delete')}>
                        {busy ? 'Removing…' : 'Remove supplier'}
                    </Button>
                )}
            </div>
        </div>
    );
}

/** "10 ream Bond paper", or "3 of 4 bottle Ink" when a delivery came short. */
function lineText(l) {
    const short = l.quantity_received !== null && l.quantity_received !== l.quantity;
    return `${short ? `${l.quantity_received} of ${l.quantity}` : l.quantity} ${l.item.unit} ${l.item.name}`;
}

/** Quantities per item this supplier provides. Blank means "not this time". */
function OrderForm({ supplier, onDone }) {
    const [quantities, setQuantities] = useState({});
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const formRef = useErrorFocus(errors);
    const lines = supplier.items.filter((item) => Number(quantities[item.id]) > 0).map((item) => ({ item_id: item.id, quantity: Number(quantities[item.id]) }));

    async function submit(e) {
        e.preventDefault();
        setBusy(true);
        setErrors({});
        setMessage('');
        try {
            onDone((await api.post(`/suppliers/${supplier.id}/orders`, { lines, notes })).data.order);
        } catch (error) {
            const result = formErrors(error, ['notes']);
            setErrors(result.errors);
            setMessage(result.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-600">Sent to {supplier.email}. Leave an item blank to skip it.</p>
            {supplier.items.map((item) => (
                <Input
                    key={item.id}
                    label={`${item.name} (${item.unit})`}
                    name={`qty-${item.id}`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    hint={`On hand ${item.quantity}, reorder at ${item.reorder_level}.`}
                    value={quantities[item.id] ?? ''}
                    onChange={(e) => setQuantities({ ...quantities, [item.id]: e.target.value })}
                />
            ))}
            <Textarea label="Notes (optional)" name="notes" hint="Included in the email, e.g. needed by date." value={notes} onChange={(e) => setNotes(e.target.value)} error={errors.notes} />
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || lines.length === 0}>
                    {busy ? 'Sending…' : `Email request (${lines.length} ${lines.length === 1 ? 'item' : 'items'})`}
                </Button>
            </div>
        </form>
    );
}

/** What actually arrived. Starts at the ordered quantities; change any that came short. */
function DeliverForm({ order, onDone }) {
    const [received, setReceived] = useState(() => Object.fromEntries(order.lines.map((l) => [l.id, String(l.quantity)])));
    const { errors, message, busy, formRef, run } = useAction(['lines']);

    function submit(e) {
        e.preventDefault();
        run(`/supplier-orders/${order.id}/deliver`, { lines: order.lines.map((l) => ({ id: l.id, quantity_received: Number(received[l.id]) })) }, onDone);
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-600">Each quantity is added to stock and shows on the item's stock card as a delivery.</p>
            {order.lines.map((l, i) => (
                <Input
                    key={l.id}
                    label={`${l.item.name} (${l.item.unit})`}
                    name={`lines.${i}.quantity_received`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    required
                    hint={`Requested ${l.quantity}.`}
                    value={received[l.id]}
                    onChange={(e) => setReceived({ ...received, [l.id]: e.target.value })}
                    error={errors[`lines.${i}.quantity_received`]}
                />
            ))}
            <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                    {busy ? 'Saving…' : 'Add to stock'}
                </Button>
            </div>
        </form>
    );
}
