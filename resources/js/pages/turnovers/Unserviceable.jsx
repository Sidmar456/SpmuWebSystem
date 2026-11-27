import { FilePlus } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, EmptyState, formatDateTime, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { IIRUP_STATUS } from './labels';

const TABS = [
    ['register', 'Register'],
    ['iirups', 'IIRUP and disposal'],
];

/** Unserviceable stockroom: items to consolidate into an IIRUP, and the IIRUPs sent to the disposal committee. */
export default function Unserviceable() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = searchParams.get('tab') === 'iirups' ? 'iirups' : 'register';

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">Unserviceable property</h1>
                <p className="text-sm text-slate-600">Received unserviceable items in the stockroom, consolidated into an IIRUP for the disposal committee.</p>
            </div>

            <nav aria-label="Unserviceable property" className="flex gap-1 border-b border-slate-200">
                {TABS.map(([value, label]) => (
                    <Link
                        key={value}
                        to={value === 'register' ? '/unserviceable' : '/unserviceable?tab=iirups'}
                        replace
                        aria-current={tab === value ? 'page' : undefined}
                        className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                            tab === value ? 'border-brand text-brand' : 'border-transparent text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {label}
                    </Link>
                ))}
            </nav>

            {tab === 'register' ? <Register page={searchParams.get('page') ?? ''} onPage={(p) => setSearchParams({ page: String(p) }, { replace: true })} /> : <IirupList />}
        </div>
    );
}

function Register({ page, onPage }) {
    const navigate = useNavigate();
    const params = { status: 'received', condition: 'unserviceable', unconsolidated: 1, ...(page ? { page } : {}) };
    const { data, error, loading } = useApi('/turnovers', params);
    const [selected, setSelected] = useState([]);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    // Register stays mounted while the page changes, so ticks on other pages are kept.
    const toggle = (id) => setSelected((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

    async function create() {
        setBusy(true);
        setMessage('');
        try {
            const res = await api.post('/iirups', { turnover_ids: selected });
            navigate(`/iirups/${res.data.iirup.id}`, { state: { notice: 'IIRUP created and marked submitted to the disposal committee. Print it for signatures.' } });
        } catch (err) {
            setMessage(errorMessage(err));
            setBusy(false);
        }
    }

    return (
        <Card
            title="In the unserviceable stockroom"
            actions={
                <Button disabled={busy || selected.length === 0} onClick={create}>
                    <FilePlus size={18} aria-hidden="true" />
                    {busy ? 'Creating…' : `Create IIRUP${selected.length ? ` (${selected.length})` : ''}`}
                </Button>
            }
        >
            <p className="mb-3 text-sm text-slate-600">Tick the items to consolidate. An item needs its ARE no. first; set it on the turnover.</p>
            {selected.length > 0 && (
                <p role="status" className="mb-3 text-sm font-medium text-slate-900">
                    {selected.length} selected. Ticks on other pages are kept.{' '}
                    <button type="button" className="cursor-pointer text-brand underline underline-offset-2" onClick={() => setSelected([])}>
                        Clear
                    </button>
                </p>
            )}
            <Alert>{message || error}</Alert>
            {loading && !data ? (
                <Spinner />
            ) : data?.data.length === 0 ? (
                <EmptyState>No unserviceable items are waiting. Items appear here after a turnover is received as unserviceable.</EmptyState>
            ) : (
                data && (
                    <>
                        <div className="-mx-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Register">
                            <table className="min-w-full text-left text-sm">
                                <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                                    <tr>
                                        <th scope="col" className="w-12 px-4 py-2 font-medium">
                                            <span className="sr-only">Select</span>
                                        </th>
                                        <th scope="col" className="px-4 py-2 font-medium">Item</th>
                                        <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Returned by</th>
                                        <th scope="col" className="px-4 py-2 font-medium">ARE no.</th>
                                        <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">Received</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.data.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-1">
                                                <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center has-disabled:cursor-not-allowed">
                                                    <input
                                                        type="checkbox"
                                                        className="size-4 accent-brand"
                                                        disabled={!t.are_no}
                                                        checked={selected.includes(t.id)}
                                                        onChange={() => toggle(t.id)}
                                                        aria-label={`Select ${t.turnover_no}, ${t.line.item.name}`}
                                                    />
                                                </label>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link to={`/turnovers/${t.id}`} className="inline-flex min-h-11 items-center font-mono font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0">
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
                                            <td className="px-4 py-3">
                                                {t.are_no ? (
                                                    <span className="font-mono">{t.are_no}</span>
                                                ) : (
                                                    <Link to={`/turnovers/${t.id}`} className="inline-flex min-h-11 items-center text-sm font-medium text-brand underline underline-offset-2 sm:min-h-0">
                                                        Set ARE no.
                                                    </Link>
                                                )}
                                            </td>
                                            <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 md:table-cell">{formatDateTime(t.decided_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination meta={data} onPage={onPage} />
                    </>
                )
            )}
        </Card>
    );
}

function IirupList() {
    const { data, error, loading } = useApi('/iirups');

    return (
        <Card>
            <Alert>{error}</Alert>
            {loading && !data ? (
                <Spinner />
            ) : data?.data.length === 0 ? (
                <EmptyState>No IIRUP yet. Create one from the Register tab.</EmptyState>
            ) : (
                data && (
                    <ul className="divide-y divide-slate-100">
                        {data.data.map((r) => (
                            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                <div>
                                    <Link to={`/iirups/${r.id}`} className="inline-flex min-h-11 items-center font-mono font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0">
                                        {r.iirup_no}
                                    </Link>
                                    <p className="text-xs text-slate-500">
                                        {r.turnovers_count} {r.turnovers_count === 1 ? 'item' : 'items'} · {formatDateTime(r.created_at)}
                                    </p>
                                </div>
                                <StatusBadge status={r.status} label={IIRUP_STATUS[r.status]} />
                            </li>
                        ))}
                    </ul>
                )
            )}
        </Card>
    );
}
