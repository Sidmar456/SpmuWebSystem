import { ArrowUUpLeft, ClipboardText, DownloadSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, buttonClass, Card, EmptyState, formatDateTime, Input, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { REASONS } from '../turnovers/labels';

const KINDS = {
    request: { icon: ClipboardText, label: 'Item request', path: '/requests' },
    turnover: { icon: ArrowUUpLeft, label: 'Property turnover', path: '/turnovers' },
};

export default function History() {
    const { isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const from = searchParams.get('from') ?? '';
    const to = searchParams.get('to') ?? '';

    function setFilter(key, value) {
        const next = { from, to, [key]: value };
        setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true });
    }

    const params = Object.fromEntries(Object.entries({ from, to }).filter(([, v]) => v));
    const { data, error, loading } = useApi('/history', params);
    const entries = data?.data ?? [];

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">{isAdmin ? 'Request history' : 'My history'}</h1>
                <p className="text-sm text-slate-600">Item requests (RIS) and property turnovers (PRS), newest first.</p>
            </div>

            {isAdmin && <StockReport />}

            <Card>
                <div role="search" className="grid gap-3 sm:grid-cols-[12rem_12rem_auto] sm:items-end">
                    <Input label="From" name="from" type="date" value={from} max={to || undefined} onChange={(e) => setFilter('from', e.target.value)} />
                    <Input label="To" name="to" type="date" value={to} min={from || undefined} onChange={(e) => setFilter('to', e.target.value)} />
                    {(from || to) && (
                        <button
                            type="button"
                            className="min-h-11 cursor-pointer justify-self-start text-sm font-medium text-brand underline underline-offset-2 sm:min-h-9"
                            onClick={() => setSearchParams({}, { replace: true })}
                        >
                            Clear dates
                        </button>
                    )}
                </div>
            </Card>

            <Card>
                <p role="status" className="mb-3 text-sm text-slate-600">
                    {data && `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}${from || to ? ' in this date range' : ''}`}
                </p>
                <Alert>{error}</Alert>
                {loading && !data ? (
                    <Spinner />
                ) : entries.length === 0 ? (
                    <EmptyState>{from || to ? 'Nothing in this date range.' : 'No requests or turnovers yet.'}</EmptyState>
                ) : (
                    <ol className={`space-y-0 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
                        {entries.map((e, i) => {
                            const kind = KINDS[e.kind];
                            const Icon = kind.icon;
                            return (
                                <li key={`${e.kind}-${e.id}`} className="relative flex gap-3 pb-4 last:pb-0">
                                    {/* Line joining the timeline dots. */}
                                    {i < entries.length - 1 && <span aria-hidden="true" className="absolute top-9 bottom-0 left-4 w-px bg-slate-200" />}
                                    <span aria-hidden="true" className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                        <Icon size={16} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <span className="sr-only">{kind.label}</span>
                                            <Link
                                                to={`${kind.path}/${e.id}`}
                                                className="inline-flex min-h-11 items-center font-mono text-sm font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0"
                                            >
                                                {e.number}
                                            </Link>
                                            <StatusBadge status={e.status} />
                                            <span className="text-xs text-slate-500">{formatDateTime(e.created_at)}</span>
                                        </div>
                                        <p className="text-sm text-slate-700">
                                            {e.kind === 'turnover' ? `Returned: ${REASONS[e.summary] ?? e.summary}` : e.summary}
                                            {isAdmin && e.user && <span className="text-slate-500"> · {e.user.name}{e.user.office && `, ${e.user.office}`}</span>}
                                        </p>
                                        <p className="text-xs text-slate-500">{e.items.map((it) => `${it.quantity} ${it.unit} ${it.name}`).join(' · ')}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </Card>
        </div>
    );
}

/** S6.3: monthly per-item balances as a CSV file (opens in Excel). */
function StockReport() {
    const [month, setMonth] = useState(() => new Date().toLocaleDateString('en-CA').slice(0, 7)); // local YYYY-MM, not UTC

    return (
        <Card title="Monthly stock report">
            <div className="flex flex-wrap items-end gap-3">
                <div className="w-48">
                    <Input label="Month" name="month" type="month" required value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
                {/* A plain link: the browser downloads the file with the session cookie. */}
                <a href={`/api/reports/stock?month=${month}`} download className={`${buttonClass('secondary')} ${month ? '' : 'pointer-events-none opacity-50'}`} aria-disabled={!month}>
                    <DownloadSimple size={18} aria-hidden="true" />
                    Download CSV
                </a>
            </div>
            <p className="mt-2 text-xs text-slate-500">Per item: opening balance, stock in, issued, turned over, adjustments and closing balance.</p>
        </Card>
    );
}
