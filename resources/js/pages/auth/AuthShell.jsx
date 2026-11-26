/** Centered card used by the login and sign-up screens. */
export default function AuthShell({ title, subtitle, children, footer }) {
    return (
        <main className="flex min-h-dvh items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="mb-6 text-center">
                    <p className="text-sm font-semibold tracking-wide text-brand uppercase">ZPPSU Supply Office</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
                </div>
                <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-slate-200">{children}</div>
                {footer && <p className="mt-4 text-center text-sm text-slate-600">{footer}</p>}
            </div>
        </main>
    );
}
