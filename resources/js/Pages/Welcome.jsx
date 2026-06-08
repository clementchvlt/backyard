import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

function BackyardLogo() {
    return (
        <svg
            className="w-20 h-24 text-or-principal"
            viewBox="0 0 68 85"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="18" cy="16" r="11" />
            <line x1="27" y1="24" x2="50" y2="53" />
            <polyline points="50,53 50,69 64,69" />
            <line x1="64" y1="62" x2="64" y2="76" />
        </svg>
    );
}

export default function Welcome() {
    return (
        <>
            <Head title="Accueil" />
            <MainLayout>
                {/* Hero */}
                <section className="flex flex-col items-center justify-center py-24 px-6 text-center bg-creme">
                    <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-12">
                        Backyard Ultra &nbsp;·&nbsp; Richelieu &nbsp;·&nbsp; Édition 2025
                    </p>

                    <BackyardLogo />

                    <h1 className="font-serif text-5xl md:text-6xl text-noir mt-8 leading-tight">
                        La Backyard
                        <br />
                        <span className="text-or-principal">des Mools</span>
                    </h1>

                    <p className="text-[10px] tracking-[0.35em] text-gris uppercase mt-6 mb-12">
                        Boucle après boucle &nbsp;·&nbsp; jusqu'au dernier
                    </p>

                    <Link
                        href="/inscription"
                        className="border border-or-principal text-or-principal text-[11px] tracking-[0.3em] uppercase px-12 py-4 hover:bg-or-principal hover:text-white transition-colors duration-200"
                    >
                        S'INSCRIRE
                    </Link>
                </section>

                {/* Stats bar */}
                <section className="bg-white grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
                    {[
                        { value: '6,7', unit: 'KM / BOUCLE' },
                        { value: '∞', unit: 'BOUCLES' },
                        { value: '1h', unit: 'PAR LOOP' },
                        { value: '?', unit: 'SURVIVORS' },
                    ].map((stat) => (
                        <div key={stat.unit} className="flex flex-col items-center justify-center py-12 border-b md:border-b-0 border-gray-100">
                            <span className="font-serif text-4xl text-or-principal">{stat.value}</span>
                            <span className="text-[10px] tracking-[0.2em] text-gris uppercase mt-3">{stat.unit}</span>
                        </div>
                    ))}
                </section>
            </MainLayout>
        </>
    );
}
