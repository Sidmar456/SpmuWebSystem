import { Check, Prohibit, ShieldCheck, User, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button, buttonClass, Card, EmptyState, formatDateTime, Modal, Pagination, Spinner, StatusBadge } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useAction } from '../../lib/useAction';
import { useApi } from '../../lib/useApi';

const STATUSES = [
    ['', 'All'],
    ['pending', 'Pending'],
    ['approved', 'Approved'],
    ['disabled', 'Disabled'],
    ['rejected', 'Rejected'],
];

/** Every action that needs a second look, with what it means for the person. */
const CONFIRM = {
    reject: (u) => ({
        title: `Reject ${u.name}?`,
        body: `${u.email} will not be able to log in. This cannot be undone here; they would need to sign up again with another email.`,
        label: 'Reject sign-up',
        variant: 'danger',
        url: `/accounts/${u.id}/reject`,
        done: `${u.name}'s sign-up was rejected. They were notified by email.`,
    }),
    disable: (u) => ({
        title: `Disable ${u.name}?`,
        body: 'They are logged out at once and cannot log in until an admin enables the account again. Their requests, turnovers and history are kept. Someone who still holds property cannot be disabled until it is turned over.',
        label: 'Disable account',
        variant: 'danger',
        url: `/accounts/${u.id}/disable`,
        done: `${u.name} was disabled and logged out.`,
    }),
    admin: (u) => ({
        title: `Make ${u.name} an admin?`,
        body: 'Admins can approve and issue requests, change stock, inspect turnovers, and manage suppliers and accounts.',
        label: 'Make admin',
        variant: 'primary',
        url: `/accounts/${u.id}/role`,
        payload: { role: 'admin' },
        done: `${u.name} is now an admin.`,
    }),
    user: (u) => ({
        title: `Make ${u.name} personnel?`,
        body: 'They lose the admin screens on their next click and keep their own requests, turnovers and history.',
        label: 'Make personnel',
        variant: 'primary',
        url: `/accounts/${u.id}/role`,
        payload: { role: 'user' },
        done: `${u.name} is now personnel.`,
    }),
};

export default function AccountList() {
    const { user: me } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const status = searchParams.get('status') ?? '';
    const page = searchParams.get('page') ?? '';
    const [notice, setNotice] = useState('');
    const [confirming, setConfirming] = useState(null); // { kind, user }
    const quick = useAction([]); // approve and enable need no confirmation

    function setFilters(changes) {
        const next = { status, page: '', ...changes };
        setSearchParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== '' && v !== '1')), { replace: true });
    }

    const params = Object.fromEntries(Object.entries({ status, page }).filter(([, v]) => v !== ''));
    const { data, error, loading, reload } = useApi('/accounts', params);

    function done(message) {
        setConfirming(null);
        setNotice(message);
        reload();
    }

    const ask = (kind, u) => setConfirming({ kind, user: u });

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-semibold text-slate-900">Accounts</h1>
                <p className="text-sm text-slate-600">Approve sign-ups, give admin access, and disable accounts of people who left.</p>
            </div>

            <Alert kind="success">{notice}</Alert>
            <Alert>{quick.message}</Alert>

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
                    {data && `${data.total} ${data.total === 1 ? 'account' : 'accounts'}${status ? ` ${data.total === 1 ? 'matches' : 'match'} this filter` : ''}`}
                </p>
                <Alert>{error}</Alert>
                {loading && !data ? (
                    <Spinner />
                ) : data?.data.length === 0 ? (
                    <EmptyState>{status === 'pending' ? 'No sign-ups are waiting for approval.' : 'No accounts match this filter.'}</EmptyState>
                ) : (
                    data && (
                        <>
                            <ul className={`divide-y divide-slate-100 transition-opacity duration-150 ${loading ? 'opacity-60' : ''}`}>
                                {data.data.map((u) => (
                                    <li key={u.id} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                                        <div className="min-w-0">
                                            <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                                                {u.name}
                                                {u.role === 'admin' && <Badge color="blue">Admin</Badge>}
                                                <StatusBadge status={u.status} />
                                                {u.id === me.id && <Badge>You</Badge>}
                                            </p>
                                            <p className="text-sm break-all text-slate-600">{u.email}</p>
                                            <p className="text-xs text-slate-500">
                                                {u.office || 'No office'} · signed up {formatDateTime(u.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {u.status === 'approved' && (
                                                <Link to={`/clearance/${u.id}`} className={buttonClass('ghost')}>
                                                    Clearance
                                                </Link>
                                            )}
                                            {u.status === 'pending' && (
                                                <>
                                                    <Button
                                                        disabled={quick.busy}
                                                        onClick={() => quick.run(`/accounts/${u.id}/approve`, {}, () => done(`${u.name} can now log in. They were notified by email.`))}
                                                    >
                                                        <Check size={18} weight="bold" aria-hidden="true" />
                                                        Approve
                                                    </Button>
                                                    <Button variant="secondary" onClick={() => ask('reject', u)}>
                                                        <X size={18} aria-hidden="true" />
                                                        Reject
                                                    </Button>
                                                </>
                                            )}
                                            {u.status === 'approved' && u.id !== me.id && (
                                                <>
                                                    <Button variant="secondary" onClick={() => ask(u.role === 'admin' ? 'user' : 'admin', u)}>
                                                        {u.role === 'admin' ? <User size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
                                                        {u.role === 'admin' ? 'Make personnel' : 'Make admin'}
                                                    </Button>
                                                    <Button variant="secondary" onClick={() => ask('disable', u)}>
                                                        <Prohibit size={18} aria-hidden="true" />
                                                        Disable
                                                    </Button>
                                                </>
                                            )}
                                            {u.status === 'disabled' && (
                                                <Button
                                                    variant="secondary"
                                                    disabled={quick.busy}
                                                    onClick={() => quick.run(`/accounts/${u.id}/enable`, {}, () => done(`${u.name} can log in again. They were notified.`))}
                                                >
                                                    <Check size={18} aria-hidden="true" />
                                                    Enable
                                                </Button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <Pagination meta={data} onPage={(p) => setFilters({ page: String(p) })} />
                        </>
                    )
                )}
            </Card>

            <Modal open={!!confirming} title={confirming ? CONFIRM[confirming.kind](confirming.user).title : ''} onClose={() => setConfirming(null)}>
                {confirming && <Confirm action={CONFIRM[confirming.kind](confirming.user)} onKeep={() => setConfirming(null)} onDone={done} />}
            </Modal>
        </div>
    );
}

function Confirm({ action, onKeep, onDone }) {
    const { message, busy, run } = useAction([]);

    return (
        <div className="space-y-4">
            <Alert>{message}</Alert>
            <p className="text-sm text-slate-600">{action.body}</p>
            <div className="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" onClick={onKeep}>
                    Cancel
                </Button>
                <Button variant={action.variant} disabled={busy} onClick={() => run(action.url, action.payload ?? {}, () => onDone(action.done))}>
                    {busy ? 'Saving…' : action.label}
                </Button>
            </div>
        </div>
    );
}
