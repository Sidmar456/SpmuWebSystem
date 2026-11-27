/** Centered glass card used by the login and sign-up screens. */
export default function AuthShell({ title, subtitle, children, footer }) {
    return (
        <main className="flex min-h-dvh items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="mb-6 text-center">
                    <img src="/images/zppsu-logo.png" alt="ZPPSU seal" width="80" height="80" className="mx-auto size-20 rounded-full bg-white object-contain shadow-md ring-4 ring-white/70" />
                    <p className="mt-3 text-sm font-semibold tracking-wide text-brand uppercase">e-Supply ZPPSU</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
                </div>
                <div className="glass rounded-xl p-6">{children}</div>
                {footer && <p className="mt-4 text-center text-sm text-slate-700">{footer}</p>}
            </div>
        </main>
    );
}
