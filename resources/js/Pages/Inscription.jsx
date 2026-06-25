import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

const infos = [
    { label: 'Date', value: 'Samedi 25 juillet 2026' },
    { label: 'Départ', value: '8h00, puis chaque heure jusqu'à 19h' },
    { label: 'Lieu', value: 'Richelieu, Indre-et-Loire' },
    { label: 'Format', value: 'Backyard Ultra — boucles de 6,7 km' },
];

export default function Inscription() {
    return (
        <>
            <Head title="Inscription" />
            <MainLayout>
                {/* Page hero */}
                <section className="bg-creme py-10 px-6 text-center border-b border-gray-100">
                    <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">
                        Rejoindre la course
                    </p>
                    <h1 className="font-chau text-4xl md:text-5xl text-noir">
                        Inscription
                    </h1>
                    <p className="text-gris text-sm tracking-wide mt-4 max-w-md mx-auto">
                        Les inscriptions pour l'édition 2026 seront bientôt ouvertes.
                        Départ le samedi 25 juillet à 8h, puis chaque heure jusqu'à 19h.
                    </p>
                </section>

                {/* Event info */}
                <section className="bg-white py-16 px-6">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="font-chau text-2xl text-noir mb-8">Informations pratiques</h2>
                        <dl className="space-y-0 divide-y divide-gray-100">
                            {infos.map((info) => (
                                <div key={info.label} className="flex justify-between py-4">
                                    <dt className="text-[11px] tracking-[0.15em] uppercase text-gris">{info.label}</dt>
                                    <dd className="text-sm text-noir font-medium">{info.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                {/* CTA */}
                <section className="bg-creme py-16 px-6 text-center">
                    <p className="text-sm text-gris mb-8 max-w-sm mx-auto">
                        Les inscriptions ne sont pas encore ouvertes. Reviens bientôt ou contacte-nous pour être informé.
                    </p>
                    <Link
                        href="/contact"
                        className="border border-or-principal text-or-principal text-[11px] tracking-[0.3em] uppercase px-12 py-4 hover:bg-or-principal hover:text-white transition-colors duration-200 inline-block"
                    >
                        NOUS CONTACTER
                    </Link>
                </section>
            </MainLayout>
        </>
    );
}
