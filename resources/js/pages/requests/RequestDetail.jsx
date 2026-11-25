import { Check, HandArrowUp, Printer, Prohibit, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, BackLink, Button, buttonClass, Card, Detail, formatDateTime, Input, Modal, StatusBadge, Spinner, Textarea } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useAction } from '../../lib/useAction';
import { useApi } from '../../lib/useApi';

export default function RequestDetail() {
    const { id } = useParams();
    const { user, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { data, error, loading, reload } = useApi(`/requests/${id}`);
    const [dialog, setDialog] = useState(null); // 'approve' | 'reject' | 'issue' | 'cancel' | null
    const [notice, setNotice] = useState(location.state?.notice ?? '');

    // Show the "submitted" notice once; a reload should not repeat it.
    useEffect(() => {
        if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
    }, []);

    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const r = data.request;
    const isOwner = r.user_id === user.id;
    const showStock = isAdmin && ['pending', 'approved'].includes(r.status);

    function done(message) {
        setDialog(null);
        setNotice(message);
        reload();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <BackLink to="/requests">Requests</BackLink>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-900">
                        <span className="font-mono">{r.request_no}</span>
                        <StatusBadge status={r.status} />
                    </h1>
                    <p className="text-sm text-slate-600">Submitted {formatDateTime(r.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to={`/requests/${r.id}/print`} className={buttonClass('secondary')}>
                        <Printer size={18} aria-hidden="true" />
                        Print
                    </Link>
                    {isAdmin && r.status === 'pending' && (
                        <>
                            <Button onClick={() => setDialog('approve')}>
                                <Check size={18} weight="bold" aria-hidden="true" />
                                Approve
                            </Button>
                            <Button variant="secondary" onClick={() => setDialog('reject')}>
                                <X size={18} aria-hidden="true" />
                                Reject
                            </Button>
                        </>
                    )}
                    {isAdmin && r.status === 'approved' && (
                        <Button onClick={() => setDialog('issue')}>
                            <HandArrowUp size={18} aria-hidden="true" />
                            Issue items
                        </Button>
                    )}
                    {isOwner && r.status === 'pending' && (
                        <Button variant="secondary" onClick={() => setDialog('cancel')}>
                            <Prohibit size={18} aria-hidden="true" />
                            Cancel request
                        </Button>
                    )}
                </div>
            </div>

            <Alert kind="success">{notice}</Alert>
            {isOwner && !isAdmin && r.status === 'approved' && (
                <Alert kind="success">Approved. Claim your items at the Supply Office and bring this request number.</Alert>
            )}

            <Card>
                <Steps status={r.status} />
            </Card>

            <Card>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Requested by">
                        {r.user.name}
                        <p className="text-xs text-slate-500">{r.office || r.user.office}</p>
                    </Detail>
                    <Detail label="Purpose">{r.purpose}</Detail>
                    {r.decider && (
                        <Detail label={r.status === 'rejected' ? 'Rejected by' : 'Approved by'}>
                            {r.decider.name}
                            <p className="text-xs text-slate-500">{formatDateTime(r.decided_at)}</p>
                        </Detail>
                    )}
                    {r.remarks && <Detail label={r.status === 'rejected' ? 'Reason' : 'Remarks'}>{r.remarks}</Detail>}
                    {r.issuer && (
                        <Detail label="Issued by">
                            {r.issuer.name}
                            <p className="text-xs text-slate-500">{formatDateTime(r.issued_at)}</p>
                        </Detail>
                    )}
                    {r.received_by && <Detail label="Received by">{r.received_by}</Detail>}
                </dl>
            </Card>

            <Card title="Items">
                <div className="-mx-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Requested items">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                            <tr>
                                <th scope="col" className="px-4 py-2 font-medium">Item</th>
                                <th scope="col" className="px-4 py-2 text-right font-medium">Requested</th>
                                {['approved', 'issued'].includes(r.status) && <th scope="col" className="px-4 py-2 text-right font-medium">Approved</th>}
                                {r.status === 'issued' && <th scope="col" className="px-4 py-2 text-right font-medium">Issued</th>}
                                {showStock && <th scope="col" className="px-4 py-2 text-right font-medium">In stock</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {r.lines.map((line) => {
                                const needed = r.status === 'approved' ? line.quantity_approved : line.quantity_requested;
                                const short = showStock && line.item.quantity < needed;
                                return (
                                    <tr key={line.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900">{line.item.name}</p>
                                            <p className="font-mono text-xs text-slate-500">{line.item.stock_no}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                            {line.quantity_requested} <span className="text-slate-500">{line.item.unit}</span>
                                        </td>
                                        {['approved', 'issued'].includes(r.status) && <td className="px-4 py-3 text-right tabular-nums">{line.quantity_approved}</td>}
                                        {r.status === 'issued' && <td className="px-4 py-3 text-right tabular-nums">{line.quantity_issued}</td>}
                                        {showStock && (
                                            <td className={`px-4 py-3 text-right whitespace-nowrap tabular-nums ${short ? 'font-medium text-red-700' : ''}`}>
                                                {line.item.quantity}
                                                {short && <span className="block text-xs font-normal">Not enough</span>}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal open={dialog === 'approve'} title={`Approve ${r.request_no}`} onClose={() => setDialog(null)}>
                <ApproveForm request={r} onDone={() => done('Request approved. The requester was notified to claim the items.')} />
            </Modal>
            <Modal open={dialog === 'reject'} title={`Reject ${r.request_no}`} onClose={() => setDialog(null)}>
                <RejectForm request={r} onDone={() => done('Request rejected. The requester was notified.')} />
            </Modal>
            <Modal open={dialog === 'issue'} title={`Issue ${r.request_no}`} onClose={() => setDialog(null)}>
                <IssueForm request={r} onDone={() => done('Items issued and deducted from stock.')} />
            </Modal>
            <Modal open={dialog === 'cancel'} title={`Cancel ${r.request_no}?`} onClose={() => setDialog(null)}>
                <CancelForm request={r} onKeep={() => setDialog(null)} onDone={() => done('Request cancelled.')} />
            </Modal>
        </div>
    );
}

/** Submitted, then approved, then issued. Rejected and cancelled end the flow at step 2. */
function Steps({ status }) {
    const ended = status === 'rejected' || status === 'cancelled';
    const reached = { pending: 1, approved: 2, issued: 3, rejected: 2, cancelled: 2 }[status] ?? 1;
    const steps = ['Submitted', ended ? (status === 'rejected' ? 'Rejected' : 'Cancelled') : 'Approved', 'Issued'];

    return (
        <ol aria-label="Progress" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            {steps.map((label, i) => {
                const n = i + 1;
                const done = n <= reached;
                const stopped = ended && n === 2;
                const state = stopped ? '' : done ? ' (done)' : n === reached + 1 && !ended ? ' (next)' : ' (not reached)';
                return (
                    <li key={label} aria-current={n === reached ? 'step' : undefined} className="flex items-center gap-2">
                        <span
                            className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
                                stopped ? 'bg-red-100 text-red-700' : done ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'
                            }`}
                            aria-hidden="true"
                        >
                            {stopped ? <X size={14} weight="bold" /> : done ? <Check size={14} weight="bold" /> : n}
                        </span>
                        <span className={done ? 'font-medium text-slate-900' : 'text-slate-500'}>
                            {label}
                            <span className="sr-only">{state}</span>
                        </span>
                        {n < steps.length && <span aria-hidden="true" className="hidden h-px w-8 bg-slate-300 sm:block" />}
                    </li>
                );
            })}
        </ol>
    );
}

function ApproveForm({ request, onDone }) {
    const [quantities, setQuantities] = useState(() => Object.fromEntries(request.lines.map((l) => [l.id, String(l.quantity_requested)])));
    const [remarks, setRemarks] = useState('');
    const { errors, message, busy, formRef, run } = useAction(['lines', 'remarks']);

    function submit(e) {
        e.preventDefault();
        const lines = request.lines.map((l) => ({ id: l.id, quantity_approved: Number(quantities[l.id]) }));
        run(`/requests/${request.id}/approve`, { lines, remarks }, onDone);
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message || errors.lines}</Alert>
            <p className="text-sm text-slate-600">Approve less, or 0 to leave an item out. Stock is deducted only when the items are issued.</p>
            {request.lines.map((line, i) => (
                <Input
                    key={line.id}
                    label={`${line.item.name} (${line.item.unit})`}
                    name={`lines.${i}.quantity_approved`}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max={line.quantity_requested}
                    step="1"
                    required
                    hint={`Requested ${line.quantity_requested}. In stock ${line.item.quantity}.`}
                    value={quantities[line.id]}
                    onChange={(e) => setQuantities({ ...quantities, [line.id]: e.target.value })}
                    error={errors[`lines.${i}.quantity_approved`]}
                />
            ))}
            <Textarea label="Remarks (optional)" name="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} error={errors.remarks} />
            <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                    {busy ? 'Approving…' : 'Approve request'}
                </Button>
            </div>
        </form>
    );
}

function RejectForm({ request, onDone }) {
    const [remarks, setRemarks] = useState('');
    const { errors, message, busy, formRef, run } = useAction(['remarks']);

    return (
        <form ref={formRef} onSubmit={(e) => (e.preventDefault(), run(`/requests/${request.id}/reject`, { remarks }, onDone))} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <Textarea
                label="Reason"
                name="remarks"
                required
                hint="Shown to the requester."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                error={errors.remarks}
            />
            <div className="flex justify-end">
                <Button type="submit" variant="danger" disabled={busy || !remarks.trim()}>
                    {busy ? 'Rejecting…' : 'Reject request'}
                </Button>
            </div>
        </form>
    );
}

function IssueForm({ request, onDone }) {
    const [receivedBy, setReceivedBy] = useState(request.user.name);
    const { errors, message, busy, formRef, run } = useAction(['received_by']);
    const lines = request.lines.filter((l) => l.quantity_approved > 0);

    return (
        <form ref={formRef} onSubmit={(e) => (e.preventDefault(), run(`/requests/${request.id}/issue`, { received_by: receivedBy }, onDone))} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <div>
                <p className="text-sm font-medium text-slate-700">Releasing</p>
                <ul className="mt-1 space-y-1 text-sm text-slate-900">
                    {lines.map((l) => (
                        <li key={l.id} className="flex justify-between gap-3">
                            <span>{l.item.name}</span>
                            <span className="tabular-nums whitespace-nowrap">
                                {l.quantity_approved} {l.item.unit}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
            <Input
                label="Received by"
                name="received_by"
                required
                autoComplete="off"
                hint="Name of the person claiming the items at the counter."
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                error={errors.received_by}
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || !receivedBy.trim()}>
                    {busy ? 'Issuing…' : 'Issue and deduct stock'}
                </Button>
            </div>
        </form>
    );
}

function CancelForm({ request, onKeep, onDone }) {
    const { message, busy, run } = useAction([]);

    return (
        <div className="space-y-4">
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-600">The Supply Office will not act on it. This cannot be undone, but you can submit a new request later.</p>
            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={onKeep}>
                    Keep request
                </Button>
                <Button variant="danger" disabled={busy} onClick={() => run(`/requests/${request.id}/cancel`, {}, onDone)}>
                    {busy ? 'Cancelling…' : 'Cancel request'}
                </Button>
            </div>
        </div>
    );
}
