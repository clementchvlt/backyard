import { Link } from '@inertiajs/react';
import { useState } from 'react';

const navSections = [
    { key: 'dashboard',     label: 'DASHBOARD',    href: '/admin/dashboard' },
    { key: 'participants',  label: 'PARTICIPANTS',  href: '/admin/participants' },
    { key: 'course',        label: 'COURSE',        href: '/admin/course' },
    { key: 'reglages',      label: 'RÉGLAGES',      href: '/admin/reglages' },
];

export default function AdminLayout({ children, activeSection, onLogout, user }) {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-creme font-sans">
            <nav className="bg-creme border-b border-gray-200 relative">
                <div className="max-w-5xl mx-auto px-6 flex items-center justify-between md:justify-center h-16">
                    {/* Desktop nav */}
                    <ul className="hidden md:flex items-center space-x-10">
                        {navSections.map((section) => (
                            <li key={section.key}>
                                <Link
                                    href={section.href}
                                    className={`text-[11px] tracking-[0.2em] font-medium transition-colors pb-1 inline-block ${
                                        activeSection === section.key
                                            ? 'text-or-principal border-b-2 border-or-principal'
                                            : 'text-noir hover:text-or-principal'
                                    }`}
                                >
                                    {section.label}
                                </Link>
                            </li>
                        ))}
                        <li>
                            <button
                                onClick={onLogout}
                                className="text-[11px] tracking-[0.2em] font-medium transition-colors pb-1 inline-block text-noir hover:text-or-principal"
                            >
                                DÉCONNEXION
                            </button>
                        </li>
                    </ul>

                    {/* Mobile brand */}
                    <span className="md:hidden text-[11px] tracking-[0.2em] font-medium text-noir uppercase">
                        {user ? user.name : 'Admin'}
                    </span>

                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden text-noir focus:outline-none"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            {menuOpen ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                            )}
                        </svg>
                    </button>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden bg-creme border-t border-gray-200 px-6 pb-4">
                        <ul className="flex flex-col space-y-4 pt-4">
                            {navSections.map((section) => (
                                <li key={section.key}>
                                    <Link
                                        href={section.href}
                                        onClick={() => setMenuOpen(false)}
                                        className={`text-[11px] tracking-[0.2em] font-medium transition-colors ${
                                            activeSection === section.key
                                                ? 'text-or-principal'
                                                : 'text-noir hover:text-or-principal'
                                        }`}
                                    >
                                        {section.label}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <button
                                    onClick={onLogout}
                                    className="text-[11px] tracking-[0.2em] font-medium text-noir hover:text-or-principal transition-colors"
                                >
                                    DÉCONNEXION
                                </button>
                            </li>
                        </ul>
                    </div>
                )}
            </nav>

            <main>{children}</main>

            <footer className="bg-noir text-creme py-10 mt-auto">
                <div className="max-w-5xl mx-auto px-6 text-center">
                    <p className="text-[11px] tracking-[0.2em] text-gris uppercase">
                        La Backyard des Mools · Richelieu · Édition 2026
                    </p>
                </div>
            </footer>
        </div>
    );
}
