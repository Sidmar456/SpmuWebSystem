import { MagnifyingGlass, Printer } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, BackLink, Button, buttonClass, Card, Detail, formatDateTime, Modal, Select, Spinner, StatusBadge, Textarea } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useAction } from '../../lib/useAction';
import { useApi } from '../../lib/useApi';
import { CONDITIONS, REASONS, TURNOVER_STATUS } from './labels';

export default function TurnoverDetail() {
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { data, error, loading, reload } = useApi(`/turnovers/${id}`);
    const [inspecting, setInspecting] = useState(false);
    const [notice, setNotice] = useState(location.state?.notice ?? '');

    // Show the "submitted" notice once; a reload should not repeat it.
    useEffect(() => {
        if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
    }, []);

    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const t = data.turnover;
    const item = t.line.item;

    function done(message) {
        setInspecting(false);
        setNotice(message);
        reload();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <BackLink to="/turnovers">{isAdmin ? 'Property turnovers' : 'My property'}</BackLink>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-900">
                        <span className="font-mono">{t.turnover_no}</span>
                        <StatusBadge status={t.status} label={TURNOVER_STATUS[t.status]} />
                    </h1>
                    <p className="text-sm text-slate-600">Submitted {formatDateTime(t.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to={`/turnovers/${t.id}/print`} className={buttonClass('secondary')}>
                        <Printer size={18} aria-hidden="true" />
                        Print
                    </Link>
                    {isAdmin && t.status === 'pending' && (
                        <Button onClick={() => setInspecting(true)}>
                            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
                            Inspect
                        </Button>
                    )}
                </div>
            </div>

            <Alert kind="success">{notice}</Alert>
            <Outcome turnover={t} isAdmin={isAdmin} />

            <Card>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Item">
                        {item.name}
                        <p className="font-mono text-xs text-slate-500">{item.stock_no}</p>
                    </Detail>
                    <Detail label="Quantity">
                        <span className="tabular-nums">{t.quantity}</span> {item.unit}
                    </Detail>
                    <Detail label="Issued through">
                        <Link to={`/requests/${t.line.request.id}`} className="inline-flex min-h-11 items-center font-mono text-brand hover:underline sm:min-h-0">
                            {t.line.request.request_no}
                        </Link>
                        <p className="text-xs text-slate-500">{formatDateTime(t.line.request.issued_at)}</p>
                    </Detail>
                    <Detail label="Returned by">
                        {t.user.name}
                        <p className="text-xs text-slate-500">{t.user.office}</p>
                    </Detail>
                    <Detail label="Reason">{REASONS[t.reason] ?? t.reason}</Detail>
                    <Detail label={t.status === 'pending' ? 'Condition (reported)' : 'Condition (inspected)'}>
                        {CONDITIONS[t.condition]?.[0] ?? t.condition}
                        {t.status === 'received' && (
                            <p className="text-xs text-slate-500">{t.condition === 'serviceable' ? 'Added back to stock.' : 'Not added back to stock (for disposal).'}</p>
                        )}
                    </Detail>
                    {t.decider && (
                        <Detail label="Inspected by">
                            {t.decider.name}
                            <p className="text-xs text-slate-500">{formatDateTime(t.decided_at)}</p>
                        </Detail>
                    )}
                    {t.remarks && <Detail label={t.status === 'pending' ? 'Remarks' : 'Inspection remarks'}>{t.remarks}</Detail>}
                </dl>
            </Card>

            <Modal open={inspecting} title={`Inspect ${t.turnover_no}`} onClose={() => setInspecting(false)}>
                <InspectForm turnover={t} onDone={done} />
            </Modal>
        </div>
    );
}

/** Tells both sides where the item stands, in words: waiting, cleared, or still under the person's name. */
function Outcome({ turnover: t, isAdmin }) {
    const who = isAdmin ? t.user.name : 'You';
    if (t.status === 'pending') {
        return (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                {isAdmin
                    ? 'Waiting for inspection. Check the item at the counter, then click Inspect to accept or not accept it.'
                    : 'Waiting for inspection. Bring the item to the Supply Office; it stays under your name until it is accepted.'}
            </p>
        );
    }
    if (t.status === 'received') {
        return (
            <Alert kind="success">
                Accepted on {formatDateTime(t.decided_at)}. {who} {isAdmin ? 'is' : 'are'} cleared of {t.quantity} {t.line.item.unit} {t.line.item.name}; it is no
                longer under {isAdmin ? 'their' : 'your'} name.
            </Alert>
        );
    }
    return (
        <Alert>
            Not accepted{t.remarks ? `: ${t.remarks}` : '.'} The item is still under {isAdmin ? `${t.user.name}'s` : 'your'} name
            {isAdmin ? '.' : '. Fix the issue and submit a new turnover.'}
        </Alert>
    );
}

/** One inspection step: record the condition found, then accept (clears the person) or not accept. */
function InspectForm({ turnover, onDone }) {
    const [decision, setDecision] = useState('accept');
    const [condition, setCondition] = useState(turnover.condition);
    const [remarks, setRemarks] = useState('');
    const { errors, message, busy, formRef, run } = useAction(['condition', 'remarks']);
    const item = turnover.line.item;

    function submit(e) {
        e.preventDefault();
        if (decision === 'accept') {
            // Keep the person's remarks unless the office writes its own.
            run(`/turnovers/${turnover.id}/receive`, { condition, ...(remarks.trim() ? { remarks } : {}) }, () =>
                onDone(
                    condition === 'serviceable'
                        ? `Accepted. ${turnover.user.name} is cleared, and ${turnover.quantity} ${item.unit} went back to stock.`
                        : `Accepted as unserviceable. ${turnover.user.name} is cleared; stock was not changed (for disposal).`,
                ),
            );
        } else {
            run(`/turnovers/${turnover.id}/reject`, { remarks }, () => onDone(`Not accepted. ${turnover.user.name} was notified and still holds the item.`));
        }
    }

    const options = [
        ['accept', 'Accept', 'The item is here and matches the slip. The person is cleared of it.'],
        ['reject', 'Not accept', 'Missing, wrong item or parts missing. It stays under the person’s name.'],
    ];

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-600">
                {turnover.quantity} {item.unit} {item.name} ({item.stock_no}) from {turnover.user.name}. Reported as {CONDITIONS[turnover.condition][0].toLowerCase()}.
            </p>

            <fieldset>
                <legend className="text-sm font-medium text-slate-700">Decision</legend>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {options.map(([value, label, hint]) => (
                        <label
                            key={value}
                            className={`flex min-h-11 cursor-pointer gap-3 rounded-md p-3 text-sm ring-1 transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-brand ${
                                decision === value ? 'bg-blue-50 ring-brand' : 'bg-white ring-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <input type="radio" name="decision" value={value} checked={decision === value} onChange={() => setDecision(value)} className="mt-0.5 size-4 accent-brand" />
                            <span>
                                <span className="block font-medium text-slate-900">{label}</span>
                                <span className="block text-xs text-slate-600">{hint}</span>
                            </span>
                        </label>
                    ))}
                </div>
            </fieldset>

            {decision === 'accept' && (
                <Select
                    label="Condition found"
                    name="condition"
                    required
                    hint={CONDITIONS[condition][1]}
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    error={errors.condition}
                >
                    {Object.entries(CONDITIONS).map(([value, [label]]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </Select>
            )}

            <Textarea
                label={decision === 'accept' ? 'Inspection remarks (optional)' : 'Reason'}
                name="remarks"
                required={decision === 'reject'}
                hint={decision === 'accept' ? 'e.g. serial number checked, scratches on the cover.' : 'Shown to the person, so they know what to fix.'}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                error={errors.remarks}
            />

            <div className="flex justify-end">
                <Button type="submit" variant={decision === 'accept' ? 'primary' : 'danger'} disabled={busy || (decision === 'reject' && !remarks.trim())}>
                    {busy ? 'Saving…' : decision === 'accept' ? 'Accept and clear' : 'Not accept'}
                </Button>
            </div>
        </form>
    );
}
