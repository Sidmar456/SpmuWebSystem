import { ArrowUUpLeft, CalendarBlank, ClipboardText, Printer, ShoppingCart, XCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, BackLink, Button, buttonClass, Card, Detail, formatDateTime, Input, Modal, ProgressSteps, Select, Spinner, StatusBadge, Textarea } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useAction } from '../../lib/useAction';
import { useApi } from '../../lib/useApi';
import { TURNOVER_STATUS } from '../turnovers/labels';
import { INSPECTION_STATUS, OUTCOMES } from './labels';
import { propertySteps } from './steps';

const formatDate = (value) => (value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '');
const today = () => new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD

export default function InspectionDetail() {
    const { id } = useParams();
    const { isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const { data, error, loading, reload } = useApi(`/inspections/${id}`);
    const [dialog, setDialog] = useState(null); // 'schedule' | 'report' | 'cancel'
    const [notice, setNotice] = useState(location.state?.notice ?? '');

    useEffect(() => {
        if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
    }, []);

    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const i = data.inspection;
    const item = i.line.item;
    const open = i.status === 'requested' || i.status === 'scheduled';
    // A rejected turnover leaves the item with the person, so they may turn it over again.
    const canTurnOver = !isAdmin && i.outcome === 'unserviceable' && !i.turnovers.some((t) => t.status !== 'rejected');

    function done(message) {
        setDialog(null);
        setNotice(message);
        reload();
    }

    const titles = { schedule: `Schedule ${i.inspection_no}`, report: `Pre-inspection report ${i.inspection_no}`, cancel: `Cancel ${i.inspection_no}` };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <BackLink to="/inspections">{isAdmin ? 'Pre-inspections' : 'My inspection requests'}</BackLink>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-900">
                        <span className="font-mono">{i.inspection_no}</span>
                        <StatusBadge status={i.status} label={INSPECTION_STATUS[i.status]} />
                    </h1>
                    <p className="text-sm text-slate-600">Requested {formatDateTime(i.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {i.status === 'inspected' && (
                        <Link to={`/inspections/${i.id}/print`} className={buttonClass('secondary')}>
                            <Printer size={18} aria-hidden="true" />
                            Print report
                        </Link>
                    )}
                    {canTurnOver && (
                        <Link to={`/turnovers/new?line=${i.line.id}&inspection=${i.id}`} className={buttonClass('primary')}>
                            <ArrowUUpLeft size={18} aria-hidden="true" />
                            Turn over item
                        </Link>
                    )}
                    {!isAdmin && i.outcome && i.outcome !== 'unserviceable' && (
                        <Link to={`/purchase-requests/new?inspection=${i.id}`} className={buttonClass(i.purchase_requests.length ? 'secondary' : 'primary')}>
                            <ShoppingCart size={18} aria-hidden="true" />
                            {i.purchase_requests.length ? 'Another purchase request' : 'Prepare purchase request'}
                        </Link>
                    )}
                    {!isAdmin && open && (
                        <Button variant="secondary" onClick={() => setDialog('cancel')}>
                            <XCircle size={18} aria-hidden="true" />
                            Cancel request
                        </Button>
                    )}
                    {isAdmin && open && (
                        <>
                            <Button variant="secondary" onClick={() => setDialog('schedule')}>
                                <CalendarBlank size={18} aria-hidden="true" />
                                {i.status === 'scheduled' ? 'Change date' : 'Set date'}
                            </Button>
                            <Button onClick={() => setDialog('report')}>
                                <ClipboardText size={18} aria-hidden="true" />
                                Record report
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <Alert kind="success">{notice}</Alert>
            <Outcome inspection={i} isAdmin={isAdmin} />
            {i.status !== 'cancelled' && (
                <Card title="Progress">
                    <ProgressSteps label="Progress" steps={propertySteps({ inspection: i, turnover: i.turnovers.find((t) => t.status !== 'rejected') })} />
                </Card>
            )}

            <Card>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Item">
                        {item.name}
                        <p className="font-mono text-xs text-slate-500">{item.stock_no}</p>
                    </Detail>
                    <Detail label="Issued through">
                        <Link to={`/requests/${i.line.request.id}`} className="inline-flex min-h-11 items-center font-mono text-brand hover:underline sm:min-h-0">
                            {i.line.request.request_no}
                        </Link>
                        <p className="text-xs text-slate-500">{formatDateTime(i.line.request.issued_at)}</p>
                    </Detail>
                    <Detail label="Requested by">
                        {i.user.name}
                        <p className="text-xs text-slate-500">{i.user.office}</p>
                    </Detail>
                    <Detail label="Problem reported">{i.problem}</Detail>
                    {i.scheduled_for && <Detail label="Inspection date">{formatDate(i.scheduled_for)}</Detail>}
                    {i.inspector && (
                        <Detail label="Inspected by">
                            {i.inspector.name}
                            <p className="text-xs text-slate-500">{formatDateTime(i.inspected_at)}</p>
                        </Detail>
                    )}
                    {i.outcome && <Detail label="Condition found">{OUTCOMES[i.outcome]?.[0] ?? i.outcome}</Detail>}
                    {i.findings && <Detail label="Findings">{i.findings}</Detail>}
                    {i.purchase_requests.length > 0 && (
                        <Detail label="Purchase request">
                            {i.purchase_requests.map((pr) => (
                                <p key={pr.id}>
                                    <Link to={`/purchase-requests/${pr.id}`} className="inline-flex min-h-11 items-center font-mono text-brand hover:underline sm:min-h-0">
                                        {pr.pr_no}
                                    </Link>
                                </p>
                            ))}
                        </Detail>
                    )}
                    {i.turnovers.length > 0 && (
                        <Detail label="Turnover">
                            {i.turnovers.map((t) => (
                                <p key={t.id}>
                                    <Link to={`/turnovers/${t.id}`} className="inline-flex min-h-11 items-center font-mono text-brand hover:underline sm:min-h-0">
                                        {t.turnover_no}
                                    </Link>{' '}
                                    <span className="text-xs text-slate-500">{TURNOVER_STATUS[t.status]}</span>
                                </p>
                            ))}
                        </Detail>
                    )}
                </dl>
            </Card>

            <Modal open={dialog !== null} title={titles[dialog] ?? ''} onClose={() => setDialog(null)}>
                {dialog === 'schedule' && <ScheduleForm inspection={i} onDone={done} />}
                {dialog === 'report' && <ReportForm inspection={i} onDone={done} />}
                {dialog === 'cancel' && <CancelForm inspection={i} onDone={done} onBack={() => setDialog(null)} />}
            </Modal>
        </div>
    );
}

/** Where the request stands, and what the person does next. */
function Outcome({ inspection: i, isAdmin }) {
    if (i.status === 'requested') {
        return (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                {isAdmin ? 'New request. Set an inspection date so the person knows when to have the item ready.' : 'Waiting for the Supply Office to set an inspection date.'}
            </p>
        );
    }
    if (i.status === 'scheduled') {
        return (
            <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900 ring-1 ring-blue-200">
                Inspection set for {formatDate(i.scheduled_for)}.{' '}
                {isAdmin ? 'After inspecting the item, record the condition found.' : 'Keep the item ready for the inspectorate team.'}
            </p>
        );
    }
    if (i.status === 'cancelled') return <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">This request was cancelled.</p>;

    const [label, next] = OUTCOMES[i.outcome] ?? [i.outcome, ''];
    return (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
            Inspected: {label.toLowerCase()}. {isAdmin ? `${i.user.name} was told the next step.` : next}
        </p>
    );
}

function ScheduleForm({ inspection, onDone }) {
    const [date, setDate] = useState(inspection.scheduled_for ?? '');
    const { errors, message, busy, formRef, run } = useAction(['scheduled_for']);

    function submit(e) {
        e.preventDefault();
        run(`/inspections/${inspection.id}/schedule`, { scheduled_for: date }, () => onDone(`Inspection set for ${formatDate(date)}. ${inspection.user.name} was notified.`));
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <Input label="Inspection date" name="scheduled_for" type="date" min={today()} required value={date} onChange={(e) => setDate(e.target.value)} error={errors.scheduled_for} />
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || !date}>
                    {busy ? 'Saving…' : 'Save date'}
                </Button>
            </div>
        </form>
    );
}

function ReportForm({ inspection, onDone }) {
    const [outcome, setOutcome] = useState('');
    const [findings, setFindings] = useState('');
    const { errors, message, busy, formRef, run } = useAction(['outcome', 'findings']);
    const item = inspection.line.item;

    function submit(e) {
        e.preventDefault();
        run(`/inspections/${inspection.id}/report`, { outcome, findings }, () => onDone(`Report saved. ${inspection.user.name} was notified of the next step.`));
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-600">
                {item.name} ({item.stock_no}) of {inspection.user.name}. Reported: {inspection.problem}
            </p>
            <Select label="Condition found" name="outcome" required hint={OUTCOMES[outcome]?.[1]} value={outcome} onChange={(e) => setOutcome(e.target.value)} error={errors.outcome}>
                <option value="">Choose a condition</option>
                {Object.entries(OUTCOMES).map(([value, [label]]) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </Select>
            <Textarea
                label="Findings"
                name="findings"
                required
                maxLength={2000}
                hint="What was checked and found, and parts needed if any."
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                error={errors.findings}
            />
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || !outcome || !findings.trim()}>
                    {busy ? 'Saving…' : 'Save report'}
                </Button>
            </div>
        </form>
    );
}

function CancelForm({ inspection, onDone, onBack }) {
    const { message, busy, run } = useAction([]);

    return (
        <div className="space-y-4">
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-700">Cancel the inspection request for {inspection.line.item.name}? You can send a new one later.</p>
            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onBack}>
                    Keep request
                </Button>
                <Button variant="danger" disabled={busy} onClick={() => run(`/inspections/${inspection.id}/cancel`, {}, () => onDone('Request cancelled.'))}>
                    {busy ? 'Cancelling…' : 'Cancel request'}
                </Button>
            </div>
        </div>
    );
}
