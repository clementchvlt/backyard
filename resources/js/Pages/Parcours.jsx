import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import GpxMap from '@/Components/GpxMap';

const features = [
    {
        label: 'Distance',
        value: '6,7 km',
        desc: 'Par boucle, chronométrée sur 1 heure',
    },
    {
        label: 'Dénivelé',
        value: '~80 m',
        desc: 'Boucle mixte chemins et sentiers',
    },
    {
        label: 'Terrain',
        value: 'Trail',
        desc: 'Chemins agricoles, sous-bois, prairies',
    },
    {
        label: 'Départ',
        value: 'Richelieu',
        desc: 'Centre-ville, parking aménagé',
    },
];

export default function Parcours() {
    return (
        <>
            <Head title="Parcours" />
            <MainLayout>
                {/* Page hero */}
                <section className="bg-creme py-10 px-6 text-center border-b border-gray-100">
                    <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">
                        La Course
                    </p>
                    <h1 className="font-chau text-4xl md:text-5xl text-noir">
                        Le Parcours
                    </h1>
                    <p className="text-gris text-sm tracking-wide mt-4 max-w-md mx-auto">
                        Une boucle de 6,7 km à répéter toutes les heures, jusqu'au dernier survivant.
                    </p>
                </section>

                {/* GPX Map */}
                <section className=" border-b border-gray-100">
                    <GpxMap gpxUrl="/gpx/parcours.gpx" height="480px" />
                    <div className="flex items-center justify-between px-6 py-3  border-t border-gray-100">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-gris">
                            Tracé de la boucle · 6,7 km
                        </p>
                        <a
                            href="/gpx/parcours.gpx"
                            download
                            className="text-[10px] tracking-[0.15em] uppercase text-or-principal hover:text-or-sombre transition-colors"
                        >
                            Télécharger le GPX
                        </a>
                    </div>
                </section>

                {/* Key facts */}
                

                {/* Description */}
                <section className="bg-white py-16 px-6">
                    <div className="max-w-2xl mx-auto">
                        <h2 className="font-chau text-2xl text-noir mb-6">Le concept Backyard Ultra</h2>
                        <p className="text-sm text-gris leading-relaxed mb-4">
                            Inventé par Lazarus Lake, le format Backyard Ultra est simple : une boucle de 6,706 km
                            (soit 4,167 miles — exactement 1/100e de marathon) à compléter toutes les heures.
                            Chaque concurrent repart dès qu'il finit sa boucle, dans la limite du temps imparti.
                        </p>
                        <p className="text-sm text-gris leading-relaxed mb-4">
                            La course se termine quand il ne reste qu'un seul coureur capable de boucler encore un tour.
                            Ce dernier survivant est déclaré vainqueur — mais seulement si les autres ont abandonné.
                        </p>
                        <p className="text-sm text-gris leading-relaxed">
                            À Richelieu, la boucle serpente à travers les chemins du bocage vallonné de l'Indre-et-Loire,
                            pour une expérience à la fois éprouvante et magnifique.
                        </p>
                    </div>
                </section>
            </MainLayout>
        </>
    );
}
