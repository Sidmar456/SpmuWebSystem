import { Plus } from '@phosphor-icons/react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, buttonClass, Card, EmptyState, formatDateTime, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import { INQUIRY_STATUS } from './labels';

const STATUSES = [['', 'All'], ...Object.entries(INQUIRY_STATUS)];

export default function InquiryList() {
    const { isAdmin } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') ?? '';
    const page = searchParams.get('page') ?? '';

    function setFilters(changes) {
        const next = { status, page: '', ...changes };
        setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v !== '1')), { replace: true });
    }

    const params = Object.fromEntries(Object.entries({ status, page }).filter(([, v]) => v !== ''));
    const { data, error, loading } = useApi('/inquiries', params);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Availability inquiries</h1>
                    <p className="text-sm text-slate-600">
                        {isAdmin
                            ? 'Supplies availability inquiries (SAI). Tag each item available or not available.'
                            : 'Ask the Supply Office whether items are available before you prepare a purchase request (SAI).'}
                    </p>
                </div>
                {!isAdmin && (
                    <Link to="/inquiries/new" className={buttonClass('primary')}>
                        <Plus size={18} weight="bold" aria-hidden="true" />
                        New inquiry
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
                    {data && `${data.total} ${data.total === 1 ? 'inquiry' : 'inquiries'}${status ? ` ${data.total === 1 ? 'matches' : 'match'} this filter` : ''}`}
                </p>
                <Alert>{error}</Alert>
                {loading && !data ? (
                    <Spinner />
                ) : data?.data.length === 0 ? (
                    <EmptyState>
                        {status ? (
                            <button type="button" className="cursor-pointer font-medium text-brand underline underline-offset-2" onClick={() => setFilters({ status: '' })}>
                                Show all inquiries
                            </button>
                        ) : (
                            'No inquiries yet.'
                        )}
                    </EmptyState>
                ) : (
                    data && (
                        <>
                            <ul className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
                                {data.data.map((q) => (
                                    <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                        <div className="min-w-0">
                                            <Link to={`/inquiries/${q.id}`} className="inline-flex min-h-11 items-center font-mono font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0">
                                                {q.inquiry_no}
                                            </Link>
                                            <p className="text-xs text-slate-500">
                                                {isAdmin && `${q.user?.name}${q.office ? `, ${q.office}` : ''} · `}
                                                {q.lines_count} {q.lines_count === 1 ? 'item' : 'items'} · {formatDateTime(q.created_at)}
                                            </p>
                                        </div>
                                        <StatusBadge status={q.status} label={INQUIRY_STATUS[q.status]} />
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
