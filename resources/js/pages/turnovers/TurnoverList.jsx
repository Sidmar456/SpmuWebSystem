import { ArrowUUpLeft, Certificate, MagnifyingGlass } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, buttonClass, Card, EmptyState, formatDateTime, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { CONDITIONS, TURNOVER_STATUS } from './labels';

const STATUSES = [
    ['', 'All'],
    ['pending', 'For receiving'],
    ['received', 'Received · cleared'],
    ['rejected', 'Not accepted'],
];

export default function TurnoverList() {
    const { isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') ?? '';
    const page = searchParams.get('page') ?? '';

    function setFilters(changes) {
        const next = { status, page: '', ...changes };
        setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v !== '1')), { replace: true });
    }

    const params = Object.fromEntries(Object.entries({ status, page }).filter(([, v]) => v !== ''));
    const { data, error, loading } = useApi('/turnovers', params);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">{isAdmin ? 'Property turnovers' : 'My property'}</h1>
                <p className="text-sm text-slate-600">
                    {isAdmin ? 'Receive returned property at the counter, then accept it (the person is cleared) or not accept it (PRS).' : 'Property issued to you, and the items you have returned (PRS).'}
                </p>
            </div>

            {!isAdmin && <Holdings />}

            <Card title={isAdmin ? null : 'Turnover requests'}>
                <div role="group" aria-label="Status" className="mb-3 flex flex-wrap gap-2">
                    {STATUSES.map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={status === value}
                            onClick={() => setFilters({ status: value })}
                            className={`min-h-11 cursor-pointer rounded-full px-3.5 text-sm font-medium ring-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-9 ${
                                status === value ? 'bg-brand text-white ring-brand' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <p role="status" className="mb-3 text-sm text-slate-600">
                    {data && `${data.total} ${data.total === 1 ? 'turnover' : 'turnovers'}${status ? ` ${data.total === 1 ? 'matches' : 'match'} this filter` : ''}`}
                </p>
                <Alert>{error}</Alert>
                {loading && !data ? (
                    <Spinner />
                ) : data?.data.length === 0 ? (
                    <EmptyState>
                        {status ? (
                            <button type="button" className="cursor-pointer font-medium text-brand underline underline-offset-2" onClick={() => setFilters({ status: '' })}>
                                Show all turnovers
                            </button>
                        ) : (
                            'No turnovers yet.'
                        )}
                    </EmptyState>
                ) : (
                    data && (
                        <>
                            <div className="-mx-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Turnovers">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                                        <tr>
                                            <th scope="col" className="px-4 py-2 font-medium">Turnover</th>
                                            {isAdmin && <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Returned by</th>}
                                            <th scope="col" className="hidden px-4 py-2 text-right font-medium md:table-cell">Qty</th>
                                            <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Condition</th>
                                            <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Submitted</th>
                                            <th scope="col" className="px-4 py-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
                                        {data.data.map((t) => (
                                            <tr key={t.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <Link
                                                        to={`/turnovers/${t.id}`}
                                                        className="inline-flex min-h-11 items-center font-mono font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0"
                                                    >
                                                        {t.turnover_no}
                                                    </Link>
                                                    <p className="text-xs text-slate-500">{t.line.item.name}</p>
                                                    {isAdmin && <p className="text-xs text-slate-500 sm:hidden">{t.user?.name}</p>}
                                                </td>
                                                {isAdmin && (
                                                    <td className="hidden px-4 py-3 sm:table-cell">
                                                        {t.user?.name}
                                                        {t.user?.office && <p className="text-xs text-slate-500">{t.user.office}</p>}
                                                    </td>
                                                )}
                                                <td className="hidden px-4 py-3 text-right whitespace-nowrap tabular-nums md:table-cell">
                                                    {t.quantity} <span className="text-slate-500">{t.line.item.unit}</span>
                                                </td>
                                                <td className="hidden px-4 py-3 lg:table-cell">{CONDITIONS[t.condition]?.[0] ?? t.condition}</td>
                                                <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 lg:table-cell">{formatDateTime(t.created_at)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <StatusBadge status={t.status} label={TURNOVER_STATUS[t.status]} />
                                                        {isAdmin && t.status === 'pending' && (
                                                            <Link to={`/turnovers/${t.id}`} className={buttonClass('primary')} aria-label={`Receive ${t.turnover_no}`}>
                                                                Receive
                                                            </Link>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination meta={data} onPage={(p) => setFilters({ page: String(p) })} />
                        </>
                    )
                )}
            </Card>
        </div>
    );
}

/** Property items issued to the current user, each with a "Turn over" action. */
function Holdings() {
    const { user } = useAuth();
    const { data, error, loading } = useApi('/turnovers/holdings');

    return (
        <Card
            title="Property in your care"
            actions={
                <Link to={`/clearance/${user.id}`} className={buttonClass('ghost')}>
                    <Certificate size={18} aria-hidden="true" />
                    My clearance
                </Link>
            }
        >
            <Alert>{error}</Alert>
            {loading && !data ? (
                <Spinner />
            ) : data?.data.length === 0 ? (
                <EmptyState>No property is issued to you. Property items you receive through a request show here.</EmptyState>
            ) : (
                data && (
                    <ul className="divide-y divide-slate-100">
                        {data.data.map((line) => {
                            const held = line.quantity_issued - line.quantity_returned;
                            const pending = held - line.turnable_quantity;
                            return (
                                <li key={line.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-900">{line.item.name}</p>
                                        <p className="text-xs text-slate-500">
                                            <span className="font-mono">{line.item.stock_no}</span> · {held} {line.item.unit} held · from{' '}
                                            <Link to={`/requests/${line.request.id}`} className="font-mono text-brand hover:underline">
                                                {line.request.request_no}
                                            </Link>
                                            {pending > 0 && ` · ${pending} awaiting turnover`}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link to={`/inspections/new?line=${line.id}`} className={buttonClass('ghost')} aria-label={`Request inspection of ${line.item.name}`}>
                                            <MagnifyingGlass size={18} aria-hidden="true" />
                                            Request inspection
                                        </Link>
                                        {line.turnable_quantity > 0 ? (
                                            <Link to={`/turnovers/new?line=${line.id}`} className={buttonClass('secondary')} aria-label={`Turn over ${line.item.name}`}>
                                                <ArrowUUpLeft size={18} aria-hidden="true" />
                                                Turn over
                                            </Link>
                                        ) : (
                                            <span className="text-sm text-slate-500">Turnover pending</span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )
            )}
        </Card>
    );
}
