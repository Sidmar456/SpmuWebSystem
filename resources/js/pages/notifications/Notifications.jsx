import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, EmptyState, formatDateTime, Spinner } from '../../components/ui';
import { api, errorMessage } from '../../lib/api';
import { useApi } from '../../lib/useApi';

// The header bell listens for this to refresh its unread count.
export const notificationsChanged = () => window.dispatchEvent(new Event('notifications-changed'));

export default function Notifications() {
    const navigate = useNavigate();
    const { data, error, loading, reload } = useApi('/notifications');
    const [message, setMessage] = useState('');

    async function open(n) {
        try {
            if (!n.read_at) await api.post(`/notifications/${n.id}/read`);
            notificationsChanged();
            if (n.data.link) navigate(n.data.link);
            else reload();
        } catch (err) {
            setMessage(errorMessage(err));
        }
    }

    async function readAll() {
        try {
            await api.post('/notifications/read-all');
            notificationsChanged();
            reload();
        } catch (err) {
            setMessage(errorMessage(err));
        }
    }

    if (loading && !data) return <Spinner />;
    if (error) return <Alert>{error}</Alert>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
                    <p className="text-sm text-slate-600">{data.unread === 0 ? 'You are all caught up.' : `${data.unread} unread`}</p>
                </div>
                {data.unread > 0 && (
                    <Button variant="secondary" onClick={readAll}>
                        Mark all as read
                    </Button>
                )}
            </div>

            <Alert>{message}</Alert>

            <Card>
                {data.data.length === 0 ? (
                    <EmptyState>No notifications yet. Updates on your requests and turnovers show here.</EmptyState>
                ) : (
                    <ul className="-mx-4 -my-4 divide-y divide-slate-100">
                        {data.data.map((n) => (
                            <li key={n.id}>
                                <button
                                    type="button"
                                    onClick={() => open(n)}
                                    className={`flex w-full cursor-pointer gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${n.read_at ? '' : 'bg-blue-50/50'}`}
                                >
                                    <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-brand'}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className={`block text-sm ${n.read_at ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>
                                            {!n.read_at && <span className="sr-only">Unread: </span>}
                                            {n.data.title}
                                        </span>
                                        <span className="block text-sm text-slate-600">{n.data.message}</span>
                                        <span className="block text-xs text-slate-500">{formatDateTime(n.created_at)}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
        </div>
    );
}
