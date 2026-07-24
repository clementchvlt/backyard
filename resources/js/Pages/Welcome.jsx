import { Head, Link } from '@inertiajs/react';
import { useRef } from 'react';
import MainLayout from '@/Layouts/MainLayout';

export default function Welcome() {
    // 5 clics rapprochés sur le logo → révèle le lien CONNEXION dans le menu
    const logoClicksRef = useRef({ count: 0, last: 0 });

    const handleLogoClick = () => {
        const now = Date.now();
        const ref = logoClicksRef.current;
        ref.count = now - ref.last < 2000 ? ref.count + 1 : 1;
        ref.last = now;
        if (ref.count >= 5) {
            ref.count = 0;
            window.dispatchEvent(new CustomEvent('reveal-admin'));
        }
    };

    return (
        <>
            <Head title="Accueil" />
            <MainLayout>
                {/* Hero */}
                <section className="flex flex-col items-center justify-center py-12 px-6 text-center bg-creme">
                    <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-6">
                        Backyard Ultra &nbsp;·&nbsp; Richelieu &nbsp;·&nbsp; Édition 2026
                    </p>

                    <img
                        src="/images/Logo du bg 2.svg"
                        alt="La Backyard des Mools"
                        className="w-96 md:w-[32rem] mb-6 select-none"
                        onClick={handleLogoClick}
                        draggable="false"
                    />

                    <p className="text-[10px] tracking-[0.35em] text-gris uppercase mb-4">
                        Boucle après boucle &nbsp;·&nbsp; jusqu'à 12 boucles
                    </p>

                    
                </section>

                {/* Stats bar */}
                <section className="bg-white grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100 border-t border-gray-100">
                    {[
                        { value: '6,7', unit: 'KM / BOUCLE' },
                        { value: '12', unit: 'BOUCLES MAX' },
                        { value: '1h', unit: 'PAR BOUCLE' },
                        { value: '?', unit: 'SURVIVANTS' },
                    ].map((stat) => (
                        <div key={stat.unit} className="flex flex-col items-center justify-center py-12 border-b md:border-b-0 border-gray-100">
                            <span className="font-chau text-4xl text-or-principal">{stat.value}</span>
                            <span className="text-[10px] tracking-[0.2em] text-gris uppercase mt-3">{stat.unit}</span>
                        </div>
                    ))}
                </section>
            </MainLayout>
        </>
    );
}
