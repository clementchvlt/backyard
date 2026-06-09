import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { useState } from 'react';

export default function Contact() {
    const [sent, setSent] = useState(false);
    const [form, setForm] = useState({ nom: '', email: '', message: '' });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Placeholder — wire up to backend later
        setSent(true);
    };

    return (
        <>
            <Head title="Contact" />
            <MainLayout>
                {/* Page hero */}
                <section className="bg-creme py-10 px-6 text-center border-b border-gray-100">
                    <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">
                        Nous écrire
                    </p>
                    <h1 className="font-chau text-4xl md:text-5xl text-noir">
                        Contact
                    </h1>
                    <p className="text-gris text-sm tracking-wide mt-4 max-w-md mx-auto">
                        Une question sur la course, le parcours ou l'inscription ? On vous répond.
                    </p>
                </section>

                {/* Contact form */}
                <section className="bg-white py-16 px-6">
                    <div className="max-w-lg mx-auto">
                        {sent ? (
                            <div className="text-center py-12">
                                <p className="font-chau text-2xl text-or-principal mb-3">Message envoyé</p>
                                <p className="text-sm text-gris">Nous reviendrons vers vous très bientôt.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] tracking-[0.2em] uppercase text-gris mb-2">
                                        Nom
                                    </label>
                                    <input
                                        type="text"
                                        name="nom"
                                        value={form.nom}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-200 bg-creme px-4 py-3 text-sm text-noir focus:outline-none focus:border-or-principal transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] tracking-[0.2em] uppercase text-gris mb-2">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full border border-gray-200 bg-creme px-4 py-3 text-sm text-noir focus:outline-none focus:border-or-principal transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] tracking-[0.2em] uppercase text-gris mb-2">
                                        Message
                                    </label>
                                    <textarea
                                        name="message"
                                        value={form.message}
                                        onChange={handleChange}
                                        required
                                        rows={5}
                                        className="w-full border border-gray-200 bg-creme px-4 py-3 text-sm text-noir focus:outline-none focus:border-or-principal transition-colors resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="w-full border border-or-principal text-or-principal text-[11px] tracking-[0.3em] uppercase py-4 hover:bg-or-principal hover:text-white transition-colors duration-200"
                                >
                                    ENVOYER
                                </button>
                            </form>
                        )}
                    </div>
                </section>
            </MainLayout>
        </>
    );
}
