import { ChatCircleText, Printer, ShoppingCart } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, BackLink, Button, buttonClass, Card, Detail, formatDateTime, Input, Modal, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useAction } from '../../lib/useAction';
import { useApi } from '../../lib/useApi';
import { AVAILABILITY, INQUIRY_STATUS } from './labels';

export default function InquiryDetail() {
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { data, error, loading, reload } = useApi(`/inquiries/${id}`);
    const [answering, setAnswering] = useState(false);
    const [notice, setNotice] = useState(location.state?.notice ?? '');

    useEffect(() => {
        if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
    }, []);

    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const q = data.inquiry;
    const missing = q.lines.filter((l) => l.availability === 'not_available').length;
    const canBuy = !isAdmin && q.lines.some((l) => l.availability === 'not_available' && !l.purchase_request_line);

    function done(message) {
        setAnswering(false);
        setNotice(message);
        reload();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <BackLink to="/inquiries">Availability inquiries</BackLink>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-900">
                        <span className="font-mono">{q.inquiry_no}</span>
                        <StatusBadge status={q.status} label={INQUIRY_STATUS[q.status]} />
                    </h1>
                    <p className="text-sm text-slate-600">Sent {formatDateTime(q.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {q.status === 'answered' && (
                        <Link to={`/inquiries/${q.id}/print`} className={buttonClass('secondary')}>
                            <Printer size={18} aria-hidden="true" />
                            Print SAI
                        </Link>
                    )}
                    {canBuy && (
                        <Link to={`/purchase-requests/new?inquiry=${q.id}`} className={buttonClass('primary')}>
                            <ShoppingCart size={18} aria-hidden="true" />
                            Create purchase request
                        </Link>
                    )}
                    {isAdmin && q.status === 'pending' && (
                        <Button onClick={() => setAnswering(true)}>
                            <ChatCircleText size={18} aria-hidden="true" />
                            Answer
                        </Button>
                    )}
                </div>
            </div>

            <Alert kind="success">{notice}</Alert>
            {q.status === 'pending' ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                    {isAdmin ? 'Check stock, then click Answer to tag each item.' : 'Waiting for the Supply Office to check availability.'}
                </p>
            ) : (
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                    {missing === 0
                        ? 'All items are available. Request them from Stocks.'
                        : `${missing} of ${q.lines.length} items are not available. ${isAdmin ? 'The end user may prepare a purchase request.' : 'You may prepare a purchase request for them, with this SAI attached.'}`}
                </p>
            )}

            <Card>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Requested by">
                        {q.user.name}
                        <p className="text-xs text-slate-500">{q.office}</p>
                    </Detail>
                    <Detail label="Purpose">{q.purpose}</Detail>
                    {q.answerer && (
                        <Detail label="Answered by">
                            {q.answerer.name}
                            <p className="text-xs text-slate-500">{formatDateTime(q.answered_at)}</p>
                        </Detail>
                    )}
                </dl>
                <div className="-mx-4 mt-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Items">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                            <tr>
                                <th scope="col" className="px-4 py-2 font-medium">Item</th>
                                <th scope="col" className="px-4 py-2 text-right font-medium">Qty</th>
                                <th scope="col" className="px-4 py-2 font-medium">Availability</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {q.lines.map((l) => (
                                <tr key={l.id}>
                                    <td className="px-4 py-3">{l.description}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                        {l.quantity} <span className="text-slate-500">{l.unit}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {l.availability ? <StatusBadge status={l.availability} label={AVAILABILITY[l.availability][0]} /> : <span className="text-slate-500">Not checked yet</span>}
                                        {l.remarks && <p className="mt-1 text-xs text-slate-600">{l.remarks}</p>}
                                        {l.purchase_request_line && (
                                            <Link
                                                to={`/purchase-requests/${l.purchase_request_line.purchase_request.id}`}
                                                className="mt-1 inline-flex min-h-11 items-center font-mono text-xs text-brand hover:underline sm:min-h-0"
                                            >
                                                In {l.purchase_request_line.purchase_request.pr_no}
                                            </Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal open={answering} title={`Answer ${q.inquiry_no}`} onClose={() => setAnswering(false)}>
                <AnswerForm inquiry={q} onDone={done} />
            </Modal>
        </div>
    );
}

/** One choice per line; nothing is preselected so every item gets checked. */
function AnswerForm({ inquiry, onDone }) {
    const [answers, setAnswers] = useState(() => Object.fromEntries(inquiry.lines.map((l) => [l.id, { availability: '', remarks: '' }])));
    const { message, busy, formRef, run } = useAction(['lines']);
    const set = (id, field, value) => setAnswers({ ...answers, [id]: { ...answers[id], [field]: value } });
    const complete = Object.values(answers).every((a) => a.availability);

    function submit(e) {
        e.preventDefault();
        const lines = inquiry.lines.map((l) => ({ id: l.id, availability: answers[l.id].availability, ...(answers[l.id].remarks.trim() ? { remarks: answers[l.id].remarks } : {}) }));
        run(`/inquiries/${inquiry.id}/answer`, { lines }, () => onDone(`Answered. ${inquiry.user.name} was notified.`));
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <ol className="space-y-4">
                {inquiry.lines.map((l) => (
                    <li key={l.id}>
                        <fieldset>
                            <legend className="text-sm font-medium text-slate-900">
                                {l.description} <span className="font-normal text-slate-500">· {l.quantity} {l.unit}</span>
                            </legend>
                            <div className="mt-1 grid gap-2 sm:grid-cols-2">
                                {Object.entries(AVAILABILITY).map(([value, [label]]) => (
                                    <label
                                        key={value}
                                        className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm ring-1 transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-brand ${
                                            answers[l.id].availability === value ? 'bg-brand/10 ring-brand' : 'bg-white ring-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <input type="radio" name={`line-${l.id}`} value={value} checked={answers[l.id].availability === value} onChange={() => set(l.id, 'availability', value)} className="size-4 accent-brand" />
                                        {label}
                                    </label>
                                ))}
                            </div>
                            <div className="mt-2">
                                <Input label="Remarks (optional)" name={`remarks-${l.id}`} maxLength={255} value={answers[l.id].remarks} onChange={(e) => set(l.id, 'remarks', e.target.value)} />
                            </div>
                        </fieldset>
                    </li>
                ))}
            </ol>
            <div className="flex items-center justify-end gap-3">
                {!complete && <p className="text-sm text-slate-600">Tag every item to save.</p>}
                <Button type="submit" disabled={busy || !complete}>
                    {busy ? 'Saving…' : 'Save answer'}
                </Button>
            </div>
        </form>
    );
}
