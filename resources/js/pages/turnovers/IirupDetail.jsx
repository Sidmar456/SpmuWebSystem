import { CalendarBlank, Printer, Trash } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, BackLink, Button, buttonClass, Card, Detail, formatDate, formatDateTime, Input, Modal, Select, Spinner, StatusBadge, Textarea, today } from '../../components/ui';
import { useAction } from '../../lib/useAction';
import { useApi } from '../../lib/useApi';
import { DISPOSAL_METHODS, IIRUP_STATUS } from './labels';


export default function IirupDetail() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { data, error, loading, reload } = useApi(`/iirups/${id}`);
    const [dialog, setDialog] = useState(null); // 'schedule' | 'dispose'
    const [notice, setNotice] = useState(location.state?.notice ?? '');

    useEffect(() => {
        if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
    }, []);

    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const r = data.iirup;

    function done(message) {
        setDialog(null);
        setNotice(message);
        reload();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <BackLink to="/unserviceable?tab=iirups">IIRUP and disposal</BackLink>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-900">
                        <span className="font-mono">{r.iirup_no}</span>
                        <StatusBadge status={r.status} label={IIRUP_STATUS[r.status]} />
                    </h1>
                    <p className="text-sm text-slate-600">
                        Prepared {formatDateTime(r.created_at)}
                        {r.creator && ` by ${r.creator.name}`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to={`/iirups/${r.id}/print`} className={buttonClass('secondary')}>
                        <Printer size={18} aria-hidden="true" />
                        Print IIRUP
                    </Link>
                    {r.status !== 'disposed' && (
                        <Button variant={r.status === 'scheduled' ? 'secondary' : 'primary'} onClick={() => setDialog('schedule')}>
                            <CalendarBlank size={18} aria-hidden="true" />
                            {r.status === 'scheduled' ? 'Change date' : 'Schedule disposal'}
                        </Button>
                    )}
                    {r.status === 'scheduled' && (
                        <Button onClick={() => setDialog('dispose')}>
                            <Trash size={18} aria-hidden="true" />
                            Record disposal
                        </Button>
                    )}
                </div>
            </div>

            <Alert kind="success">{notice}</Alert>
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                {r.status === 'submitted' && 'Submitted to the disposal committee. Set the disposal date once the committee schedules it.'}
                {r.status === 'scheduled' && `Disposal scheduled for ${formatDate(r.disposal_date)}. Record it after it is carried out.`}
                {r.status === 'disposed' && `Disposed on ${formatDate(r.disposed_on)} by ${DISPOSAL_METHODS[r.disposal_method]?.toLowerCase() ?? r.disposal_method}.`}
            </p>

            <Card>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    {r.disposal_date && <Detail label="Disposal date">{formatDate(r.disposal_date)}</Detail>}
                    {r.disposal_method && <Detail label="Mode of disposal">{DISPOSAL_METHODS[r.disposal_method]}</Detail>}
                    {r.remarks && <Detail label="Remarks">{r.remarks}</Detail>}
                </dl>
                <div className="-mx-4 mt-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Items">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                            <tr>
                                <th scope="col" className="px-4 py-2 font-medium">Item</th>
                                <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Returned by</th>
                                <th scope="col" className="px-4 py-2 font-medium">ARE no.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {r.turnovers.map((t) => (
                                <tr key={t.id}>
                                    <td className="px-4 py-3">
                                        <Link to={`/turnovers/${t.id}`} className="inline-flex min-h-11 items-center font-mono text-brand hover:underline sm:min-h-0">
                                            {t.turnover_no}
                                        </Link>
                                        <p className="text-xs text-slate-500">
                                            {t.quantity} {t.line.item.unit} {t.line.item.name} · <span className="font-mono">{t.line.item.stock_no}</span>
                                        </p>
                                    </td>
                                    <td className="hidden px-4 py-3 sm:table-cell">
                                        {t.user?.name}
                                        {t.user?.office && <p className="text-xs text-slate-500">{t.user.office}</p>}
                                    </td>
                                    <td className="px-4 py-3 font-mono">{t.are_no}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal open={dialog !== null} title={dialog === 'dispose' ? `Record disposal of ${r.iirup_no}` : `Schedule disposal of ${r.iirup_no}`} onClose={() => setDialog(null)}>
                {dialog === 'schedule' && <ScheduleForm iirup={r} onDone={done} />}
                {dialog === 'dispose' && <DisposeForm iirup={r} onDone={done} />}
            </Modal>
        </div>
    );
}

function ScheduleForm({ iirup, onDone }) {
    const [date, setDate] = useState(iirup.disposal_date ?? '');
    const { errors, message, busy, formRef, run } = useAction(['disposal_date']);

    function submit(e) {
        e.preventDefault();
        run(`/iirups/${iirup.id}/schedule`, { disposal_date: date }, () => onDone(`Disposal scheduled for ${formatDate(date)}.`));
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <Input label="Disposal date" name="disposal_date" type="date" min={today()} required hint="The date the disposal committee set." value={date} onChange={(e) => setDate(e.target.value)} error={errors.disposal_date} />
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || !date}>
                    {busy ? 'Saving…' : 'Save date'}
                </Button>
            </div>
        </form>
    );
}

function DisposeForm({ iirup, onDone }) {
    const [form, setForm] = useState({ disposal_method: '', disposed_on: today(), remarks: '' });
    const { errors, message, busy, formRef, run } = useAction(['disposal_method', 'disposed_on', 'remarks']);
    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    function submit(e) {
        e.preventDefault();
        run(`/iirups/${iirup.id}/dispose`, { ...form, ...(form.remarks.trim() ? {} : { remarks: undefined }) }, () => onDone(`${iirup.iirup_no} recorded as disposed.`));
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-600">This closes the IIRUP. Its {iirup.turnovers.length} items are marked disposed and cannot be changed afterwards.</p>
            <Select label="Mode of disposal" name="disposal_method" required value={form.disposal_method} onChange={set('disposal_method')} error={errors.disposal_method}>
                <option value="">Choose a mode</option>
                {Object.entries(DISPOSAL_METHODS).map(([value, label]) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </Select>
            <Input label="Date disposed" name="disposed_on" type="date" max={today()} required value={form.disposed_on} onChange={set('disposed_on')} error={errors.disposed_on} />
            <Textarea label="Remarks (optional)" name="remarks" maxLength={255} hint="e.g. buyer, receiving agency, or committee resolution no." value={form.remarks} onChange={set('remarks')} error={errors.remarks} />
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || !form.disposal_method || !form.disposed_on}>
                    {busy ? 'Saving…' : 'Record disposal'}
                </Button>
            </div>
        </form>
    );
}
