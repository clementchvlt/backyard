import { Head } from '@inertiajs/react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { fmtDur, fmtClock, fmtDateTime, statusInfo, makeServerClock } from '@/utils/race';

// ─── Détail d'un coureur (modal) ──────────────────────────────────────────────

function RunnerDetail({ p, race, onClose }) {
    const st = statusInfo(p);
    const doneLoops = p.loops.filter((l) => l.state === 'valid' || l.state === 'late' || l.state === 'dnf');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-noir/50 p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-md max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-4">
                    {p.profile_picture_url ? (
                        <img src={p.profile_picture_url} className="w-16 h-16 rounded-full object-cover border border-gray-200" alt="" />
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-creme flex items-center justify-center text-sm text-gris font-medium uppercase">
                            {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                    )}
                    <div>
                        <p className="text-or-principal text-xs font-medium">Dossard #{p.bib_number}</p>
                        <h3 className="font-chau text-2xl text-noir leading-tight">{p.first_name} {p.last_name}</h3>
                        <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] mt-1 ${st.cls}`}>
                            {st.label}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mt-5 text-center">
                    <div className="bg-creme p-3">
                        <p className="font-chau text-2xl text-noir">{p.loops_completed}</p>
                        <p className="text-[10px] tracking-[0.15em] uppercase text-gris mt-1">Boucles</p>
                    </div>
                    <div className="bg-creme p-3">
                        <p className="font-chau text-2xl text-noir">{p.distance_km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}</p>
                        <p className="text-[10px] tracking-[0.15em] uppercase text-gris mt-1">km</p>
                    </div>
                    <div className="bg-creme p-3">
                        <p className="font-chau text-2xl text-noir">{p.avg_seconds != null ? fmtDur(p.avg_seconds) : '—'}</p>
                        <p className="text-[10px] tracking-[0.15em] uppercase text-gris mt-1">Moy. / boucle</p>
                    </div>
                </div>

                {doneLoops.length > 0 && (
                    <div className="mt-5">
                        <p className="text-[10px] tracking-[0.25em] uppercase text-gris mb-2">Temps par boucle</p>
                        <ul className="divide-y divide-gray-100 border border-gray-100">
                            {doneLoops.map((l) => (
                                <li key={l.loop} className="flex items-center justify-between px-3 py-2 text-sm">
                                    <span className="text-gris">Boucle {l.loop}</span>
                                    {l.state === 'valid' && (
                                        <span className="text-noir font-medium">
                                            {fmtDur(l.seconds)}
                                            <span className="text-gris font-normal text-xs ml-2">arrivée {fmtClock(l.arrived_at)}</span>
                                        </span>
                                    )}
                                    {l.state === 'late' && <span className="text-red-600 font-medium">Hors délai</span>}
                                    {l.state === 'dnf' && <span className="text-red-600 font-medium">Abandon</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <p className="text-sm text-gris mt-4 text-center">
                    Temps cumulé : <span className="text-noir font-medium">{p.loops_completed > 0 ? fmtDur(p.total_seconds) : '—'}</span>
                </p>

                <button
                    onClick={onClose}
                    className="w-full mt-5 border border-gray-200 text-[10px] tracking-[0.25em] uppercase text-gris py-2.5 hover:text-noir hover:border-noir transition-colors"
                >
                    Fermer
                </button>
            </div>
        </div>
    );
}

// ─── Tableau de classement ────────────────────────────────────────────────────

function RankingTable({ participants, onSelect }) {
    return (
        <div className="overflow-x-auto border border-gray-200">
            <table className="w-full text-sm whitespace-nowrap">
                <thead>
                    <tr className="bg-creme border-b border-gray-200 text-[10px] tracking-[0.2em] uppercase text-gris">
                        <th className="px-3 py-3 text-left">Clt</th>
                        <th className="px-3 py-3 text-left">Coureur</th>
                        <th className="px-3 py-3 text-center">Boucles</th>
                        <th className="px-3 py-3 text-center hidden sm:table-cell">Distance</th>
                        <th className="px-3 py-3 text-center hidden md:table-cell">Temps cumulé</th>
                        <th className="px-3 py-3 text-center hidden md:table-cell">Moy. / boucle</th>
                        <th className="px-3 py-3 text-center">Statut</th>
                    </tr>
                </thead>
                <tbody>
                    {participants.map((p) => {
                        const st = statusInfo(p);
                        return (
                            <tr
                                key={p.id}
                                onClick={() => onSelect(p)}
                                className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-creme ${p.is_winner ? 'bg-or-principal/5' : ''}`}
                            >
                                <td className="px-3 py-2.5 font-chau text-lg text-noir">
                                    {p.rank}
                                    {p.is_winner && ' 🏆'}
                                </td>
                                <td className="px-3 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        {p.profile_picture_url ? (
                                            <img src={p.profile_picture_url} className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" alt="" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-creme flex items-center justify-center text-[10px] text-gris font-medium uppercase shrink-0">
                                                {p.first_name?.[0]}{p.last_name?.[0]}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-noir font-medium truncate">{p.first_name} {p.last_name}</p>
                                            <p className="text-[11px] text-or-principal">#{p.bib_number}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-2.5 text-center font-medium text-noir">{p.loops_completed}</td>
                                <td className="px-3 py-2.5 text-center text-gris hidden sm:table-cell">
                                    {p.distance_km.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km
                                </td>
                                <td className="px-3 py-2.5 text-center text-gris hidden md:table-cell">{p.loops_completed > 0 ? fmtDur(p.total_seconds) : '—'}</td>
                                <td className="px-3 py-2.5 text-center text-gris hidden md:table-cell">{p.avg_seconds != null ? fmtDur(p.avg_seconds) : '—'}</td>
                                <td className="px-3 py-2.5 text-center">
                                    <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${st.cls}`}>{st.label}</span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Resultats() {
    const [state, setState] = useState(null);
    const [selected, setSelected] = useState(null);
    const [, setTick] = useState(0);

    const refresh = useCallback(async () => {
        try {
            const r = await fetch('/api/race', { headers: { Accept: 'application/json' } });
            if (r.ok) setState(await r.json());
        } catch {
            // silencieux : on retentera au prochain polling
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    // Auto-refresh : 15 s pendant la course, 60 s sinon
    useEffect(() => {
        const live = state?.race?.status === 'live';
        const id = setInterval(refresh, live ? 15000 : 60000);
        return () => clearInterval(id);
    }, [state?.race?.status, refresh]);

    // Tick 1 s pour le compte à rebours
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const serverClock = useMemo(() => makeServerClock(state?.server_now), [state?.server_now]);

    const race = state?.race;
    const participants = state?.participants ?? [];
    const winner = state?.stats?.winner;
    const isLive = race?.status === 'live';
    const isFinished = race?.status === 'finished';

    // La fiche coureur suit les mises à jour du polling
    const selectedLive = selected ? (participants.find((x) => x.id === selected.id) ?? selected) : null;

    let countdown = null;
    if (isLive && race.current_loop_deadline) {
        const remaining = Math.floor((new Date(race.current_loop_deadline).getTime() - serverClock().getTime()) / 1000);
        countdown = fmtDur(Math.max(0, remaining));
    }

    return (
        <>
            <Head title="Résultats" />
            <MainLayout>
                {/* Page hero */}
                <section className="bg-creme py-10 px-6 text-center border-b border-gray-100">
                    <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">
                        {isLive ? 'En direct' : 'Palmarès'}
                    </p>
                    <h1 className="font-chau text-4xl md:text-5xl text-noir">Résultats</h1>
                    {isLive && (
                        <div className="mt-6 inline-flex flex-col items-center gap-1 border border-or-principal bg-white px-8 py-4">
                            <p className="text-[10px] tracking-[0.25em] uppercase text-gris">
                                Boucle {race.current_loop} / {race.max_loops}
                            </p>
                            <p className="font-chau text-3xl text-or-principal tabular-nums">{countdown}</p>
                            <p className="text-[10px] tracking-[0.15em] uppercase text-gris">avant l'heure limite</p>
                        </div>
                    )}
                    {isFinished && winner && (
                        <div className="mt-6 max-w-sm mx-auto border border-or-principal bg-white px-8 py-6">
                            <p className="text-[10px] tracking-[0.3em] uppercase text-or-principal">Dernier survivant</p>
                            <p className="font-chau text-3xl text-noir mt-2">🏆 {winner.name}</p>
                            <p className="text-xs text-gris mt-2">
                                #{winner.bib_number} — {winner.loops} boucles ·{' '}
                                {(winner.loops * (race?.loop_distance_km ?? 0)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km
                            </p>
                        </div>
                    )}
                    {!isLive && !isFinished && (
                        <p className="text-gris text-sm tracking-wide mt-4 max-w-md mx-auto">
                            {race?.start_at
                                ? `Départ prévu le ${fmtDateTime(race.start_at)}. Le suivi en direct s'affichera ici pendant la course.`
                                : "Les résultats et chronos de chaque boucle seront disponibles en direct pendant la course."}
                        </p>
                    )}
                </section>

                {/* Classement */}
                <section className="bg-white py-10 px-4 md:px-6">
                    <div className="max-w-4xl mx-auto">
                        {(isLive || isFinished) && participants.length > 0 ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-[11px] tracking-[0.25em] uppercase text-noir font-medium">
                                        {isLive ? 'Classement provisoire' : 'Classement final'}
                                    </h2>
                                    {isLive && (
                                        <span className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] uppercase text-gris">
                                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            Mise à jour automatique
                                        </span>
                                    )}
                                </div>
                                <RankingTable participants={participants} onSelect={setSelected} />
                                <p className="text-[11px] text-gris mt-3 text-center">
                                    Classement : nombre de boucles validées, puis temps cumulé. Touchez un coureur pour voir le détail de ses boucles.
                                </p>
                            </>
                        ) : (
                            <div className="max-w-xl mx-auto text-center py-6">
                                <p className="text-[11px] tracking-[0.25em] uppercase text-gris">
                                    La course n'a pas encore eu lieu
                                </p>
                                <p className="text-sm text-gris mt-4 leading-relaxed">
                                    Revenez le jour de l'événement pour suivre en direct le classement,
                                    le nombre de boucles effectuées et découvrir le nom du dernier survivant.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {selectedLive && <RunnerDetail p={selectedLive} race={race} onClose={() => setSelected(null)} />}
            </MainLayout>
        </>
    );
}
