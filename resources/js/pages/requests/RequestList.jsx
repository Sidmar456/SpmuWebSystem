import { Plus } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, buttonClass, Card, EmptyState, formatDateTime, Input, Pagination, StatusBadge, Spinner } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';

const FILTERS = ['search', 'status', 'page'];

const STATUSES = [
    ['', 'All'],
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['issued', 'Issued'],
    ['rejected', 'Rejected'],
    ['cancelled', 'Cancelled'],
];

export default function RequestList() {
    const { isAdmin } = useAuth();
    // Filters live in the URL, like the stock list, so Back returns to the same view.
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = Object.fromEntries(FILTERS.map((key) => [key, searchParams.get(key) ?? '']));
    const [search, setSearch] = useState(filters.search);

    function setFilters(changes) {
        const next = { ...filters, page: '', ...changes };
        setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v !== '1')), { replace: true });
    }

    useEffect(() => {
        if (search === filters.search) return;
        const timer = setTimeout(() => setFilters({ search }), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
    const { data, error, loading } = useApi('/requests', params);
    const filtered = filters.search || filters.status;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">{isAdmin ? 'Item requests' : 'My requests'}</h1>
                    <p className="text-sm text-slate-600">
                        {isAdmin ? 'Approve, reject and issue requisitions (RIS).' : 'Requisition and issue slips you have submitted.'}
                    </p>
                </div>
                <Link to="/requests/new" className={buttonClass('primary')}>
                    <Plus size={18} weight="bold" aria-hidden="true" />
                    New request
                </Link>
            </div>

            <Card>
                <div role="search" className="space-y-3">
                    <div role="group" aria-label="Status" className="flex flex-wrap gap-2">
                        {STATUSES.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={filters.status === value}
                                onClick={() => setFilters({ status: value })}
                                className={`min-h-11 cursor-pointer rounded-full px-3.5 text-sm font-medium ring-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-9 ${
                                    filters.status === value ? 'bg-brand text-white ring-brand' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="sm:max-w-sm">
                        <Input
                            label="Search"
                            name="search"
                            type="search"
                            placeholder={isAdmin ? 'RIS no., purpose or requester' : 'RIS no. or purpose'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                <p role="status" className="mb-3 text-sm text-slate-600">
                    {data && `${data.total} ${data.total === 1 ? 'request' : 'requests'}${filtered ? (data.total === 1 ? ' matches' : ' match') + ' these filters' : ''}`}
                </p>
                <Alert>{error}</Alert>
                {loading && !data ? (
                    <Spinner />
                ) : data?.data.length === 0 ? (
                    <EmptyState>
                        {filtered ? 'No requests match these filters. ' : 'No requests yet. '}
                        {filtered ? (
                            <button
                                type="button"
                                className="cursor-pointer font-medium text-brand underline underline-offset-2"
                                onClick={() => {
                                    setSearch('');
                                    setFilters({ search: '', status: '' });
                                }}
                            >
                                Clear filters
                            </button>
                        ) : (
                            <Link to="/requests/new" className="font-medium text-brand underline underline-offset-2">
                                Make your first request
                            </Link>
                        )}
                    </EmptyState>
                ) : (
                    data && (
                        <>
                            <div className="-mx-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Requests">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                                        <tr>
                                            <th scope="col" className="px-4 py-2 font-medium">Request</th>
                                            {isAdmin && <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Requested by</th>}
                                            <th scope="col" className="hidden px-4 py-2 text-right font-medium md:table-cell">Items</th>
                                            <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Submitted</th>
                                            <th scope="col" className="px-4 py-2 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
                                        {data.data.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <Link to={`/requests/${r.id}`} className="inline-flex min-h-11 items-center font-mono font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0">
                                                        {r.request_no}
                                                    </Link>
                                                    <p className="line-clamp-2 text-xs text-slate-500">{r.purpose}</p>
                                                    {isAdmin && <p className="text-xs text-slate-500 sm:hidden">{r.user?.name}</p>}
                                                </td>
                                                {isAdmin && (
                                                    <td className="hidden px-4 py-3 sm:table-cell">
                                                        {r.user?.name}
                                                        {r.office && <p className="text-xs text-slate-500">{r.office}</p>}
                                                    </td>
                                                )}
                                                <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{r.lines.length}</td>
                                                <td className="hidden px-4 py-3 whitespace-nowrap text-slate-600 lg:table-cell">{formatDateTime(r.created_at)}</td>
                                                <td className="px-4 py-3">
                                                    <StatusBadge status={r.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Pagination meta={data} onPage={(page) => setFilters({ page: String(page) })} />
                        </>
                    )
                )}
            </Card>
        </div>
    );
}
