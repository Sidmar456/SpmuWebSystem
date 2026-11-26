import { Plus } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, buttonClass, Card, EmptyState, Input, Pagination, Spinner } from '../../components/ui';
import { useApi } from '../../lib/useApi';

export default function SupplierList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = { search: searchParams.get('search') ?? '', page: searchParams.get('page') ?? '' };
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
    const { data, error, loading } = useApi('/suppliers', params);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Suppliers</h1>
                    <p className="text-sm text-slate-600">Who the Supply Office buys from, and what each one supplies.</p>
                </div>
                <Link to="/suppliers/new" className={buttonClass('primary')}>
                    <Plus size={18} weight="bold" aria-hidden="true" />
                    Add supplier
                </Link>
            </div>

            <Card>
                <div role="search" className="sm:max-w-sm">
                    <Input label="Search" name="search" type="search" placeholder="Supplier name" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
            </Card>

            <Card>
                <p role="status" className="mb-3 text-sm text-slate-600">
                    {data && `${data.total} ${data.total === 1 ? 'supplier' : 'suppliers'}${filters.search ? (data.total === 1 ? ' matches' : ' match') + ' this search' : ''}`}
                </p>
                <Alert>{error}</Alert>
                {loading && !data ? (
                    <Spinner />
                ) : data?.data.length === 0 ? (
                    <EmptyState>
                        {filters.search ? 'No suppliers match this search.' : 'No suppliers yet. '}
                        {!filters.search && (
                            <Link to="/suppliers/new" className="font-medium text-brand underline underline-offset-2">
                                Add the first one
                            </Link>
                        )}
                    </EmptyState>
                ) : (
                    data && (
                        <>
                            <div className="-mx-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Suppliers">
                                <table className="min-w-full text-left text-sm">
                                    <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                                        <tr>
                                            <th scope="col" className="px-4 py-2 font-medium">Supplier</th>
                                            <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Contact</th>
                                            <th scope="col" className="hidden px-4 py-2 font-medium md:table-cell">Phone</th>
                                            <th scope="col" className="px-4 py-2 text-right font-medium">Items</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
                                        {data.data.map((s) => (
                                            <tr key={s.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <Link to={`/suppliers/${s.id}`} className="inline-flex min-h-11 items-center font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0">
                                                        {s.name}
                                                    </Link>
                                                    {s.email && <p className="text-xs break-all text-slate-500">{s.email}</p>}
                                                </td>
                                                <td className="hidden px-4 py-3 sm:table-cell">{s.contact_person || '—'}</td>
                                                <td className="hidden px-4 py-3 whitespace-nowrap md:table-cell">{s.phone || '—'}</td>
                                                <td className="px-4 py-3 text-right tabular-nums">{s.items_count}</td>
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
