import { Plus } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, buttonClass, Card, EmptyState, formatDate, formatDateTime, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { INSPECTION_STATUS, OUTCOMES } from './labels';

const STATUSES = [['', 'All'], ['open', 'Open'], ...Object.entries(INSPECTION_STATUS)];


export default function InspectionList() {
    const { isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') ?? '';
    const page = searchParams.get('page') ?? '';

    function setFilters(changes) {
        const next = { status, page: '', ...changes };
        setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v !== '1')), { replace: true });
    }

    const params = Object.fromEntries(Object.entries({ status, page }).filter(([, v]) => v !== ''));
    const { data, error, loading } = useApi('/inspections', params);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">{isAdmin ? 'Pre-inspections' : 'My inspection requests'}</h1>
                    <p className="text-sm text-slate-600">
                        {isAdmin
                            ? 'Equipment that personnel reported. Set a date, inspect it, then record the condition found.'
                            : 'Ask the Supply Office to inspect equipment in your care before you repair, replace or turn it over.'}
                    </p>
                </div>
                {!isAdmin && (
                    <Link to="/inspections/new" className={buttonClass('primary')}>
                        <Plus size={18} weight="bold" aria-hidden="true" />
                        Request inspection
                    </Link>
                )}
            </div>

            <Card>
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
                    {data && `${data.total} ${data.total === 1 ? 'inspection' : 'inspections'}${status ? ` ${data.total === 1 ? 'matches' : 'match'} this filter` : ''}`}
                </p>
                <Alert>{error}</Alert>
                {loading && !data ? (
                    <Spinner />
                ) : data?.data.length === 0 ? (
                    <EmptyState>
                        {status ? (
                            <button type="button" className="cursor-pointer font-medium text-brand underline underline-offset-2" onClick={() => setFilters({ status: '' })}>
                                Show all inspections
                            </button>
                        ) : (
                            'No inspection requests yet.'
                        )}
                    </EmptyState>
                ) : (
                    data && (
                        <>
                            <div className="-mx-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Inspections">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                                        <tr>
                                            <th scope="col" className="px-4 py-2 font-medium">Request</th>
                                            {isAdmin && <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Requested by</th>}
                                            <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">Inspection date</th>
                                            <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Submitted</th>
                                            <th scope="col" className="px-4 py-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
                                        {data.data.map((i) => (
                                            <tr key={i.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <Link
                                                        to={`/inspections/${i.id}`}
                                                        className="inline-flex min-h-11 items-center font-mono font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0"
                                                    >
                                                        {i.inspection_no}
                                                    </Link>
                                                    <p className="text-xs text-slate-500">{i.line.item.name}</p>
                                                    {isAdmin && <p className="text-xs text-slate-500 sm:hidden">{i.user?.name}</p>}
                                                </td>
                                                {isAdmin && (
                                                    <td className="hidden px-4 py-3 sm:table-cell">
                                                        {i.user?.name}
                                                        {i.user?.office && <p className="text-xs text-slate-500">{i.user.office}</p>}
                                                    </td>
                                                )}
                                                <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 md:table-cell">{formatDate(i.scheduled_for) || '—'}</td>
                                                <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 lg:table-cell">{formatDateTime(i.created_at)}</td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={i.status} label={INSPECTION_STATUS[i.status]} />
                                                    {i.outcome && <p className="mt-1 text-xs text-slate-600">{OUTCOMES[i.outcome]?.[0]}</p>}
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
