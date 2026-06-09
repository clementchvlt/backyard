import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { useState } from 'react';

const quickFacts = [
    { label: 'Date', value: 'Automne 2025' },
    { label: 'Départ', value: '8h00' },
    { label: 'Distance / boucle', value: '6,7 km' },
    { label: 'Lieu', value: 'Richelieu (37)' },
];

const chapters = [
    {
        index: '01',
        title: 'Date & Horaires',
        rows: [
            { label: 'Date', value: 'Automne 2025 — date à confirmer' },
            { label: 'Heure de départ', value: '8h00' },
            { label: 'Départ de chaque boucle', value: 'Toutes les heures pile' },
            { label: 'Clôture des engagements', value: 'La veille à 20h00' },
        ],
    },
    {
        index: '02',
        title: 'Lieu',
        rows: [
            { label: 'Ville', value: 'Richelieu, Indre-et-Loire (37)' },
            { label: 'Point de départ', value: 'Centre-ville de Richelieu' },
            { label: 'Parking', value: 'Gratuit, à proximité du départ' },
            { label: 'Accès', value: 'À 30 min de Tours, 45 min de Poitiers' },
        ],
    },
    {
        index: '03',
        title: "Modalités de l'épreuve",
        rows: [
            { label: 'Format', value: 'Backyard Ultra — dernier survivant' },
            { label: 'Distance par boucle', value: '6,706 km (4,167 miles)' },
            { label: 'Temps par boucle', value: '1 heure exactement' },
            { label: 'Nombre de boucles', value: "Illimité — jusqu'au dernier" },
            { label: 'Vainqueur', value: "Le dernier coureur à compléter un tour quand tous les autres ont abandonné" },
        ],
    },
    {
        index: '04',
        title: 'Règlement',
        rows: [
            { label: 'Départ', value: "Tous les coureurs partent ensemble à l'heure pile" },
            { label: 'Temps limite', value: "Chaque boucle doit être complétée en moins d'1 heure" },
            { label: 'Abandon', value: "Un coureur qui ne prend pas le départ d'une boucle est éliminé" },
            { label: 'Ravitaillement', value: 'Un ravitaillement central est disponible entre chaque boucle' },
            { label: 'Balisage', value: 'Parcours entièrement balisé et sécurisé' },
            { label: 'Nuit', value: 'Éclairage frontal obligatoire après le coucher du soleil' },
            { label: 'Dossard', value: 'Obligatoire, visible à tout moment' },
        ],
    },
    {
        index: '05',
        title: 'Équipement obligatoire',
        rows: [
            { label: 'Éclairage', value: 'Lampe frontale avec pile de rechange' },
            { label: 'Vêtements', value: 'Coupe-vent ou veste imperméable selon météo' },
            { label: 'Téléphone', value: "Chargé, avec le numéro de l'organisation enregistré" },
            { label: 'Hydratation', value: 'Flasque ou gourde recommandée' },
        ],
    },
];

export default function Informations() {
    return (
        <>
            <Head title="Informations" />
            <MainLayout>
                {/* Hero */}
                <section className="bg-creme py-10 px-6 text-center border-b border-gray-100">
                    <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">
                        Tout savoir
                    </p>
                    <h1 className="font-chau text-4xl md:text-5xl text-noir">
                        Informations
                    </h1>
                    <p className="text-gris text-sm tracking-wide mt-4 max-w-md mx-auto">
                        Dates, lieu, règlement et équipement — tout ce qu'il faut savoir avant de s'aligner.
                    </p>
                </section>

                {/* Stats bar */}
                <section className="bg-white py-10 px-6 border-b border-gray-100">
                    <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100">
                        {quickFacts.map((f) => (
                            <div key={f.label} className="bg-white flex flex-col items-center text-center py-10 px-4">
                                <span className="font-chau text-3xl text-or-principal">{f.value}</span>
                                <span className="text-[10px] tracking-[0.2em] text-gris uppercase mt-2">{f.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* All chapters */}
                <section className="bg-creme px-6 py-4">
                    <div className="max-w-4xl mx-auto divide-y divide-gray-200">
                        {chapters.map((chapter, i) => (
                            <Chapter key={chapter.index} chapter={chapter} defaultOpen={i === 0} />
                        ))}
                    </div>
                </section>

                {/* CTA 
                <section className="bg-white border-t border-gray-100 py-14 px-6">
                    <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                        <p className="text-gris text-sm leading-relaxed text-center sm:text-left">
                            Ces informations sont indicatives et susceptibles d'évoluer.
                        </p>
                        <Link
                            href="/contact"
                            className="shrink-0 border border-or-principal text-or-principal text-[11px] tracking-[0.3em] uppercase px-8 py-3 hover:bg-or-principal hover:text-white transition-colors duration-200"
                        >
                            Nous contacter
                        </Link>
                    </div>
                </section>
                */}
            </MainLayout>
        </>
    );
}

function Chapter({ chapter, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div>
            <div
                className="flex items-center gap-4 py-6 cursor-pointer select-none"
                onClick={() => setOpen(!open)}
            >
                <span className="text-[10px] tracking-[0.35em] text-or-principal uppercase font-medium tabular-nums shrink-0">
                    {chapter.index}
                </span>
                <div className="h-px w-8 bg-or-principal shrink-0" />
                <h2 className="font-chau text-xl md:text-2xl text-noir flex-1">{chapter.title}</h2>
                <svg
                    className={`w-4 h-4 text-or-principal transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
            </div>
            {open && (
                <div className="divide-y divide-gray-100 pb-6">
                    {chapter.rows.map((row) => (
                        <div key={row.label} className="flex gap-6 py-4">
                            <span className="text-[11px] uppercase tracking-widest text-gris w-44 shrink-0 pt-0.5">
                                {row.label}
                            </span>
                            <span className="text-sm text-noir leading-relaxed">{row.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
