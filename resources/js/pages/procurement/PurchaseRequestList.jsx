import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Card, EmptyState, formatDateTime, formatPeso, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { PR_STATUS } from './labels';

export default function PurchaseRequestList() {
    const { isAdmin, isValidator } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const page = searchParams.get('page') ?? '';
    const status = searchParams.get('status') ?? '';
    const setFilters = (changes) => {
        const next = { status, page: '', ...changes };
        setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v !== '1')), { replace: true });
    };
    const { data, error, loading } = useApi('/purchase-requests', Object.fromEntries(Object.entries({ status, page }).filter(([, v]) => v !== '')));

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">Purchase requests</h1>
                <p className="text-sm text-slate-600">
                    {isAdmin || isValidator
                        ? 'PRs prepared by end users. Record each office step in order; the BAC validates and records the bidding.'
                        : 'Start a PR from an answered availability inquiry (items not available) or from a pre-inspection report (parts).'}
                </p>
            </div>

            <Card>
                <div role="group" aria-label="Status" className="mb-3 flex flex-wrap gap-2">
                    {[['', 'All'], ...Object.entries(PR_STATUS)].map(([value, label]) => (
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
                <Alert>{error}</Alert>
                {loading && !data ? (
                    <Spinner />
                ) : data?.data.length === 0 ? (
                    <EmptyState>
                        No purchase requests yet.{' '}
                        {!isAdmin && !isValidator && (
                            <Link to="/inquiries" className="font-medium text-brand underline underline-offset-2">
                                Go to availability inquiries
                            </Link>
                        )}
                    </EmptyState>
                ) : (
                    data && (
                        <>
                            <ul className="divide-y divide-slate-100">
                                {data.data.map((pr) => (
                                    <li key={pr.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                        <div className="min-w-0">
                                            <Link to={`/purchase-requests/${pr.id}`} className="inline-flex min-h-11 items-center font-mono font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0">
                                                {pr.pr_no}
                                            </Link>
                                            <p className="text-xs text-slate-500">
                                                {(isAdmin || isValidator) && `${pr.user?.name}${pr.office ? `, ${pr.office}` : ''} · `}
                                                {pr.lines_count} {pr.lines_count === 1 ? 'item' : 'items'} · {formatDateTime(pr.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium tabular-nums text-slate-900">{formatPeso(pr.total)}</span>
                                            <StatusBadge status={pr.status} label={PR_STATUS[pr.status]} />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <Pagination meta={data} onPage={(p) => setFilters({ page: String(p) })} />
                        </>
                    )
                )}
            </Card>
        </div>
    );
}
