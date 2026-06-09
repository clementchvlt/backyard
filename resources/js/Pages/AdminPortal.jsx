import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
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

function UserRow({ user }) {
    return (
        <tr className="border-b border-gray-100 last:border-0">
            <td className="py-3 text-sm text-noir">{user.name}</td>
            <td className="py-3 text-sm text-gris">{user.email}</td>
            <td className="py-3 text-sm">
                {user.is_admin ? (
                    <span className="text-[10px] tracking-[0.2em] uppercase text-or-principal font-medium">Admin</span>
                ) : (
                    <span className="text-[10px] tracking-[0.2em] uppercase text-gris">Utilisateur</span>
                )}
            </td>
            <td className="py-3 text-xs text-gris">{new Date(user.created_at).toLocaleDateString('fr-FR')}</td>
        </tr>
    );
}

export default function AdminPortal() {
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

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

        fetchDashboard();
    }, []);

    const apiHeaders = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
    };

    const fetchDashboard = async () => {
        setLoading(true);
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
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/users', { headers: apiHeaders });
            if (res.status === 401 || res.status === 403) {
                handleUnauthorized();
                return;
            }
            const data = await res.json();
            setUsers(data);
        } catch {
            setError('Impossible de charger les utilisateurs.');
        } finally {
            setLoading(false);
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
        if (tab === 'dashboard') fetchDashboard();
        if (tab === 'users') fetchUsers();
    };

    return (
        <>
            <Head title="Portail admin" />
            <MainLayout>
                {/* Page hero */}
                <section className="bg-creme py-10 px-6 border-b border-gray-100">
                    <div className="max-w-5xl mx-auto flex items-center justify-between">
                        <div>
                            <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-2">
                                Espace administrateur
                            </p>
                            <h1 className="font-chau text-4xl text-noir">Portail admin</h1>
                            {user && (
                                <p className="text-gris text-sm mt-1">
                                    Connecté en tant que <span className="text-noir font-medium">{user.name}</span>
                                </p>
                            )}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-[10px] tracking-[0.2em] uppercase text-gris hover:text-noir border border-gray-200 px-4 py-2 transition-colors"
                        >
                            Déconnexion
                        </button>
                    </div>
                </section>

                {/* Tab nav */}
                <div className="bg-white border-b border-gray-100">
                    <div className="max-w-5xl mx-auto px-6 flex space-x-8">
                        {[
                            { key: 'dashboard', label: 'Tableau de bord' },
                            { key: 'users', label: 'Utilisateurs' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleTabChange(tab.key)}
                                className={`text-[10px] tracking-[0.2em] uppercase py-4 border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-or-principal text-or-principal'
                                        : 'border-transparent text-gris hover:text-noir'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <section className="bg-white py-12 px-6 min-h-[50vh]">
                    <div className="max-w-5xl mx-auto">
                        {error && (
                            <p className="text-red-600 text-sm mb-6">{error}</p>
                        )}

                        {loading ? (
                            <p className="text-gris text-sm">Chargement…</p>
                        ) : (
                            <>
                                {activeTab === 'dashboard' && stats && (
                                    <div>
                                        <h2 className="text-[11px] tracking-[0.2em] uppercase text-gris mb-6">Statistiques</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <StatCard label="Utilisateurs inscrits" value={stats.total_users} />
                                            <StatCard label="Administrateurs" value={stats.admin_users} />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'users' && (
                                    <div>
                                        <h2 className="text-[11px] tracking-[0.2em] uppercase text-gris mb-6">
                                            Liste des utilisateurs
                                        </h2>
                                        {users.length === 0 ? (
                                            <p className="text-gris text-sm">Aucun utilisateur trouvé.</p>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="border-b border-gray-200">
                                                            <th className="pb-3 text-[10px] tracking-[0.2em] uppercase text-gris font-medium">Nom</th>
                                                            <th className="pb-3 text-[10px] tracking-[0.2em] uppercase text-gris font-medium">Email</th>
                                                            <th className="pb-3 text-[10px] tracking-[0.2em] uppercase text-gris font-medium">Rôle</th>
                                                            <th className="pb-3 text-[10px] tracking-[0.2em] uppercase text-gris font-medium">Inscrit le</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {users.map((u) => (
                                                            <UserRow key={u.id} user={u} />
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </section>
            </MainLayout>
        </>
    );
}
