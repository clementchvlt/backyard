import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function Resultats() {
    return (
        <>
            <Head title="Résultats" />
            <MainLayout>
                {/* Page hero */}
                <section className="bg-creme py-10 px-6 text-center border-b border-gray-100">
                    <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">
                        Palmarès
                    </p>
                    <h1 className="font-chau text-4xl md:text-5xl text-noir">
                        Résultats
                    </h1>
                    <p className="text-gris text-sm tracking-wide mt-4 max-w-md mx-auto">
                        Les résultats et chronos de chaque boucle seront disponibles en direct pendant la course.
                        Le classement final sera publié ici après l'événement.
                    </p>
                </section>

                {/* Empty state */}
                <section className="bg-white py-12 px-6">
                    <div className="max-w-xl mx-auto text-center">
                        
                        <p className="text-[11px] tracking-[0.25em] uppercase text-gris mt-6">
                            La course n'a pas encore eu lieu
                        </p>
                        <p className="text-sm text-gris mt-4 leading-relaxed">
                            Revenez après l'événement pour découvrir le classement,
                            le nombre de boucles effectuées, et le nom du dernier survivant.
                        </p>
                    </div>
                </section>
            </MainLayout>
        </>
    );
}
