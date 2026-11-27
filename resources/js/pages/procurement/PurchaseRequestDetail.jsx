import { ArrowBendUpLeft, CheckCircle, ClipboardText, HandArrowUp, PencilSimple, Printer, Truck } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, BackLink, Button, buttonClass, Card, Detail, formatDate, formatDateTime, formatPeso, Input, Modal, ProgressSteps, Select, Spinner, StatusBadge, Textarea, today } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useAction } from '../../lib/useAction';
import { useApi } from '../../lib/useApi';
import { PR_STATUS, PR_STEPS } from './labels';


/** The detail a step recorded (series no., award, PO no.), for the stepper. */
function stepDetail(record) {
    const d = record.details ?? {};
    const extra = d.series_no ?? d.po_no ?? (d.awarded_to ? `${d.awarded_to}, ${formatPeso(d.award_amount)}` : null);
    return [formatDate(record.done_on), extra].filter(Boolean).join(' · ');
}

export default function PurchaseRequestDetail() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data, error, loading, reload } = useApi(`/purchase-requests/${id}`);
    const [notice, setNotice] = useState(location.state?.notice ?? '');
    const [dialog, setDialog] = useState(null); // 'record' | 'return' | 'correct' | 'delivery' | 'iar' | 'issue'

    useEffect(() => {
        if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
    }, []);

    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;
    const pr = data.purchase_request;
    const total = pr.lines.reduce((sum, l) => sum + l.quantity * Number(l.unit_cost), 0);
    const records = Object.fromEntries(pr.steps.map((s) => [s.step, s]));
    const next = PR_STEPS.find(([step]) => step === data.next_step);
    const mine = next && next[2] === user.role;
    const owner = pr.user.id === user.id;
    const isAdmin = user.role === 'admin';
    const issued = pr.status === 'issued';
    // From the IAR on, accepted quantities are known.
    const inspected = pr.status === 'inspected' || issued;

    function done(message) {
        setDialog(null);
        setNotice(message);
        reload();
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <BackLink to="/purchase-requests">Purchase requests</BackLink>
                    <h1 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-900">
                        <span className="font-mono">{pr.pr_no}</span>
                        <StatusBadge status={pr.status} label={PR_STATUS[pr.status]} />
                    </h1>
                    <p className="text-sm text-slate-600">Submitted {formatDateTime(pr.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to={`/purchase-requests/${pr.id}/print`} className={buttonClass('secondary')}>
                        <Printer size={18} aria-hidden="true" />
                        Print PR
                    </Link>
                    {mine && next[4] && (
                        <Button variant="secondary" onClick={() => setDialog('return')}>
                            <ArrowBendUpLeft size={18} aria-hidden="true" />
                            Return for corrections
                        </Button>
                    )}
                    {mine && (
                        <Button onClick={() => setDialog('record')}>
                            <CheckCircle size={18} aria-hidden="true" />
                            Record: {next[1]}
                        </Button>
                    )}
                    {inspected && (
                        <Link to={`/purchase-requests/${pr.id}/iar`} className={buttonClass('secondary')}>
                            <Printer size={18} aria-hidden="true" />
                            Print IAR
                        </Link>
                    )}
                    {pr.ics_no && (
                        <Link to={`/purchase-requests/${pr.id}/ics`} className={buttonClass('secondary')}>
                            <Printer size={18} aria-hidden="true" />
                            Print ICS
                        </Link>
                    )}
                    {pr.par_no && (
                        <Link to={`/purchase-requests/${pr.id}/par`} className={buttonClass('secondary')}>
                            <Printer size={18} aria-hidden="true" />
                            Print PAR
                        </Link>
                    )}
                    {isAdmin && pr.status === 'inspected' && pr.lines.some((l) => l.quantity_accepted > 0) && (
                        <Button onClick={() => setDialog('issue')}>
                            <HandArrowUp size={18} aria-hidden="true" />
                            Stock in and issue
                        </Button>
                    )}
                    {isAdmin && pr.status === 'ordered' && (
                        <Button onClick={() => setDialog('delivery')}>
                            <Truck size={18} aria-hidden="true" />
                            Record delivery
                        </Button>
                    )}
                    {isAdmin && pr.status === 'delivered' && (
                        <Button onClick={() => setDialog('iar')}>
                            <ClipboardText size={18} aria-hidden="true" />
                            Record inspection (IAR)
                        </Button>
                    )}
                    {owner && pr.status === 'returned' && (
                        <Button onClick={() => setDialog('correct')}>
                            <PencilSimple size={18} aria-hidden="true" />
                            Correct and resubmit
                        </Button>
                    )}
                </div>
            </div>

            <Alert kind="success">{notice}</Alert>
            {pr.status === 'returned' && (
                <Alert>
                    Returned for corrections at "{PR_STEPS.find(([s]) => s === pr.returned_at_step)?.[1]}": {pr.returned_remarks}
                    {owner ? ' Correct the PR and resubmit it; the office steps start over.' : ''}
                </Alert>
            )}
            {next && !mine && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                    Waiting for: {next[1]} ({next[2] === 'validator' ? 'BAC' : 'Supply Office records it'}).
                </p>
            )}

            {pr.status !== 'returned' && (
                <Card title="Progress">
                    <ProgressSteps
                        label="Purchase request progress"
                        steps={[
                            { label: 'Submitted', done: true, detail: formatDateTime(pr.created_at) },
                            ...PR_STEPS.map(([step, label]) => ({ label, done: !!records[step], detail: records[step] ? stepDetail(records[step]) : '' })),
                            { label: 'Delivered', done: !!pr.delivered_on, detail: pr.delivered_on ? `${formatDate(pr.delivered_on)} · ${pr.delivery_ref}` : '' },
                            { label: 'Inspected (IAR)', done: inspected, detail: inspected ? `${pr.iar_no} · ${formatDate(pr.inspected_on)}` : '' },
                            { label: 'Issued', done: issued, detail: issued ? [pr.item_request?.request_no, pr.ics_no, pr.par_no].filter(Boolean).join(' · ') : '' },
                        ]}
                    />
                </Card>
            )}

            <Card>
                <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Requested by">
                        {pr.user.name}
                        <p className="text-xs text-slate-500">{pr.office}</p>
                    </Detail>
                    <Detail label="Purpose">{pr.purpose}</Detail>
                    {pr.item_request && (
                        <Detail label="Issued on">
                            <Link to={`/requests/${pr.item_request.id}`} className="inline-flex min-h-11 items-center font-mono text-brand hover:underline sm:min-h-0">
                                {pr.item_request.request_no}
                            </Link>
                            <p className="text-xs text-slate-500">
                                to {pr.item_request.received_by}, {formatDateTime(pr.item_request.issued_at)}
                            </p>
                        </Detail>
                    )}
                    {inspected && (
                        <Detail label="Inspection">
                            {pr.inspector?.name}
                            {pr.inspection_remarks && <p className="text-xs text-slate-500">{pr.inspection_remarks}</p>}
                        </Detail>
                    )}
                    <Detail label="Based on">
                        {pr.inquiry ? (
                            <Link to={`/inquiries/${pr.inquiry.id}`} className="inline-flex min-h-11 items-center font-mono text-brand hover:underline sm:min-h-0">
                                {pr.inquiry.inquiry_no}
                            </Link>
                        ) : (
                            pr.inspection && (
                                <Link to={`/inspections/${pr.inspection.id}`} className="inline-flex min-h-11 items-center font-mono text-brand hover:underline sm:min-h-0">
                                    {pr.inspection.inspection_no}
                                </Link>
                            )
                        )}
                    </Detail>
                </dl>
                <div className="-mx-4 mt-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Items">
                    <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                            <tr>
                                <th scope="col" className="px-4 py-2 font-medium">Item and specifications</th>
                                <th scope="col" className="px-4 py-2 text-right font-medium">Qty</th>
                                {inspected && <th scope="col" className="px-4 py-2 text-right font-medium">Accepted</th>}
                                <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Unit cost</th>
                                <th scope="col" className="px-4 py-2 text-right font-medium">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {pr.lines.map((l) => (
                                <tr key={l.id}>
                                    <td className="px-4 py-3 whitespace-pre-line">{l.description}</td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                        {l.quantity} <span className="text-slate-500">{l.unit}</span>
                                    </td>
                                    {inspected && (
                                        <td className={`px-4 py-3 text-right whitespace-nowrap tabular-nums ${l.quantity_accepted < l.quantity ? 'font-medium text-red-700' : ''}`}>
                                            {l.quantity_accepted}
                                            {l.quantity_accepted < l.quantity && <span className="block text-xs font-normal">{l.quantity - l.quantity_accepted} not accepted</span>}
                                        </td>
                                    )}
                                    <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">{formatPeso(l.unit_cost)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{formatPeso(l.quantity * Number(l.unit_cost))}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t border-slate-200">
                            <tr>
                                <th scope="row" colSpan={inspected ? 3 : 2} className="px-4 py-3 text-right font-medium sm:hidden">
                                    Estimated total
                                </th>
                                <th scope="row" colSpan={inspected ? 4 : 3} className="hidden px-4 py-3 text-right font-medium sm:table-cell">
                                    Estimated total
                                </th>
                                <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatPeso(total)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>

            <Modal
                open={dialog !== null}
                title={{ record: `Record: ${next?.[1]}`, return: `Return ${pr.pr_no}`, correct: `Correct ${pr.pr_no}`, delivery: `Delivery for ${pr.pr_no}`, iar: `Inspection and acceptance of ${pr.pr_no}`, issue: `Stock in and issue ${pr.pr_no}` }[dialog] ?? ''}
                onClose={() => setDialog(null)}
                wide={['correct', 'iar', 'issue'].includes(dialog)}
            >
                {dialog === 'record' && <RecordStepForm pr={pr} step={next} onDone={done} />}
                {dialog === 'return' && <ReturnForm pr={pr} step={next} onDone={done} />}
                {dialog === 'correct' && <CorrectForm pr={pr} onDone={done} />}
                {dialog === 'delivery' && <DeliveryForm pr={pr} onDone={done} />}
                {dialog === 'iar' && <IarForm pr={pr} onDone={done} />}
                {dialog === 'issue' && <IssueForm pr={pr} threshold={data.par_threshold} onDone={done} />}
            </Modal>
        </div>
    );
}

function RecordStepForm({ pr, step, onDone }) {
    const [stepName, label, , fields] = step;
    const [form, setForm] = useState({ done_on: today(), remarks: '', ...Object.fromEntries(fields.map(([name]) => [name, ''])) });
    const { errors, message, busy, formRef, run } = useAction(['done_on', 'remarks', ...fields.map(([name]) => name)]);
    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    function submit(e) {
        e.preventDefault();
        run(`/purchase-requests/${pr.id}/steps`, { step: stepName, ...form, ...(form.remarks.trim() ? {} : { remarks: undefined }) }, () => onDone(`${label} recorded.`));
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            {fields.map(([name, fieldLabel, type]) => (
                <Input
                    key={name}
                    label={fieldLabel}
                    name={name}
                    type={type}
                    {...(type === 'number' ? { inputMode: 'decimal', min: '0', step: '0.01', prefix: '₱' } : { maxLength: name === 'awarded_to' ? 255 : 50 })}
                    required
                    value={form[name]}
                    onChange={set(name)}
                    error={errors[name]}
                />
            ))}
            <Input label="Date done" name="done_on" type="date" max={today()} required value={form.done_on} onChange={set('done_on')} error={errors.done_on} />
            <Textarea label="Remarks (optional)" name="remarks" maxLength={255} rows={2} value={form.remarks} onChange={set('remarks')} error={errors.remarks} />
            <p className="text-sm text-slate-600">A recorded step cannot be edited. Check the date and details before saving.</p>
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || !form.done_on || fields.some(([name]) => !String(form[name]).trim())}>
                    {busy ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </form>
    );
}

function ReturnForm({ pr, step, onDone }) {
    const [remarks, setRemarks] = useState('');
    const { errors, message, busy, formRef, run } = useAction(['remarks']);

    function submit(e) {
        e.preventDefault();
        run(`/purchase-requests/${pr.id}/return`, { step: step[0], remarks }, () => onDone(`Returned to ${pr.user.name} for corrections.`));
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <Textarea
                label="What needs correcting"
                name="remarks"
                required
                maxLength={255}
                hint="Shown to the end user, e.g. specifications too brand-specific, quantity not in the APP."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                error={errors.remarks}
            />
            <div className="flex justify-end">
                <Button type="submit" variant="danger" disabled={busy || !remarks.trim()}>
                    {busy ? 'Returning…' : 'Return for corrections'}
                </Button>
            </div>
        </form>
    );
}

/** Items stay the same; their specs, quantities and costs can change. */
function CorrectForm({ pr, onDone }) {
    const [purpose, setPurpose] = useState(pr.purpose);
    const [lines, setLines] = useState(pr.lines.map((l) => ({ id: l.id, unit: l.unit, description: l.description, quantity: String(l.quantity), unit_cost: String(Number(l.unit_cost)) })));
    const fields = ['purpose', 'lines', ...lines.flatMap((_, i) => [`lines.${i}.description`, `lines.${i}.quantity`, `lines.${i}.unit_cost`])];
    const { errors, message, busy, formRef, run } = useAction(fields);
    const setLine = (index, field) => (e) => setLines(lines.map((l, i) => (i === index ? { ...l, [field]: e.target.value } : l)));

    function submit(e) {
        e.preventDefault();
        run(
            `/purchase-requests/${pr.id}`,
            { purpose, lines: lines.map(({ id, description, quantity, unit_cost }) => ({ id, description, quantity: Number(quantity), unit_cost: Number(unit_cost) })) },
            () => onDone('Corrected and resubmitted. The office steps start again from the TWG.'),
            'put',
        );
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            {pr.returned_remarks && <p className="text-sm text-slate-600">Returned because: {pr.returned_remarks}</p>}
            <Input label="Purpose" name="purpose" required maxLength={255} value={purpose} onChange={(e) => setPurpose(e.target.value)} error={errors.purpose} />
            <ol className="space-y-4">
                {lines.map((l, i) => (
                    <li key={l.id} className="space-y-2 rounded-md p-3 ring-1 ring-slate-200">
                        <Textarea label={`Item ${i + 1} description and specifications`} name={`lines.${i}.description`} required maxLength={500} rows={2} value={l.description} onChange={setLine(i, 'description')} error={errors[`lines.${i}.description`]} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input label={`Quantity (${l.unit})`} name={`lines.${i}.quantity`} type="number" inputMode="numeric" min="1" step="1" required value={l.quantity} onChange={setLine(i, 'quantity')} error={errors[`lines.${i}.quantity`]} />
                            <Input label="Est. unit cost" prefix="₱" name={`lines.${i}.unit_cost`} type="number" inputMode="decimal" min="0" step="0.01" required value={l.unit_cost} onChange={setLine(i, 'unit_cost')} error={errors[`lines.${i}.unit_cost`]} />
                        </div>
                    </li>
                ))}
            </ol>
            <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                    {busy ? 'Resubmitting…' : 'Resubmit'}
                </Button>
            </div>
        </form>
    );
}

/** Full delivery only, as in the office flow: inspection is requested once everything has arrived. */
function DeliveryForm({ pr, onDone }) {
    const [form, setForm] = useState({ delivered_on: today(), delivery_ref: '' });
    const { errors, message, busy, formRef, run } = useAction(['delivered_on', 'delivery_ref']);
    const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

    function submit(e) {
        e.preventDefault();
        run(`/purchase-requests/${pr.id}/delivery`, form, () => onDone('Delivery recorded. Inspect the items, then record the IAR.'));
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-600">Record this when the whole order has arrived.</p>
            <Input label="Delivery receipt or invoice no." name="delivery_ref" required maxLength={50} value={form.delivery_ref} onChange={set('delivery_ref')} error={errors.delivery_ref} />
            <Input label="Date delivered" name="delivered_on" type="date" max={today()} required value={form.delivered_on} onChange={set('delivered_on')} error={errors.delivered_on} />
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || !form.delivery_ref.trim() || !form.delivered_on}>
                    {busy ? 'Saving…' : 'Save delivery'}
                </Button>
            </div>
        </form>
    );
}

/** Accepted quantity per line starts at the full quantity; lower it for items not accepted. */
function IarForm({ pr, onDone }) {
    const [inspectedOn, setInspectedOn] = useState(today());
    const [remarks, setRemarks] = useState('');
    const [accepted, setAccepted] = useState(() => Object.fromEntries(pr.lines.map((l) => [l.id, String(l.quantity)])));
    const fields = ['inspected_on', 'inspection_remarks', 'lines', ...pr.lines.map((_, i) => `lines.${i}.quantity_accepted`)];
    const { errors, message, busy, formRef, run } = useAction(fields);
    const short = pr.lines.some((l) => Number(accepted[l.id]) < l.quantity);

    function submit(e) {
        e.preventDefault();
        run(
            `/purchase-requests/${pr.id}/iar`,
            { inspected_on: inspectedOn, ...(remarks.trim() ? { inspection_remarks: remarks } : {}), lines: pr.lines.map((l) => ({ id: l.id, quantity_accepted: Number(accepted[l.id]) })) },
            () => onDone('IAR recorded. Accepted items can now be issued.'),
        );
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            <ol className="space-y-3">
                {pr.lines.map((l, i) => (
                    <li key={l.id} className="grid gap-2 sm:grid-cols-[1fr_9rem] sm:items-end">
                        <p className="text-sm text-slate-900">
                            {l.description}
                            <span className="block text-xs text-slate-500">
                                Ordered {l.quantity} {l.unit}
                            </span>
                        </p>
                        <Input
                            label="Accepted"
                            name={`lines.${i}.quantity_accepted`}
                            type="number"
                            inputMode="numeric"
                            min="0"
                            max={l.quantity}
                            step="1"
                            required
                            value={accepted[l.id]}
                            onChange={(e) => setAccepted({ ...accepted, [l.id]: e.target.value })}
                            error={errors[`lines.${i}.quantity_accepted`]}
                        />
                    </li>
                ))}
            </ol>
            <Input label="Date inspected" name="inspected_on" type="date" min={pr.delivered_on} max={today()} required value={inspectedOn} onChange={(e) => setInspectedOn(e.target.value)} error={errors.inspected_on} />
            <Textarea
                label={short ? 'Reason for non-acceptance' : 'Remarks (optional)'}
                name="inspection_remarks"
                required={short}
                maxLength={255}
                rows={2}
                hint={short ? 'e.g. damaged on arrival, wrong model. The supplier replaces these.' : 'e.g. performance test passed.'}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                error={errors.inspection_remarks}
            />
            <p className="text-sm text-slate-600">The IAR cannot be changed after saving.</p>
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || !inspectedOn || (short && !remarks.trim())}>
                    {busy ? 'Saving…' : 'Save IAR'}
                </Button>
            </div>
        </form>
    );
}

/** Pick an existing stock item: type to narrow the list, then choose one. */
function ItemPicker({ name, value, onChange, error }) {
    const [search, setSearch] = useState('');
    const [chosen, setChosen] = useState(null);
    const { data } = useApi('/items', search.trim() ? { search } : {});
    const items = (data?.data ?? []).slice(0, 8);

    return (
        <fieldset className="space-y-2" aria-describedby={error ? `${name}-error` : undefined}>
            <legend className="sr-only">Stock item</legend>
            <Input label="Find a stock item" name={`${name}-search`} type="search" hint="Name or stock no." value={search} onChange={(e) => setSearch(e.target.value)} />
            {chosen && !items.some((item) => item.id === chosen.id) && (
                <p className="text-sm text-slate-700">
                    Chosen: <span className="font-medium">{chosen.name}</span> <span className="font-mono text-xs">({chosen.stock_no})</span>
                </p>
            )}
            <ul className="max-h-56 space-y-1 overflow-y-auto">
                {items.map((item) => (
                    <li key={item.id}>
                        <label
                            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm ring-1 transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-brand ${
                                String(value) === String(item.id) ? 'bg-blue-50 ring-brand' : 'bg-white ring-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            <input
                                type="radio"
                                name={name}
                                checked={String(value) === String(item.id)}
                                onChange={() => {
                                    setChosen(item);
                                    onChange(String(item.id));
                                }}
                                className="size-4 accent-brand"
                            />
                            <span className="min-w-0">
                                {item.name} <span className="font-mono text-xs text-slate-500">{item.stock_no}</span>
                                <span className="block text-xs text-slate-500">{item.type}</span>
                            </span>
                        </label>
                    </li>
                ))}
                {data && items.length === 0 && <li className="text-sm text-slate-600">No stock item matches. Use New stock item instead.</li>}
            </ul>
            {error && (
                <p id={`${name}-error`} className="text-sm text-red-700">
                    {error}
                </p>
            )}
        </fieldset>
    );
}

/**
 * Each accepted line becomes stock: an existing item or a new one. Then everything is issued at once on an RIS.
 * Property gets an ICS below the PAR threshold, a PAR at or above it (by the PR unit cost).
 */
function IssueForm({ pr, threshold, onDone }) {
    const accepted = pr.lines.filter((l) => l.quantity_accepted > 0);
    const [receivedBy, setReceivedBy] = useState(pr.user.name);
    const [rows, setRows] = useState(() =>
        Object.fromEntries(accepted.map((l) => [l.id, { mode: 'new', item_id: '', stock_no: '', name: l.description.split('\n')[0].slice(0, 255), type: 'property' }])),
    );
    const fields = ['received_by', 'lines', ...accepted.flatMap((_, i) => [`lines.${i}.item_id`, `lines.${i}.new_item.stock_no`, `lines.${i}.new_item.name`, `lines.${i}.new_item.type`])];
    const { errors, message, busy, formRef, run } = useAction(fields);
    const set = (id, changes) => setRows({ ...rows, [id]: { ...rows[id], ...changes } });

    function submit(e) {
        e.preventDefault();
        const lines = accepted.map((l) => {
            const r = rows[l.id];
            return r.mode === 'existing' ? { id: l.id, item_id: Number(r.item_id) } : { id: l.id, new_item: { stock_no: r.stock_no, name: r.name, type: r.type } };
        });
        run(`/purchase-requests/${pr.id}/issue`, { received_by: receivedBy, lines }, () => onDone(`Issued to ${receivedBy}. Print the RIS and any ICS or PAR for signatures.`));
    }

    return (
        <form ref={formRef} onSubmit={submit} className="space-y-4" noValidate>
            <Alert>{message}</Alert>
            {errors.lines && <p className="text-sm text-red-700">{errors.lines}</p>}
            <ol className="space-y-4">
                {accepted.map((l, i) => {
                    const r = rows[l.id];
                    const slip = r.mode === 'new' && r.type === 'property' ? (Number(l.unit_cost) >= threshold ? 'PAR' : 'ICS') : null;
                    return (
                        <li key={l.id} className="space-y-3 rounded-md p-3 ring-1 ring-slate-200">
                            <p className="text-sm text-slate-900">
                                {l.description}
                                <span className="block text-xs text-slate-500">
                                    {l.quantity_accepted} {l.unit} accepted · {formatPeso(l.unit_cost)} each
                                    {slip && ` · goes on the ${slip}`}
                                </span>
                            </p>
                            <fieldset>
                                <legend className="sr-only">Stock item for {l.description}</legend>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        ['new', 'New stock item'],
                                        ['existing', 'Existing item'],
                                    ].map(([mode, label]) => (
                                        <label
                                            key={mode}
                                            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-3 text-sm ring-1 transition-colors duration-150 has-focus-visible:ring-2 has-focus-visible:ring-brand ${
                                                r.mode === mode ? 'bg-blue-50 ring-brand' : 'bg-white ring-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            <input type="radio" name={`mode-${l.id}`} checked={r.mode === mode} onChange={() => set(l.id, { mode })} className="size-4 accent-brand" />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            {r.mode === 'existing' ? (
                                <ItemPicker name={`lines.${i}.item_id`} value={r.item_id} onChange={(item_id) => set(l.id, { item_id })} error={errors[`lines.${i}.item_id`]} />
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Input label="Stock / property no." name={`lines.${i}.new_item.stock_no`} required maxLength={50} value={r.stock_no} onChange={(e) => set(l.id, { stock_no: e.target.value })} error={errors[`lines.${i}.new_item.stock_no`]} />
                                    <Select label="Type" name={`lines.${i}.new_item.type`} required value={r.type} onChange={(e) => set(l.id, { type: e.target.value })} error={errors[`lines.${i}.new_item.type`]}>
                                        <option value="property">Property (ICS or PAR)</option>
                                        <option value="consumable">Consumable (RIS only)</option>
                                    </Select>
                                    <div className="sm:col-span-2">
                                        <Input label="Item name" name={`lines.${i}.new_item.name`} required maxLength={255} value={r.name} onChange={(e) => set(l.id, { name: e.target.value })} error={errors[`lines.${i}.new_item.name`]} />
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
            <Input label="Received by" name="received_by" required maxLength={255} hint="The person who takes the items at the counter." value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} error={errors.received_by} />
            <p className="text-sm text-slate-600">This stocks in and issues every item at once, and cannot be undone.</p>
            <div className="flex justify-end">
                <Button type="submit" disabled={busy || !receivedBy.trim()}>
                    {busy ? 'Issuing…' : 'Stock in and issue'}
                </Button>
            </div>
        </form>
    );
}
