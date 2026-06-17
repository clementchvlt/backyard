import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import ParticipantTable from '@/Components/ParticipantTable';
import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

function StatCard({ label, value }) {
    return (
        <div className="bg-creme border border-gray-200 p-6">
            <p className="text-[10px] tracking-[0.2em] uppercase text-gris mb-2">{label}</p>
            <p className="font-chau text-4xl text-noir">{value ?? '—'}</p>
        </div>
    );
}

export default function AdminPortal({ section }) {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [error, setError] = useState(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

    // Auth check — une seule fois au montage
    useEffect(() => {
        if (!token) {
            router.visit('/connexion');
            return;
        }
        const storedUser = localStorage.getItem('admin_user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (!parsed.is_admin) {
                router.visit('/connexion');
                return;
            }
            setUser(parsed);
        }
    }, []);

    // Fetch des données à chaque changement de section
    useEffect(() => {
        if (section === 'dashboard') fetchDashboard();
    }, [section]);

    const apiHeaders = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
    };

    const fetchDashboard = async () => {
        setDashboardLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/dashboard', { headers: apiHeaders });
            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }
            const data = await res.json();
            setStats(data);
        } catch {
            setError('Impossible de charger le tableau de bord.');
        } finally {
            setDashboardLoading(false);
        }
    };

    const handleUnauthorized = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        router.visit('/connexion');
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: apiHeaders,
            });
        } finally {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            router.visit('/');
        }
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        window.location.hash = tab;
        if (tab === 'dashboard') fetchDashboard();
    };

    return (
        <>
            <Head title="Portail admin" />
            <AdminLayout
                activeSection={section}
                onLogout={handleLogout}
                user={user}
            >
                {/* Page header */}
                <section className="bg-creme py-8 px-6 border-b border-gray-100">
                    <div className="max-w-5xl mx-auto">
                        <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-1">
                            Espace administrateur
                        </p>
                        <h1 className="font-chau text-3xl text-noir capitalize">
                            {section === 'dashboard' && 'Tableau de bord'}
                            {section === 'participants' && 'Participants'}
                            {section === 'course' && 'Course'}
                            {section === 'reglages' && 'Réglages'}
                        </h1>
                    </div>
                </section>

                {/* Content */}
                <section className="bg-white py-12 px-6 min-h-[50vh]">
                    <div className="max-w-5xl mx-auto">
                        {section === 'dashboard' && (
                            dashboardLoading ? (
                                <p className="text-gris text-sm">Chargement…</p>
                            ) : error ? (
                                <p className="text-red-600 text-sm">{error}</p>
                            ) : stats ? (
                                <div>
                                    <h2 className="text-[11px] tracking-[0.2em] uppercase text-gris mb-6">Statistiques</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <StatCard label="Utilisateurs inscrits" value={stats.total_users} />
                                        <StatCard label="Administrateurs" value={stats.admin_users} />
                                    </div>
                                </div>
                            ) : null
                        )}

                        {section === 'participants' && <ParticipantTable />}

                        {section === 'course' && (
                            <p className="text-gris text-sm">Gestion de la course — à venir.</p>
                        )}

                        {section === 'reglages' && (
                            <p className="text-gris text-sm">Réglages — à venir.</p>
                        )}
                    </div>
                </section>
            </AdminLayout>
        </>
    );
}
