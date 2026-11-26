import { Link } from 'react-router-dom';
import { Alert, Card, EmptyState, formatDateTime, MovementBadge, Spinner } from '../../components/ui';
import { useApi } from '../../lib/useApi';

// Each card opens the list that holds the work, already filtered.
const CARDS = [
    ['pending_requests', 'Requests to review', '/requests?status=pending'],
    ['to_issue', 'Approved, waiting to be issued', '/requests?status=approved'],
    ['pending_turnovers', 'Turnovers to receive', '/turnovers?status=pending'],
    ['low_stock', 'Low stock items', '/stocks?status=low_stock'],
    ['out_of_stock', 'Out of stock items', '/stocks?status=out_of_stock'],
    ['pending_accounts', 'Accounts waiting for approval', '/accounts?status=pending'],
];

// Same limit as `php artisan spmu:waiting`, which reminds admins at 7:00 AM.
const LATE_DAYS = 3;

/** How long the oldest item in a queue has waited. Late ones say so in words, not only in color. */
function Age({ since }) {
    if (!since) return null;
    const days = Math.floor((Date.now() - new Date(since).getTime()) / 86_400_000);
    const late = days >= LATE_DAYS;
    return (
        <span className={`mt-2 block text-xs ${late ? 'font-medium text-red-700' : 'text-slate-500'}`}>
            {late ? 'Overdue · ' : ''}oldest waiting {days === 0 ? 'since today' : `${days} ${days === 1 ? 'day' : 'days'}`}
        </span>
    );
}

export default function Dashboard() {
    const { data, error, loading } = useApi('/dashboard');

    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
                <p className="text-sm text-slate-600">What needs the Supply Office today. {data.counts.items} items on record.</p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CARDS.map(([key, label, to]) => (
                    <li key={key}>
                        <Link
                            to={to}
                            className="block h-full rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-colors duration-150 hover:bg-slate-50 hover:ring-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                            <span className={`block text-3xl font-semibold tabular-nums ${data.counts[key] > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{data.counts[key]}</span>
                            <span className="mt-1 block text-sm text-slate-600">{label}</span>
                            <Age since={data.oldest?.[key]} />
                        </Link>
                    </li>
                ))}
            </ul>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Low stock">
                    {data.low_stock_items.length === 0 ? (
                        <EmptyState>Every item is above its reorder level.</EmptyState>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {data.low_stock_items.map((item) => (
                                <li key={item.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                    <Link to={`/stocks/${item.id}`} className="inline-flex min-h-11 min-w-0 flex-col justify-center hover:text-brand sm:min-h-0">
                                        <span className="font-medium text-slate-900 hover:underline">{item.name}</span>
                                        <span className="font-mono text-xs text-slate-500">{item.stock_no}</span>
                                    </Link>
                                    <span className={`text-right text-sm whitespace-nowrap tabular-nums ${item.quantity === 0 ? 'font-medium text-red-700' : 'text-amber-800'}`}>
                                        {item.quantity} {item.unit}
                                        <span className="block text-xs text-slate-500">reorder at {item.reorder_level}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card title="Recent stock movements">
                    {data.recent_movements.length === 0 ? (
                        <EmptyState>No stock movements yet.</EmptyState>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {data.recent_movements.map((m) => {
                                return (
                                    <li key={m.id} className="flex items-start justify-between gap-3 py-2 text-sm first:pt-0 last:pb-0">
                                        <div className="min-w-0">
                                            <Link to={`/stocks/${m.item_id}`} className="inline-flex min-h-11 items-center font-medium text-slate-900 hover:text-brand hover:underline sm:min-h-0">
                                                {m.item?.name}
                                            </Link>
                                            <p className="text-xs text-slate-500">
                                                {formatDateTime(m.created_at)}
                                                {m.remarks && ` · ${m.remarks}`}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <MovementBadge type={m.type} />
                                            <span className={`tabular-nums ${m.quantity < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </div>
        </div>
    );
}
