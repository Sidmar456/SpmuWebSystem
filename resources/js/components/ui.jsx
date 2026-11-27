import { ArrowLeft, Check, WarningCircle, X } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/* Small set of shared building blocks. Keep styling here so screens stay consistent. */

// 44px tall on phones (touch target), 36px from the sm breakpoint up.
const controlHeight = 'min-h-11 sm:min-h-9';

const buttonStyles = {
    primary: 'bg-brand text-white hover:bg-brand-dark',
    secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-600 hover:bg-slate-100',
};

/** Button look, also used on <Link>s that act as buttons ("Add item", "Edit"). */
export const buttonClass = (variant = 'primary') =>
    `inline-flex ${controlHeight} cursor-pointer items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${buttonStyles[variant]}`;

export function Button({ variant = 'primary', className = '', ...props }) {
    return <button type="button" className={`${buttonClass(variant)} ${className}`} {...props} />;
}

/** "Back to …" link above a page title. */
export function BackLink({ to, children }) {
    return (
        <Link to={to} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand hover:underline sm:min-h-0">
            <ArrowLeft size={16} aria-hidden="true" />
            {children}
        </Link>
    );
}

// 16px text on phones so iOS does not zoom into the field on focus.
const inputClass = `block w-full ${controlHeight} rounded-md border-0 bg-white px-3 py-2 text-base text-slate-900 ring-1 ring-slate-300 placeholder:text-slate-500 read-only:bg-slate-50 read-only:text-slate-600 focus:ring-2 focus:ring-brand aria-invalid:ring-2 aria-invalid:ring-red-600 sm:text-sm`;

/** Label + control + error message, wired for screen readers. */
export function Field({ label, error, hint, required = false, children }) {
    const id = useId();
    const control =
        typeof children === 'function'
            ? children({ id, required, 'aria-invalid': !!error || undefined, 'aria-describedby': error || hint ? `${id}-msg` : undefined })
            : children;
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                {label}
                {required && (
                    <>
                        <span aria-hidden="true" className="text-red-600">
                            {' '}
                            *
                        </span>
                        <span className="sr-only"> (required)</span>
                    </>
                )}
            </label>
            {control}
            {(error || hint) && (
                <p id={`${id}-msg`} className={error ? 'text-sm text-red-700' : 'text-xs text-slate-500'}>
                    {error || hint}
                </p>
            )}
        </div>
    );
}

/** `prefix` (e.g. "₱") shows inside the field, before the value. */
export function Input({ label, error, hint, required, prefix, ...props }) {
    return (
        <Field label={label} error={error} hint={hint} required={required}>
            {(a11y) =>
                prefix ? (
                    <div className="relative">
                        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
                            {prefix}
                        </span>
                        <input className={`${inputClass} pl-7`} {...a11y} {...props} />
                    </div>
                ) : (
                    <input className={inputClass} {...a11y} {...props} />
                )
            }
        </Field>
    );
}

export function Select({ label, error, hint, required, children, ...props }) {
    return (
        <Field label={label} error={error} hint={hint} required={required}>
            {(a11y) => (
                <select className={inputClass} {...a11y} {...props}>
                    {children}
                </select>
            )}
        </Field>
    );
}

export function Textarea({ label, error, hint, required, ...props }) {
    return (
        <Field label={label} error={error} hint={hint} required={required}>
            {(a11y) => <textarea rows={3} className={inputClass} {...a11y} {...props} />}
        </Field>
    );
}

export function Card({ title, actions, children, className = '' }) {
    return (
        <section className={`rounded-lg bg-white shadow-sm ring-1 ring-slate-200 ${className}`}>
            {(title || actions) && (
                <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    <div className="flex flex-wrap gap-2">{actions}</div>
                </header>
            )}
            <div className="p-4">{children}</div>
        </section>
    );
}

export function Alert({ kind = 'error', children }) {
    if (!children) return null;
    const styles = kind === 'error' ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    return (
        <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-md px-3 py-2 text-sm ring-1 ${styles}`}>
            {children}
        </div>
    );
}

const badgeStyles = {
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    red: 'bg-red-50 text-red-700 ring-red-600/20',
    blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export function Badge({ color = 'slate', children }) {
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeStyles[color]}`}>{children}</span>;
}

const stockStatus = {
    in_stock: ['green', 'In stock'],
    low_stock: ['amber', 'Low stock'],
    out_of_stock: ['red', 'Out of stock'],
};

export function StockBadge({ status }) {
    const [color, text] = stockStatus[status] ?? ['slate', status];
    return <Badge color={color}>{text}</Badge>;
}

// Request (RIS) and turnover (PRS) statuses.
const statusBadges = {
    pending: ['amber', 'Pending'],
    approved: ['blue', 'Approved'],
    issued: ['green', 'Issued'],
    rejected: ['red', 'Rejected'],
    cancelled: ['slate', 'Cancelled'],
    received: ['green', 'Received'],
    disabled: ['slate', 'Disabled'],
    requested: ['amber', 'Requested'],
    scheduled: ['blue', 'Scheduled'],
    inspected: ['green', 'Inspected'],
    submitted: ['amber', 'Submitted'],
    answered: ['blue', 'Answered'],
    returned: ['red', 'Returned'],
    ordered: ['green', 'Ordered'],
    delivered: ['blue', 'Delivered'],
    available: ['green', 'Available'],
    not_available: ['red', 'Not available'],
    disposed: ['slate', 'Disposed'],
};

/** `label` replaces the default text, e.g. "For inspection" for a pending turnover. */
export function StatusBadge({ status, label }) {
    const [color, text] = statusBadges[status] ?? ['slate', status];
    return <Badge color={color}>{label ?? text}</Badge>;
}

/** One label/value pair inside a <dl>. */
export function Detail({ label, children }) {
    return (
        <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">{label}</dt>
            <dd className="mt-0.5 text-slate-900">{children}</dd>
        </div>
    );
}

const movementLabels = {
    stock_in: ['green', 'Stock in'],
    issue: ['blue', 'Issued'],
    turnover: ['slate', 'Turned over'],
    adjustment: ['amber', 'Adjustment'],
};

export function MovementBadge({ type }) {
    const [color, text] = movementLabels[type] ?? ['slate', type];
    return <Badge color={color}>{text}</Badge>;
}

export function Spinner({ label = 'Loading…' }) {
    return (
        // min-h keeps roughly a list's height, so content does not jump when it arrives.
        <div role="status" className="flex min-h-32 items-center gap-2 p-6 text-sm text-slate-500">
            <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand motion-reduce:animate-none" aria-hidden="true" />
            {label}
        </div>
    );
}

export function EmptyState({ children }) {
    return <p className="p-6 text-center text-sm text-slate-500">{children}</p>;
}

/** Laravel paginator footer. */
export function Pagination({ meta, onPage }) {
    if (!meta || meta.last_page <= 1) return null;
    return (
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 pt-4 text-sm text-slate-600">
            <span>
                Page {meta.current_page} of {meta.last_page} · {meta.total} total
            </span>
            <div className="flex gap-2">
                <Button variant="secondary" disabled={meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)}>
                    Previous
                </Button>
                <Button variant="secondary" disabled={meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)}>
                    Next
                </Button>
            </div>
        </nav>
    );
}

/** Native <dialog>: focus trap, Escape to close and backdrop come from the browser. */
/** `wide` for forms that repeat a block per item (IAR, issue, corrections). */
export function Modal({ open, title, onClose, children, wide = false }) {
    const ref = useRef(null);
    const titleId = useId();
    useEffect(() => {
        const dialog = ref.current;
        if (open && !dialog.open) {
            dialog.showModal();
            // showModal() focuses the first button (Close); move focus to the first field instead.
            dialog.querySelector('input, select, textarea')?.focus();
        }
        if (!open && dialog.open) dialog.close();
    }, [open]);
    return (
        <dialog
            ref={ref}
            onClose={onClose}
            aria-labelledby={titleId}
            className={`m-auto w-[calc(100%-2rem)] ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-lg p-0 shadow-xl backdrop:bg-slate-900/40`}
        >
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <h2 id={titleId} className="text-base font-semibold">
                    {title}
                </h2>
                <Button variant="ghost" aria-label="Close" className="px-2" onClick={onClose}>
                    <X size={20} aria-hidden="true" />
                </Button>
            </header>
            <div className="p-4">{open && children}</div>
        </dialog>
    );
}

/**
 * Top-of-form list of every field error after a failed submit. Each item focuses its field
 * (found by the control's `name`). Inline errors stay under the fields too.
 */
export function ErrorSummary({ errors, labels }) {
    const entries = Object.entries(errors).filter(([field]) => labels[field]);
    if (entries.length === 0) return null;
    const focusField = (event, field) => {
        const control = event.currentTarget.closest('form')?.elements[field];
        // A radio group comes back as a RadioNodeList; focus its first option.
        (control instanceof RadioNodeList ? control[0] : control)?.focus();
    };
    return (
        <div data-error-summary tabIndex={-1} role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200 focus:outline-2 focus:outline-red-600">
            <p className="flex items-center gap-2 font-medium">
                <WarningCircle size={18} weight="bold" aria-hidden="true" />
                Please fix {entries.length === 1 ? 'this field' : `these ${entries.length} fields`}:
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-9">
                {entries.map(([field, message]) => (
                    <li key={field}>
                        <button type="button" onClick={(e) => focusField(e, field)} className="cursor-pointer text-left underline underline-offset-2 hover:text-red-950">
                            {labels[field]}: {message}
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * After a failed submit, move focus to the error summary if the form has one,
 * otherwise to the first invalid field. Attach the returned ref to the <form>.
 */
export function useErrorFocus(errors) {
    const ref = useRef(null);
    useEffect(() => {
        if (Object.keys(errors).length === 0 || !ref.current) return;
        (ref.current.querySelector('[data-error-summary]') ?? ref.current.querySelector('[aria-invalid="true"]'))?.focus();
    }, [errors]);
    return ref;
}

/** Date only, e.g. "26 Nov 2026". A plain YYYY-MM-DD is read as a local date, not UTC midnight. */
export const formatDate = (value) =>
    value ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '';

/** Today as local YYYY-MM-DD, for date inputs. */
export const today = () => new Date().toLocaleDateString('en-CA');

export const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const stepState = {
    done: ['bg-brand text-white ring-brand', 'completed'],
    current: ['bg-white text-brand ring-2 ring-brand', 'current step'],
    upcoming: ['bg-white text-slate-500 ring-slate-300', 'not started'],
};

/**
 * Where a multi-step process stands. `steps`: [{ label, detail, done }]. State is in text too, not colour alone.
 * On small screens only a summary shows until "Show all steps" is pressed; wide screens always show the row.
 */
export function ProgressSteps({ label, steps }) {
    const current = steps.findIndex((s) => !s.done);
    const [open, setOpen] = useState(false);
    const listId = useId();
    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 lg:hidden">
                <p className="text-sm text-slate-700">
                    {current === -1 ? (
                        `All ${steps.length} steps done`
                    ) : (
                        <>
                            Step {current + 1} of {steps.length}: <span className="font-medium text-slate-900">{steps[current].label}</span>
                        </>
                    )}
                </p>
                <Button variant="ghost" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)}>
                    {open ? 'Hide steps' : 'Show all steps'}
                </Button>
            </div>
        <ol id={listId} aria-label={label} className={`${open ? 'grid' : 'hidden'} gap-3 lg:flex lg:gap-0`}>
            {steps.map((s, i) => {
                const state = s.done ? 'done' : i === current ? 'current' : 'upcoming';
                const [circle, text] = stepState[state];
                return (
                    <li key={s.label} aria-current={state === 'current' ? 'step' : undefined} className="flex gap-3 lg:flex-1 lg:flex-col lg:gap-2">
                        <div className="flex items-center">
                            <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ring-1 ${circle}`}>
                                {s.done ? <Check size={14} weight="bold" aria-hidden="true" /> : i + 1}
                            </span>
                            {i < steps.length - 1 && <span aria-hidden="true" className={`mx-2 hidden h-0.5 flex-1 lg:block ${s.done ? 'bg-brand' : 'bg-slate-200'}`} />}
                        </div>
                        <div className="min-w-0 lg:pr-2">
                            <p className={`text-sm font-medium ${state === 'upcoming' ? 'text-slate-500' : 'text-slate-900'}`}>
                                {s.label}
                                <span className="sr-only"> ({text})</span>
                            </p>
                            {s.detail && <p className="text-xs break-words text-slate-500">{s.detail}</p>}
                        </div>
                    </li>
                );
            })}
        </ol>
        </div>
    );
}

/** Philippine peso, two decimals. Accepts numbers or the decimal strings Laravel returns. */
export const formatPeso = (value) => Number(value ?? 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
