import { List, Plus, ShoppingCartSimple, SquaresFour } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, buttonClass, Card, EmptyState, Input, Pagination, Select, Spinner, StockBadge } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useApi } from '../../lib/useApi';
import ItemPhoto from './ItemPhoto';

const FILTERS = ['search', 'type', 'status', 'page', 'view'];

export default function ItemList() {
    const { isAdmin } = useAuth();
    // Filters live in the URL: Back from an item returns to the same view, and a filtered list can be shared.
    const [searchParams, setSearchParams] = useSearchParams();
    const filters = Object.fromEntries(FILTERS.map((key) => [key, searchParams.get(key) ?? '']));
    const [search, setSearch] = useState(filters.search);
    const view = filters.view === 'list' ? 'list' : 'grid';

    function setFilters(changes) {
        const next = { ...filters, page: '', ...changes };
        setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v !== '1')), { replace: true });
    }

    // Wait until typing pauses before searching.
    useEffect(() => {
        if (search === filters.search) return;
        const timer = setTimeout(() => setFilters({ search }), 300);
        return () => clearTimeout(timer);
    }, [search]);

    const { view: _view, ...apiFilters } = filters;
    const params = Object.fromEntries(Object.entries(apiFilters).filter(([, v]) => v !== ''));
    const { data, error, loading } = useApi('/items', params);
    const filtered = filters.search || filters.type || filters.status;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Stocks</h1>
                    <p className="text-sm text-slate-600">
                        {isAdmin ? 'Current balance of every item in the Supply Office.' : 'Browse what the Supply Office has, then request what you need.'}
                    </p>
                </div>
                {isAdmin && (
                    <Link to="/stocks/new" className={buttonClass('primary')}>
                        <Plus size={18} weight="bold" aria-hidden="true" />
                        Add item
                    </Link>
                )}
            </div>

            <Card>
                <div role="search" className="grid gap-3 sm:grid-cols-3">
                    <Input label="Search" name="search" type="search" placeholder="Name, stock no. or category" value={search} onChange={(e) => setSearch(e.target.value)} />
                    <Select label="Type" name="type" value={filters.type} onChange={(e) => setFilters({ type: e.target.value })}>
                        <option value="">All types</option>
                        <option value="consumable">Consumable</option>
                        <option value="property">Property</option>
                    </Select>
                    <Select label="Status" name="status" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
                        <option value="">Any status</option>
                        <option value="in_stock">In stock</option>
                        <option value="low_stock">Low stock</option>
                        <option value="out_of_stock">Out of stock</option>
                    </Select>
                </div>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Announces the new count after every filter change, without moving focus. */}
                <p role="status" className="text-sm text-slate-600">
                    {data && `${data.total} ${data.total === 1 ? 'item' : 'items'}${filtered ? (data.total === 1 ? ' matches' : ' match') + ' these filters' : ''}`}
                </p>
                <div role="group" aria-label="Layout" className="flex rounded-md ring-1 ring-slate-300">
                    {[
                        ['grid', 'Grid', SquaresFour],
                        ['list', 'List', List],
                    ].map(([value, label, Icon]) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={view === value}
                            onClick={() => setFilters({ view: value === 'grid' ? '' : value, page: filters.page })}
                            className={`inline-flex min-h-11 cursor-pointer items-center gap-1.5 px-3 text-sm font-medium transition-colors duration-150 first:rounded-l-md last:rounded-r-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:min-h-9 ${
                                view === value ? 'bg-brand text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <Icon size={18} aria-hidden="true" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <Alert>{error}</Alert>
            {loading && !data ? (
                <Spinner />
            ) : data?.data.length === 0 ? (
                <Card>
                    <EmptyState>
                        No items match these filters.{' '}
                        {filtered && (
                            <button
                                type="button"
                                className="cursor-pointer font-medium text-brand underline underline-offset-2"
                                onClick={() => {
                                    setSearch('');
                                    setFilters({ search: '', type: '', status: '' });
                                }}
                            >
                                Clear filters
                            </button>
                        )}
                    </EmptyState>
                </Card>
            ) : (
                data && (
                    <>
                        {view === 'grid' ? <ItemGrid items={data.data} loading={loading} /> : <ItemTable items={data.data} loading={loading} isAdmin={isAdmin} />}
                        <Pagination meta={data} onPage={(page) => setFilters({ page: String(page) })} />
                    </>
                )
            )}
        </div>
    );
}

/** Product cards: photo, name, specifications, quantity on hand, and a request button. */
function ItemGrid({ items, loading }) {
    return (
        <ul className={`grid grid-cols-2 gap-3 transition-opacity duration-150 md:grid-cols-3 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
            {items.map((item) => {
                const href = `/stocks/${item.id}`;
                return (
                    <li key={item.id}>
                        <article className="glass relative flex h-full flex-col overflow-hidden rounded-xl transition-shadow duration-150 hover:shadow-md">
                            <div className="p-2 pb-0">
                                <ItemPhoto item={item} size={320} lazy />
                            </div>
                            <div className="flex flex-1 flex-col gap-1.5 p-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <StockBadge status={item.stock_status} />
                                    <span className="text-xs text-slate-500 capitalize">{item.type}</span>
                                </div>
                                <h2 className="text-sm leading-snug font-semibold text-slate-900 sm:text-base">
                                    {/* Stretched link: the whole card opens the item (one tab stop, a large tap target). */}
                                    <Link
                                        to={href}
                                        className="after:absolute after:inset-0 after:rounded-lg after:content-[''] hover:text-brand hover:underline focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand"
                                    >
                                        {item.name}
                                    </Link>
                                </h2>
                                <p className="font-mono text-xs text-slate-500">
                                    {item.stock_no}
                                    {item.category && <span className="font-sans"> · {item.category}</span>}
                                </p>
                                {item.description && <p className="line-clamp-2 text-xs text-slate-600 sm:text-sm">{item.description}</p>}
                                <p className="mt-auto pt-1 text-sm text-slate-600">
                                    <span className={`text-xl font-semibold tabular-nums ${item.quantity === 0 ? 'text-red-700' : 'text-slate-900'}`}>{item.quantity}</span>{' '}
                                    {item.unit} available
                                </p>
                                {item.quantity > 0 ? (
                                    <Link to={`/requests/new?item=${item.id}`} className={`${buttonClass('secondary')} relative z-10 w-full`} aria-label={`Request ${item.name}`}>
                                        <ShoppingCartSimple size={18} aria-hidden="true" />
                                        Request
                                    </Link>
                                ) : (
                                    <span className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-100 text-sm text-slate-500 sm:min-h-9">Out of stock</span>
                                )}
                            </div>
                        </article>
                    </li>
                );
            })}
        </ul>
    );
}

/** Dense table, for counting and checking many items at once. */
function ItemTable({ items, loading, isAdmin }) {
    return (
        <Card>
            <div className="-mx-4 overflow-x-auto focus-visible:outline-2 focus-visible:outline-brand" tabIndex={0} role="region" aria-label="Items">
                <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                        <tr>
                            <th scope="col" className="px-4 py-2 font-medium">Stock no.</th>
                            <th scope="col" className="px-4 py-2 font-medium">Item</th>
                            <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">Type</th>
                            <th scope="col" className="px-4 py-2 text-right font-medium">On hand</th>
                            <th scope="col" className="hidden px-4 py-2 text-right font-medium md:table-cell">Reorder at</th>
                            <th scope="col" className="px-4 py-2 font-medium">Status</th>
                            {isAdmin && <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Supplier</th>}
                        </tr>
                    </thead>
                    <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
                        {items.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-slate-600">{item.stock_no}</td>
                                <td className="px-4 py-3">
                                    <Link to={`/stocks/${item.id}`} className="inline-flex min-h-11 items-center font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0">
                                        {item.name}
                                    </Link>
                                    {item.category && <p className="text-xs text-slate-500">{item.category}</p>}
                                </td>
                                <td className="hidden px-4 py-3 capitalize sm:table-cell">{item.type}</td>
                                <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                    {item.quantity} <span className="text-slate-500">{item.unit}</span>
                                </td>
                                <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 md:table-cell">{item.reorder_level}</td>
                                <td className="px-4 py-3">
                                    <StockBadge status={item.stock_status} />
                                </td>
                                {isAdmin && <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{item.supplier?.name ?? '—'}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
