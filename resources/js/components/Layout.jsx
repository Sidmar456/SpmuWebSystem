import { Archive, Armchair, ArrowUUpLeft, Basket, Bell, Buildings, CaretDown, CaretLeft, CaretRight, House, Truck, UsersThree, ClipboardText, ClockCounterClockwise, List, ListMagnifyingGlass, MagnifyingGlass, Package, ShoppingCart, SignOut, SquaresFour } from '@phosphor-icons/react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { Spinner } from './ui';

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
// [group, icon]: groups open like dropdowns. `undefined` is the top row (Dashboard).
const GROUPS = [[undefined], ['Supplies', Basket], ['Property', Armchair], ['Office', Buildings]];
const COLLAPSED_KEY = 'spmu.menu.collapsed';
// One menu row: full width, a line under each row, a left bar marks the current screen.
const ROW =
    'flex min-h-12 w-full cursor-pointer items-center gap-3 border-b border-l-4 border-b-white/10 px-4 text-left text-[15px] transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white';

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

    // Menu groups are dropdowns. The group holding the current screen always opens, so you can see where you are.
    const activeGroup = NAV.find((link) => location.pathname.startsWith(link.to))?.group;
    const [openGroups, setOpenGroups] = useState(() => new Set(activeGroup ? [activeGroup] : []));
    useEffect(() => {
        if (activeGroup) setOpenGroups((groups) => (groups.has(activeGroup) ? groups : new Set(groups).add(activeGroup)));
    }, [activeGroup]);
    // Desktop only: the ☰ button shrinks the menu to an icon strip. Remembered per browser (a convenience, so it may reset).
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem(COLLAPSED_KEY) === '1';
        } catch {
            return false;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
        } catch {
            // Private window or blocked storage: the menu simply opens expanded next time.
        }
    }, [collapsed]);
    const toggleGroup = (group) =>
        setOpenGroups((groups) => {
            const next = new Set(groups);
            next.has(group) ? next.delete(group) : next.add(group);
            return next;
        });

    // User menu in the top bar: closes on a click outside, on Escape, and on moving to another screen.
    const [userMenu, setUserMenu] = useState(false);
    const userMenuRef = useRef(null);
    useEffect(() => {
        if (!userMenu) return;
        const close = (e) => {
            if (e.type === 'keydown' ? e.key === 'Escape' : !userMenuRef.current?.contains(e.target)) setUserMenu(false);
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', close);
        };
    }, [userMenu]);
    useEffect(() => setUserMenu(false), [location.pathname]);
    const initials = user.name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    // Breadcrumb: Home › the menu page › Details / New for screens below it.
    const page = NAV.find((link) => location.pathname.startsWith(link.to));
    const sub = page && location.pathname !== page.to ? (location.pathname.endsWith('/new') ? 'New' : location.pathname.endsWith('/edit') ? 'Edit' : 'Details') : null;

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <div className="min-h-dvh">
            <a
                href="#main"
                className="sr-only rounded-md bg-white px-3 py-2 text-sm font-medium text-brand shadow focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
            >
                Skip to main content
            </a>

            {/* University bar across the top, like the other ZPPSU systems. */}
            <header className="sticky top-0 z-20 flex h-14 items-center gap-3 bg-brand px-3 text-white shadow-md">
                <button
                    type="button"
                    aria-label="Menu"
                    aria-expanded={menuOpen}
                    aria-controls="main-nav"
                    onClick={() => setMenuOpen((open) => !open)}
                    className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:hidden"
                >
                    <List size={22} aria-hidden="true" />
                </button>
                <Link to="/" className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                    <img src="/images/zppsu-logo.png" alt="" width="40" height="40" className="size-10 shrink-0 rounded-full bg-white object-contain ring-2 ring-gold/70" />
                    <span className="truncate font-serif text-lg tracking-wide [font-variant:small-caps]">E-Supply ZPPSU</span>
                </Link>

                <div className="ml-auto flex items-center gap-1">
                    <Link
                        to="/notifications"
                        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                        className="relative inline-flex size-11 items-center justify-center rounded-md hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    >
                        <Bell size={20} weight={unread ? 'fill' : 'regular'} aria-hidden="true" />
                        {unread > 0 && (
                            <span aria-hidden="true" className="absolute top-1 right-1 min-w-5 rounded-full bg-gold px-1 text-center text-xs leading-5 font-semibold text-maroon-900">
                                {unread > 99 ? '99+' : unread}
                            </span>
                        )}
                    </Link>
                    <div ref={userMenuRef} className="relative">
                        <button
                            type="button"
                            aria-expanded={userMenu}
                            aria-haspopup="true"
                            aria-controls="user-menu"
                            onClick={() => setUserMenu((open) => !open)}
                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-white text-xs font-bold text-brand">
                                {initials}
                            </span>
                            <span className="hidden max-w-48 truncate text-sm font-medium uppercase sm:inline">{user.name}</span>
                            <span className="sr-only sm:hidden">{user.name}</span>
                            <CaretDown size={14} weight="bold" aria-hidden="true" />
                        </button>
                        {userMenu && (
                            <div id="user-menu" className="glass absolute right-0 mt-2 w-64 rounded-lg p-1 text-slate-900 shadow-xl">
                                <div className="border-b border-slate-200/70 px-3 py-2">
                                    <p className="truncate text-sm font-semibold">{user.name}</p>
                                    <p className="truncate text-xs text-slate-600">{user.email}</p>
                                    <p className="truncate text-xs text-slate-600">
                                        {isAdmin ? 'Supply Office' : user.office}
                                        {user.role === 'validator' && ' · BAC validator'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="mt-1 flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-brand/10 focus-visible:outline-2 focus-visible:outline-brand"
                                >
                                    <SignOut size={18} aria-hidden="true" />
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="md:flex">
                <aside
                    className={`${menuOpen ? 'flex' : 'hidden'} flex-col bg-maroon-900/90 text-white backdrop-blur-xl md:sticky md:top-14 md:flex md:h-[calc(100dvh-3.5rem)] md:shrink-0 md:transition-[width] md:duration-150 motion-reduce:transition-none ${collapsed ? 'md:w-16' : 'md:w-64'}`}
                >
                    <div className={`hidden border-b border-white/10 px-3 py-2 md:flex ${collapsed ? 'md:justify-center' : ''}`}>
                        <button
                            type="button"
                            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
                            aria-expanded={!collapsed}
                            aria-controls="main-nav"
                            title={collapsed ? 'Expand menu' : 'Collapse menu'}
                            onClick={() => setCollapsed((c) => !c)}
                            className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-white/10 text-white ring-1 ring-white/20 transition-colors duration-150 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                            <List size={22} aria-hidden="true" />
                        </button>
                    </div>
                    <nav id="main-nav" aria-label="Main" className="pb-4 md:flex-1 md:overflow-y-auto">
                        {GROUPS.map(([group, GroupIcon]) => {
                            const items = links.filter((link) => link.group === group);
                            if (items.length === 0) return null;
                            const open = !group || openGroups.has(group);
                            const listId = `nav-${group ?? 'top'}`;
                            // In the icon strip a group shows only its icon; clicking it expands the menu with that group open.
                            const onGroupClick = () => {
                                if (collapsed && window.matchMedia('(min-width: 768px)').matches) {
                                    setCollapsed(false);
                                    setOpenGroups((groups) => new Set(groups).add(group));
                                } else {
                                    toggleGroup(group);
                                }
                            };
                            return (
                                <div key={group ?? 'top'}>
                                    {group && (
                                        <button
                                            type="button"
                                            aria-expanded={open}
                                            aria-controls={listId}
                                            title={collapsed ? group : undefined}
                                            onClick={onGroupClick}
                                            className={`${ROW} border-l-transparent text-white/85 hover:bg-white/10 hover:text-white ${collapsed ? 'md:justify-center md:px-0' : ''}`}
                                        >
                                            <GroupIcon size={20} aria-hidden="true" className="shrink-0" />
                                            <span className={collapsed ? 'md:sr-only' : ''}>{group}</span>
                                            <CaretLeft
                                                size={14}
                                                weight="bold"
                                                aria-hidden="true"
                                                className={`ml-auto shrink-0 text-white/60 transition-transform duration-150 motion-reduce:transition-none ${open ? '-rotate-90' : ''} ${collapsed ? 'md:hidden' : ''}`}
                                            />
                                        </button>
                                    )}
                                    <div id={listId} role="group" aria-label={group} hidden={!open} className={`${group ? 'bg-black/20' : ''} ${collapsed && group ? 'md:hidden' : ''}`}>
                                        {items.map(({ to, label, icon: Icon }) => (
                                            <NavLink
                                                key={to}
                                                to={to}
                                                title={collapsed ? label : undefined}
                                                onClick={() => setMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `${ROW} ${group ? 'pl-9' : ''} ${collapsed ? 'md:justify-center md:px-0' : ''} ${
                                                        isActive ? 'border-l-gold bg-white/15 font-medium text-white' : 'border-l-transparent text-white/85 hover:bg-white/10 hover:text-white'
                                                    }`
                                                }
                                            >
                                                {({ isActive }) => (
                                                    <>
                                                        <Icon size={20} weight={isActive ? 'fill' : 'regular'} aria-hidden="true" className="shrink-0" />
                                                        <span className={collapsed ? 'md:sr-only' : ''}>{label}</span>
                                                    </>
                                                )}
                                            </NavLink>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <nav aria-label="Breadcrumb" className="glass flex min-h-11 items-center gap-2 rounded-none border-x-0 border-t-0 px-4 text-sm text-slate-600 shadow-none">
                        <Link to="/" className="inline-flex items-center gap-1.5 hover:text-brand hover:underline">
                            <House size={16} aria-hidden="true" />
                            Home
                        </Link>
                        {page && (
                            <>
                                <CaretRight size={12} aria-hidden="true" />
                                {sub ? (
                                    <Link to={page.to} className="hover:text-brand hover:underline">
                                        {page.label}
                                    </Link>
                                ) : (
                                    <span aria-current="page" className="font-medium text-slate-900">
                                        {page.label}
                                    </span>
                                )}
                            </>
                        )}
                        {sub && (
                            <>
                                <CaretRight size={12} aria-hidden="true" />
                                <span aria-current="page" className="font-medium text-slate-900">
                                    {sub}
                                </span>
                            </>
                        )}
                        <span className="ml-auto hidden text-xs text-slate-500 sm:inline">ZPPSU Supply and Property Management Unit</span>
                    </nav>
                    <main id="main" ref={mainRef} tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 p-4 outline-none md:p-6">
                        {/* Lazy screens load here, so the menu stays on screen while they download. */}
                        <Suspense fallback={<Spinner />}>
                            <Outlet />
                        </Suspense>
                    </main>
                </div>
            </div>
        </div>
    );
}
