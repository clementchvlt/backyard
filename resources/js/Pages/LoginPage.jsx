import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { useState } from 'react';
import { router } from '@inertiajs/react';

export default function LoginPage() {
    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setErrors({ ...errors, [e.target.name]: null });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.errors) {
                    setErrors(data.errors);
                } else {
                    setErrors({ email: data.message || 'Identifiants incorrects.' });
                }
                return;
            }

            if (!data.user.is_admin) {
                setErrors({ email: "Accès refusé. Droits administrateur requis." });
                return;
            }

            localStorage.setItem('admin_token', data.token);
            localStorage.setItem('admin_user', JSON.stringify(data.user));

            router.visit('/admin');
        } catch {
            setErrors({ email: 'Une erreur est survenue. Veuillez réessayer.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Head title="Connexion" />
            <MainLayout>
                {/* Page hero */}
                <section className="bg-creme py-10 px-6 text-center border-b border-gray-100">
                    <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">
                        Espace administrateur
                    </p>
                    <h1 className="font-chau text-4xl md:text-5xl text-noir">
                        Connexion
                    </h1>
                    <p className="text-gris text-sm tracking-wide mt-4 max-w-md mx-auto">
                        Accès réservé aux organisateurs de la Backyard des Mools.
                    </p>
                </section>

                {/* Login form */}
                <section className="bg-white py-16 px-6">
                    <div className="max-w-md mx-auto">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] tracking-[0.2em] uppercase text-gris mb-2">
                                    Adresse e-mail
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoFocus
                                    className="w-full border border-gray-200 bg-creme px-4 py-3 text-sm text-noir focus:outline-none focus:border-or-principal transition-colors"
                                />
                                {errors.email && (
                                    <p className="text-red-600 text-xs mt-1">{errors.email}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] tracking-[0.2em] uppercase text-gris mb-2">
                                    Mot de passe
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full border border-gray-200 bg-creme px-4 py-3 text-sm text-noir focus:outline-none focus:border-or-principal transition-colors"
                                />
                                {errors.password && (
                                    <p className="text-red-600 text-xs mt-1">{errors.password}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-or-principal text-creme text-[11px] tracking-[0.2em] uppercase py-3 px-6 hover:bg-or-sombre transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Connexion…' : 'Se connecter'}
                            </button>
                        </form>
                    </div>
                </section>
            </MainLayout>
        </>
    );
}
