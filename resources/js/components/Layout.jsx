import { Archive, Armchair, ArrowUUpLeft, Basket, Bell, Buildings, CaretLeft, Truck, UsersThree, ClipboardText, ClockCounterClockwise, List, ListMagnifyingGlass, MagnifyingGlass, Package, ShoppingCart, SignOut, SquaresFour } from '@phosphor-icons/react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/useApi';
import { Button, buttonClass, Spinner } from './ui';

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

            <aside
                className={`flex flex-col bg-maroon-900/90 text-white backdrop-blur-xl md:sticky md:top-0 md:h-dvh md:shrink-0 md:transition-[width] md:duration-150 motion-reduce:transition-none ${collapsed ? 'md:w-16' : 'md:w-64'}`}
            >
                <div className={`flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3 ${collapsed ? 'md:justify-center md:px-2' : ''}`}>
                    <div className={`flex min-w-0 items-center gap-3 ${collapsed ? 'md:hidden' : ''}`}>
                        <img src="/images/zppsu-logo.jpg" alt="ZPPSU seal" width="40" height="40" className="size-10 shrink-0 rounded-full bg-white object-contain ring-2 ring-gold/70" />
                        <div className="min-w-0">
                        <p className="text-sm font-semibold">SPMU IMS</p>
                        <p className="text-xs text-gold">ZPPSU Supply Office</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="text-white hover:bg-white/10 md:hidden"
                        aria-expanded={menuOpen}
                        aria-controls="main-nav"
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        <List size={20} aria-hidden="true" />
                        Menu
                    </Button>
                    <button
                        type="button"
                        aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
                        aria-expanded={!collapsed}
                        aria-controls="main-nav"
                        title={collapsed ? 'Expand menu' : 'Collapse menu'}
                        onClick={() => setCollapsed((c) => !c)}
                        className="hidden size-10 shrink-0 cursor-pointer items-center justify-center rounded-md bg-white/10 text-white ring-1 ring-white/20 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:inline-flex"
                    >
                        <List size={22} aria-hidden="true" />
                    </button>
                </div>
                <nav id="main-nav" aria-label="Main" className={`${menuOpen ? 'block' : 'hidden'} pb-4 md:block md:flex-1 md:overflow-y-auto`}>
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
                <header className="sticky top-0 z-10 flex items-center justify-end gap-3 border-b border-white/60 bg-white/60 px-4 py-3 backdrop-blur-md">
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
                    {/* Lazy screens load here, so the menu stays on screen while they download. */}
                    <Suspense fallback={<Spinner />}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
