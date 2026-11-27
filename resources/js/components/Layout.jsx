import { Archive, ArrowUUpLeft, Bell, Truck, UsersThree, ClipboardText, ClockCounterClockwise, List, ListMagnifyingGlass, MagnifyingGlass, Package, ShoppingCart, SignOut, SquaresFour } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { Button, buttonClass } from './ui';

// Add a line here when a module's screens are built. `admin: true` hides it from personnel; `group` is the menu heading.
const NAV = [
    { to: '/dashboard', label: 'Dashboard', icon: SquaresFour, admin: true },
    { to: '/stocks', label: 'Stocks', icon: Package, group: 'Supplies' },
    { to: '/requests', label: 'Requests', icon: ClipboardText, group: 'Supplies' },
    { to: '/inquiries', label: 'Availability', icon: ListMagnifyingGlass, group: 'Supplies' },
    { to: '/purchase-requests', label: 'Purchase requests', icon: ShoppingCart, group: 'Supplies' },
    { to: '/turnovers', label: 'Turnovers', icon: ArrowUUpLeft, group: 'Property' },
    { to: '/inspections', label: 'Inspections', icon: MagnifyingGlass, group: 'Property' },
    { to: '/unserviceable', label: 'Unserviceable', icon: Archive, admin: true, group: 'Property' },
    { to: '/suppliers', label: 'Suppliers', icon: Truck, admin: true, group: 'Office' },
    { to: '/history', label: 'History', icon: ClockCounterClockwise, group: 'Office' },
    { to: '/accounts', label: 'Accounts', icon: UsersThree, admin: true, group: 'Office' },
];
const GROUPS = [undefined, 'Supplies', 'Property', 'Office'];

export default function Layout() {
    const { user, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const mainRef = useRef(null);
    const firstRender = useRef(true);

    // After moving to another screen, put keyboard and screen-reader focus on the new content.
    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }
        mainRef.current?.focus();
    }, [location.pathname]);

    // Unread count for the bell: refreshed on every screen change and when notifications are read.
    const notifications = useApi('/notifications');
    const unread = notifications.data?.unread ?? 0;
    useEffect(() => {
        notifications.reload();
    }, [location.pathname]);
    useEffect(() => {
        window.addEventListener('notifications-changed', notifications.reload);
        return () => window.removeEventListener('notifications-changed', notifications.reload);
    }, [notifications.reload]);

    const links = NAV.filter((link) => !link.admin || isAdmin);

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <div className="min-h-dvh md:flex">
            <a
                href="#main"
                className="sr-only rounded-md bg-white px-3 py-2 text-sm font-medium text-brand shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
            >
                Skip to main content
            </a>

            <aside className="bg-slate-900 text-slate-100 md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0">
                <div className="flex items-center justify-between px-4 py-4">
                    <div>
                        <p className="text-sm font-semibold">SPMU IMS</p>
                        <p className="text-xs text-slate-300">ZPPSU Supply Office</p>
                    </div>
                    <Button
                        variant="ghost"
                        className="text-slate-100 hover:bg-slate-800 md:hidden"
                        aria-expanded={menuOpen}
                        aria-controls="main-nav"
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <List size={20} aria-hidden="true" />
                        Menu
                    </Button>
                </div>
                <nav id="main-nav" aria-label="Main" className={`${menuOpen ? 'block' : 'hidden'} px-2 pb-4 md:block md:overflow-y-auto`}>
                    {GROUPS.map((group) => {
                        const items = links.filter((link) => link.group === group);
                        if (items.length === 0) return null;
                        return (
                            <div key={group ?? 'top'} role="group" aria-label={group} className="space-y-1">
                                {group && <p className="px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">{group}</p>}
                    {items.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            onClick={() => setMenuOpen(false)}
                            className={({ isActive }) =>
                                `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:min-h-10 ${
                                    isActive ? 'bg-slate-800 font-medium text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={20} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" />
                                    {label}
                                </>
                            )}
                        </NavLink>
                    ))}
                            </div>
                        );
                    })}
                </nav>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex items-center justify-end gap-3 border-b border-slate-200 bg-white px-4 py-3">
                    <Link
                        to="/notifications"
                        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                        className={`${buttonClass('ghost')} relative px-2.5`}
                    >
                        <Bell size={20} weight={unread ? 'fill' : 'regular'} aria-hidden="true" />
                        {unread > 0 && (
                            <span aria-hidden="true" className="absolute top-0.5 right-0.5 min-w-5 rounded-full bg-red-600 px-1 text-center text-xs leading-5 font-semibold text-white">
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </Link>
                    <div className="min-w-0 text-right text-sm">
                        <p className="truncate font-medium text-slate-900">{user.name}</p>
                        <p className="truncate text-xs text-slate-500">{isAdmin ? 'Supply Office' : user.office}</p>
                    </div>
                    <Button variant="secondary" onClick={handleLogout}>
                        <SignOut size={18} aria-hidden="true" />
                        Log out
                    </Button>
                </header>
                <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 p-4 outline-none md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
