import { useState, useEffect, useCallback } from 'react';

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmt(totalSeconds) {
    const abs = Math.abs(totalSeconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60).toString().padStart(2, '0');
    const s = (abs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

function fmtTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function toDatetimeLocal(date = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBox({ label, value, sub, color = 'default' }) {
    const colors = {
        default: 'bg-creme border-gray-200 text-noir',
        gold:    'bg-creme border-or-principal text-or-principal',
        red:     'bg-red-50 border-red-300 text-red-600',
        orange:  'bg-orange-50 border-orange-300 text-orange-600',
        green:   'bg-green-50 border-green-300 text-green-700',
    };
    return (
        <div className={`border p-4 ${colors[color]}`}>
            <p className="text-[10px] tracking-[0.2em] uppercase text-gris mb-1">{label}</p>
            <p className="font-chau text-3xl leading-none">{value}</p>
            {sub && <p className="text-[10px] text-gris mt-1">{sub}</p>}
        </div>
    );
}

function RunningCard({ p, onFinish, onFinishWithTime, onDnf, loading }) {
    const [showTime, setShowTime] = useState(false);
    const [manualTime, setManualTime] = useState('');

    const toggleTime = () => {
        if (!showTime) setManualTime(toDatetimeLocal());
        setShowTime((s) => !s);
    };

    return (
        <div className="border border-gray-200 bg-white p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {p.profile_picture_url ? (
                    <img src={p.profile_picture_url} className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0" alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gris font-medium uppercase shrink-0">
                        {p.first_name[0]}{p.last_name[0]}
                    </div>
                )}
                <div className="min-w-0">
                    <p className="text-[11px] font-medium text-or-principal">#{p.bib_number}</p>
                    <p className="text-sm font-medium text-noir truncate">{p.last_name}</p>
                    <p className="text-xs text-gris truncate">{p.first_name}</p>
                </div>
            </div>

            {/* Primary actions */}
            <div className="flex gap-1.5">
                <button
                    onClick={onFinish}
                    disabled={loading}
                    className="flex-1 bg-or-principal text-creme text-[10px] tracking-[0.1em] uppercase py-2 hover:bg-or-sombre transition-colors disabled:opacity-50"
                >
                    ✓ Terminé
                </button>
                <button
                    onClick={toggleTime}
                    disabled={loading}
                    title="Saisir l'heure manuellement"
                    className={`border px-2 text-sm transition-colors ${showTime ? 'border-or-principal text-or-principal bg-or-principal/5' : 'border-gray-200 text-gris hover:text-or-principal hover:border-or-principal'}`}
                >
                    ⏱
                </button>
                <button
                    onClick={onDnf}
                    disabled={loading}
                    className="flex-1 border border-red-300 text-red-600 text-[10px] tracking-[0.1em] uppercase py-2 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                    ✗ DNF
                </button>
            </div>

            {/* Manual time input */}
            {showTime && (
                <div className="flex gap-1.5 items-center pt-1 border-t border-gray-100">
                    <input
                        type="datetime-local"
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="flex-1 border border-gray-200 bg-creme px-2 py-1.5 text-xs text-noir focus:outline-none focus:border-or-principal min-w-0"
                    />
                    <button
                        onClick={() => { onFinishWithTime(manualTime); setShowTime(false); }}
                        disabled={!manualTime || loading}
                        className="bg-or-principal text-creme text-[10px] uppercase px-3 py-1.5 hover:bg-or-sombre transition-colors disabled:opacity-50 shrink-0"
                    >
                        ✓
                    </button>
                </div>
            )}
        </div>
    );
}

function FinisherBadge({ p, loopStartedAt }) {
    const loopTime = p.finished_at && loopStartedAt
        ? fmt(Math.floor((new Date(p.finished_at) - new Date(loopStartedAt)) / 1000))
        : null;
    return (
        <div className="border border-or-principal bg-white px-3 py-2 flex items-center justify-between gap-2">
            <div>
                <span className="text-[11px] font-medium text-or-principal mr-1">#{p.bib_number}</span>
                <span className="text-sm text-noir font-medium">{p.last_name}</span>
                <span className="text-xs text-gris ml-1">{p.first_name}</span>
            </div>
            {loopTime && <span className="text-xs text-gris shrink-0">{loopTime}</span>}
        </div>
    );
}

function LoopHistoryTable({ loops, onLoopClick }) {
    if (!loops?.length) return null;
    return (
        <div>
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-gris mb-3">Historique des boucles</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-200">
                            {['Boucle', 'Départ', 'Finissants', 'DNF'].map((h) => (
                                <th key={h} className="pb-2 pr-6 text-[10px] tracking-[0.2em] uppercase text-gris font-medium">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[...loops].reverse().map((loop) => (
                            <tr
                                key={loop.id}
                                onClick={() => onLoopClick?.(loop)}
                                className={`border-b border-gray-100 last:border-0 ${onLoopClick ? 'cursor-pointer hover:bg-creme transition-colors' : ''}`}
                            >
                                <td className="py-2 pr-6 font-medium text-noir text-sm">Boucle {loop.loop_number}</td>
                                <td className="py-2 pr-6 text-sm text-gris">{fmtTime(loop.started_at)}</td>
                                <td className="py-2 pr-6 text-sm text-or-principal font-medium">{loop.finishers_count} ✓</td>
                                <td className="py-2 text-sm text-red-500">{loop.dnf_count > 0 ? `${loop.dnf_count} ✗` : '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function LoopDetailModal({ loop, onClose, token }) {
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!loop) return;
        setLoading(true);
        fetch(`/api/admin/race/loops/${loop.id}`, {
            headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
        })
            .then((r) => r.json())
            .then((d) => setDetail(d))
            .finally(() => setLoading(false));
    }, [loop?.id]);

    if (!loop) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(26,26,26,0.6)' }}
            onClick={onClose}
        >
            <div
                className="bg-creme w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <p className="text-or-principal text-[10px] tracking-[0.3em] uppercase">Détail</p>
                        <h2 className="font-chau text-2xl text-noir">Boucle {loop.loop_number}</h2>
                        {detail && (
                            <p className="text-gris text-xs mt-0.5">
                                Départ {fmtTime(detail.started_at)} — {detail.loop_duration_minutes} min
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gris hover:text-noir transition-colors text-xl leading-none p-1"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-6">
                    {loading ? (
                        <p className="text-gris text-sm text-center py-8">Chargement…</p>
                    ) : detail ? (
                        <>
                            {/* Finishers */}
                            {detail.finishers?.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] tracking-[0.2em] uppercase text-gris mb-3">
                                        Classement — {detail.finishers.length} finissant{detail.finishers.length > 1 ? 's' : ''}
                                    </h3>
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                {['#', 'Dossard', 'Nom', 'Arrivée', 'Temps'].map((h) => (
                                                    <th key={h} className="pb-2 pr-4 text-[10px] tracking-wider uppercase text-gris font-medium last:pr-0">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detail.finishers.map((f) => (
                                                <tr key={f.bib_number} className="border-b border-gray-100 last:border-0">
                                                    <td className="py-2 pr-4 font-chau text-or-principal text-lg leading-none">{f.rank}</td>
                                                    <td className="py-2 pr-4 text-xs text-gris">#{f.bib_number}</td>
                                                    <td className="py-2 pr-4 text-sm font-medium text-noir">
                                                        {f.last_name} <span className="text-gris font-normal">{f.first_name}</span>
                                                    </td>
                                                    <td className="py-2 pr-4 text-sm text-gris tabular-nums">{fmtTime(f.finished_at)}</td>
                                                    <td className="py-2 text-sm text-noir tabular-nums font-medium">
                                                        {f.elapsed_seconds != null ? fmt(f.elapsed_seconds) : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Running (boucle en cours) */}
                            {detail.running?.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] tracking-[0.2em] uppercase text-gris mb-2">
                                        En course ({detail.running.length})
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {detail.running.map((p) => (
                                            <span key={p.bib_number} className="border border-gray-200 bg-white px-2 py-1 text-xs text-gris">
                                                #{p.bib_number} {p.last_name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* DNFs */}
                            {detail.dnfs?.length > 0 && (
                                <div>
                                    <h3 className="text-[10px] tracking-[0.2em] uppercase text-gris mb-2">
                                        Non finissants — {detail.dnfs.length}
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {detail.dnfs.map((p) => (
                                            <span key={p.bib_number} className="border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-600">
                                                #{p.bib_number} {p.last_name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!detail.finishers?.length && !detail.dnfs?.length && !detail.running?.length && (
                                <p className="text-gris text-sm text-center py-4">Aucun résultat enregistré.</p>
                            )}
                        </>
                    ) : (
                        <p className="text-red-500 text-sm text-center py-8">Impossible de charger les données.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function EliminatedList({ participants, currentLoopNumber, onRestore, loading }) {
    if (!participants?.length) return null;
    return (
        <div>
            <h3 className="text-[11px] tracking-[0.2em] uppercase text-gris mb-3">
                Éliminés ({participants.length})
            </h3>
            <div className="flex flex-wrap gap-2">
                {participants
                    .sort((a, b) => (b.eliminated_at_loop ?? 0) - (a.eliminated_at_loop ?? 0))
                    .map((p) => (
                        <div key={p.id} className="border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gris flex items-center gap-2">
                            <span>
                                <span className="font-medium text-noir">#{p.bib_number} {p.last_name}</span>
                                {p.eliminated_at_loop && (
                                    <span className="ml-1">— éliminé boucle {p.eliminated_at_loop}</span>
                                )}
                            </span>
                            {onRestore && p.eliminated_at_loop === currentLoopNumber && (
                                <button
                                    onClick={() => onRestore(p)}
                                    disabled={loading}
                                    title="Corriger : remettre en lice"
                                    className="text-or-principal hover:text-or-sombre transition-colors disabled:opacity-50 shrink-0 text-[10px] tracking-wider uppercase"
                                >
                                    ↩ Corriger
                                </button>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
}

function NotStarted({ onStart, onSchedule, participantCount, loading }) {
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        date: '2026-07-25',
        start_time: '08:00',
        last_departure: '19:00',
        loop_duration: 60,
    });

    const handleSchedule = () => {
        onSchedule({
            scheduled_start_at:    `${form.date}T${form.start_time}`,
            last_departure_at:     `${form.date}T${form.last_departure}`,
            loop_duration_minutes: form.loop_duration,
        });
    };

    return (
        <div className="max-w-lg mx-auto py-12">
            <div className="text-center mb-8">
                <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">Prêt au départ</p>
                <h2 className="font-chau text-5xl text-noir mb-2">Backyard des Mools</h2>
                <p className="text-gris text-sm">
                    {participantCount} participant{participantCount !== 1 ? 's' : ''} inscrit{participantCount !== 1 ? 's' : ''}
                </p>
            </div>

            <div className="flex flex-col items-center gap-3 mb-6">
                <button
                    onClick={onStart}
                    disabled={loading || participantCount === 0}
                    className="bg-or-principal text-creme text-[11px] tracking-[0.2em] uppercase px-10 py-4 hover:bg-or-sombre transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Démarrage…' : '▶ Démarrer maintenant'}
                </button>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="text-gris text-[10px] tracking-wider uppercase hover:text-or-principal transition-colors"
                >
                    {showForm ? '▲ Masquer' : '⏰ Programmer le départ automatique'}
                </button>
            </div>

            {showForm && (
                <div className="border border-gray-200 p-6 bg-white space-y-4">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-gris mb-2">Programmation automatique</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs text-gris mb-1">Date</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                                className="w-full border border-gray-200 bg-creme px-3 py-2 text-sm text-noir focus:outline-none focus:border-or-principal"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gris mb-1">1er départ</label>
                            <input
                                type="time"
                                value={form.start_time}
                                onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                                className="w-full border border-gray-200 bg-creme px-3 py-2 text-sm text-noir focus:outline-none focus:border-or-principal"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gris mb-1">Dernier départ</label>
                            <input
                                type="time"
                                value={form.last_departure}
                                onChange={(e) => setForm((f) => ({ ...f, last_departure: e.target.value }))}
                                className="w-full border border-gray-200 bg-creme px-3 py-2 text-sm text-noir focus:outline-none focus:border-or-principal"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-gris mb-1">Durée par boucle (minutes)</label>
                            <input
                                type="number"
                                min="1"
                                max="1440"
                                value={form.loop_duration}
                                onChange={(e) => setForm((f) => ({ ...f, loop_duration: parseInt(e.target.value) || 60 }))}
                                className="w-full border border-gray-200 bg-creme px-3 py-2 text-sm text-noir focus:outline-none focus:border-or-principal"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSchedule}
                        disabled={loading || participantCount === 0}
                        className="w-full bg-or-principal text-creme text-[11px] tracking-[0.2em] uppercase py-3 hover:bg-or-sombre transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Enregistrement…' : '⏰ Confirmer la programmation'}
                    </button>
                </div>
            )}

            {participantCount === 0 && (
                <p className="text-red-600 text-xs text-center mt-4">Ajoutez des participants avant de démarrer.</p>
            )}
        </div>
    );
}

function Scheduled({ session, participantCount, onStartNow, onCancel, loading }) {
    const [countdown, setCountdown] = useState('');

    useEffect(() => {
        const target = new Date(session.scheduled_start_at);
        const tick = () => {
            const diff = Math.floor((target - Date.now()) / 1000);
            if (diff <= 0) { setCountdown('Démarrage en cours…'); return; }
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            setCountdown(
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            );
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [session.scheduled_start_at]);

    const startDate = new Date(session.scheduled_start_at);

    return (
        <div className="text-center py-12">
            <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">Départ programmé</p>
            <h2 className="font-chau text-5xl text-noir mb-2">Backyard des Mools</h2>
            <p className="text-gris text-sm mb-1">
                {startDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                {' '}à{' '}
                {startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-gris text-xs mb-8">
                {session.max_loops} boucle{session.max_loops !== 1 ? 's' : ''} max
                — {session.loop_duration_minutes} min/boucle
                — {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </p>
            <div className="font-chau text-7xl text-or-principal mb-10 tabular-nums tracking-widest">
                {countdown}
            </div>
            <div className="flex justify-center gap-4">
                <button
                    onClick={onStartNow}
                    disabled={loading}
                    className="bg-or-principal text-creme text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:bg-or-sombre transition-colors disabled:opacity-50"
                >
                    ▶ Démarrer maintenant
                </button>
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="border border-red-300 text-red-600 text-[11px] tracking-[0.2em] uppercase px-8 py-3 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                    ✕ Annuler la programmation
                </button>
            </div>
        </div>
    );
}

function RaceFinished({ participants, onReopen, loading }) {
    const winner = participants?.find((p) => p.is_active);
    return (
        <div className="text-center py-16">
            <p className="text-or-principal text-[10px] tracking-[0.35em] uppercase mb-4">Course terminée</p>
            {winner && (
                <>
                    <p className="font-chau text-6xl text-noir mb-2">#{winner.bib_number}</p>
                    <p className="font-chau text-3xl text-or-principal mb-1">{winner.last_name} {winner.first_name}</p>
                    <p className="text-gris text-sm">{winner.loops_completed} boucle{winner.loops_completed !== 1 ? 's' : ''} complétée{winner.loops_completed !== 1 ? 's' : ''}</p>
                </>
            )}
            {onReopen && (
                <div className="mt-8">
                    <button
                        onClick={onReopen}
                        disabled={loading}
                        className="border border-or-principal text-or-principal text-[10px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-or-principal hover:text-creme transition-colors disabled:opacity-50"
                    >
                        ↩ Mode rattrapage — Rouvrir la dernière boucle
                    </button>
                    <p className="text-gris text-[10px] mt-2">Remet les participants DNF de la dernière boucle en lice pour correction.</p>
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CourseSection() {
    const [race, setRace]               = useState(null);
    const [loading, setLoading]         = useState(true);
    const [actionMsg, setActionMsg]     = useState(null);
    const [actionErr, setActionErr]     = useState(null);
    const [acting, setActing]           = useState(false);
    const [elapsed, setElapsed]         = useState(0);
    const [search, setSearch]           = useState('');
    const [selectedLoop, setSelectedLoop] = useState(null);

    const token = localStorage.getItem('admin_token');
    const h = { Accept: 'application/json', Authorization: `Bearer ${token}` };

    const fetchRace = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/race', { headers: h });
            if (!res.ok) return;
            setRace(await res.json());
        } finally {
            setLoading(false);
        }
    }, []);

    // Poll plus rapide quand l'heure de départ est passée (scheduled → imminent)
    const isImminent = race?.status === 'scheduled'
        && race?.session?.scheduled_start_at
        && new Date(race.session.scheduled_start_at) <= new Date();

    // Fetch on mount + every 30s (ou 3s si départ imminent)
    useEffect(() => {
        fetchRace();
        const interval = isImminent ? 3000 : 30000;
        const id = setInterval(fetchRace, interval);
        return () => clearInterval(id);
    }, [fetchRace, isImminent]);

    // Live timer — updates every second
    useEffect(() => {
        if (!race?.current_loop?.started_at) return;
        const tick = () => setElapsed(
            Math.floor((Date.now() - new Date(race.current_loop.started_at)) / 1000)
        );
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [race?.current_loop?.started_at]);

    const post = async (url, confirm_msg) => {
        if (confirm_msg && !window.confirm(confirm_msg)) return;
        setActing(true);
        setActionMsg(null);
        setActionErr(null);
        try {
            const res = await fetch(url, { method: 'POST', headers: h });
            const data = await res.json();
            if (!res.ok) { setActionErr(data.message); return; }
            setActionMsg(data.message);
            await fetchRace();
        } catch {
            setActionErr('Une erreur est survenue.');
        } finally {
            setActing(false);
        }
    };

    const postWithBody = async (url, body) => {
        setActing(true);
        setActionMsg(null);
        setActionErr(null);
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { ...h, 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) { setActionErr(data.message); return; }
            setActionMsg(data.message);
            await fetchRace();
        } catch {
            setActionErr('Une erreur est survenue.');
        } finally {
            setActing(false);
        }
    };

    if (loading) return <p className="text-gris text-sm">Chargement…</p>;

    // ── Scheduled ────────────────────────────────────────────────────────────
    if (race?.status === 'scheduled') {
        return (
            <>
                {(actionMsg || actionErr) && (
                    <div className={`mb-4 text-xs px-4 py-2 border ${actionErr ? 'border-red-300 text-red-600 bg-red-50' : 'border-green-300 text-green-700 bg-green-50'}`}>
                        {actionMsg || actionErr}
                    </div>
                )}
                <Scheduled
                    session={race.session}
                    participantCount={race.participant_count ?? 0}
                    onStartNow={() => post('/api/admin/race/start')}
                    onCancel={async () => {
                        if (!window.confirm('Annuler la programmation ?')) return;
                        setActing(true);
                        setActionMsg(null);
                        setActionErr(null);
                        try {
                            const res = await fetch('/api/admin/race/schedule', { method: 'DELETE', headers: h });
                            const data = await res.json();
                            if (!res.ok) { setActionErr(data.message); return; }
                            setActionMsg(data.message);
                            await fetchRace();
                        } catch { setActionErr('Une erreur est survenue.'); }
                        finally { setActing(false); }
                    }}
                    loading={acting}
                />
            </>
        );
    }

    // ── Not started ──────────────────────────────────────────────────────────
    if (!race || race.status === 'not_started') {
        const count = race?.participant_count ?? race?.participants?.length ?? 0;
        return (
            <>
                {(actionMsg || actionErr) && (
                    <div className={`mb-4 text-xs px-4 py-2 border ${actionErr ? 'border-red-300 text-red-600 bg-red-50' : 'border-green-300 text-green-700 bg-green-50'}`}>
                        {actionMsg || actionErr}
                    </div>
                )}
                <NotStarted
                    onStart={() => post('/api/admin/race/start')}
                    onSchedule={(body) => postWithBody('/api/admin/race/schedule', body)}
                    participantCount={count}
                    loading={acting}
                />
            </>
        );
    }

    const {
        current_loop,
        participants = [],
        loop_history = [],
        stats = {},
        session,
    } = race;

    const loopDuration = (session?.loop_duration_minutes ?? 60) * 60;
    const overtime     = elapsed > loopDuration;
    const warning      = !overtime && elapsed > loopDuration - 300; // last 5 min

    const timerColor = overtime ? 'red' : warning ? 'orange' : 'gold';

    const q = search.toLowerCase().trim();
    const filteredRunning = participants.filter(
        (p) => p.is_active && p.current_loop_status === 'running' &&
            (!q || p.last_name.toLowerCase().includes(q) || String(p.bib_number).includes(q))
    );
    const finished   = participants.filter((p) => p.is_active && p.current_loop_status === 'finished')
        .sort((a, b) => new Date(a.finished_at) - new Date(b.finished_at));
    const eliminated = participants.filter((p) => !p.is_active);

    // ── Race finished ────────────────────────────────────────────────────────
    if (race.status === 'finished') {
        return (
            <>
                <LoopDetailModal loop={selectedLoop} onClose={() => setSelectedLoop(null)} token={token} />
                <div className="space-y-10">
                <RaceFinished
                    participants={participants}
                    onReopen={() => post('/api/admin/race/reopen', 'Rouvrir la course en mode rattrapage ?')}
                    loading={acting}
                />
                <LoopHistoryTable loops={loop_history} onLoopClick={setSelectedLoop} />
                <EliminatedList participants={eliminated} />
                <div className="pt-4 border-t border-gray-100">
                    <button
                        onClick={() => post('/api/admin/race/reset', 'Réinitialiser complètement la course ? Cette action est irréversible.')}
                        disabled={acting}
                        className="border border-red-300 text-red-600 text-[10px] tracking-[0.2em] uppercase px-4 py-2 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        Réinitialiser la course
                    </button>
                </div>
            </div>
            </>
        );
    }

    // ── Active race ──────────────────────────────────────────────────────────
    return (
        <div className="space-y-8">

            {/* Feedback messages */}
            {actionMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2">
                    {actionMsg}
                </div>
            )}
            {actionErr && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2">
                    {actionErr}
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox
                    label="Boucle"
                    value={current_loop?.loop_number ?? '—'}
                    sub={`Départ ${fmtTime(current_loop?.started_at)}`}
                    color="gold"
                />
                <StatBox
                    label={overtime ? 'Dépassement' : 'Temps écoulé'}
                    value={fmt(elapsed)}
                    sub={`/ ${fmt(loopDuration)}`}
                    color={timerColor}
                />
                <StatBox
                    label="En course"
                    value={participants.filter((p) => p.is_active && p.current_loop_status === 'running').length}
                    sub="encore sur la boucle"
                />
                <StatBox
                    label="Boucle terminée"
                    value={finished.length}
                    sub={`${eliminated.length} éliminé${eliminated.length !== 1 ? 's' : ''} au total`}
                    color={finished.length > 0 ? 'green' : 'default'}
                />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-100">
                <button
                    onClick={() => post(
                        '/api/admin/race/next-loop',
                        filteredRunning.length > 0
                            ? `${filteredRunning.length} participant(s) sont encore en course. Démarrer la boucle suivante quand même ?`
                            : 'Démarrer la boucle suivante ?'
                    )}
                    disabled={acting}
                    className="bg-or-principal text-creme text-[11px] tracking-[0.2em] uppercase px-6 py-2.5 hover:bg-or-sombre transition-colors disabled:opacity-50"
                >
                    {acting ? 'En cours…' : `Boucle ${(current_loop?.loop_number ?? 0) + 1} →`}
                </button>
                <button
                    onClick={() => post(
                        '/api/admin/race/reset',
                        'Réinitialiser complètement la course ? Cette action est irréversible.'
                    )}
                    disabled={acting}
                    className="border border-red-300 text-red-600 text-[10px] tracking-[0.2em] uppercase px-4 py-2.5 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                    Réinitialiser
                </button>
                <span className="text-xs text-gris ml-auto">
                    Actualisation auto toutes les 30 s
                </span>
            </div>

            {/* Running participants */}
            <div>
                <div className="flex items-center justify-between mb-3 gap-4">
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-gris">
                        En course — {participants.filter((p) => p.is_active && p.current_loop_status === 'running').length} participant(s)
                    </h3>
                    <input
                        type="search"
                        placeholder="N° ou nom…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border border-gray-200 bg-creme px-3 py-1.5 text-sm text-noir focus:outline-none focus:border-or-principal transition-colors w-40"
                    />
                </div>

                {filteredRunning.length === 0 ? (
                    <p className="text-gris text-sm">
                        {search ? 'Aucun résultat.' : 'Tous les participants ont terminé la boucle.'}
                    </p>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {filteredRunning
                            .sort((a, b) => a.bib_number - b.bib_number)
                            .map((p) => (
                                <RunningCard
                                    key={p.id}
                                    p={p}
                                    onFinish={() => post(`/api/admin/race/participants/${p.id}/finish`)}
                                    onFinishWithTime={(time) => postWithBody(`/api/admin/race/participants/${p.id}/finish`, { finished_at: time })}
                                    onDnf={() => post(
                                        `/api/admin/race/participants/${p.id}/dnf`,
                                        `Confirmer DNF pour #${p.bib_number} ${p.last_name} ?`
                                    )}
                                    loading={acting}
                                />
                            ))}
                    </div>
                )}
            </div>

            {/* Finishers this loop */}
            {finished.length > 0 && (
                <div>
                    <h3 className="text-[11px] tracking-[0.2em] uppercase text-gris mb-3">
                        Boucle terminée — {finished.length} participant(s)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {finished.map((p) => (
                            <FinisherBadge key={p.id} p={p} loopStartedAt={current_loop?.started_at} />
                        ))}
                    </div>
                </div>
            )}

            {/* Loop history */}
            {loop_history.length > 0 && (
                <LoopHistoryTable loops={loop_history} onLoopClick={setSelectedLoop} />
            )}

            {/* Loop detail modal */}
            <LoopDetailModal loop={selectedLoop} onClose={() => setSelectedLoop(null)} token={token} />

            {/* Eliminated */}
            <EliminatedList
                participants={eliminated}
                currentLoopNumber={current_loop?.loop_number}
                onRestore={(p) => post(`/api/admin/race/participants/${p.id}/restore`, `Remettre #${p.bib_number} ${p.last_name} en lice ?`)}
                loading={acting}
            />
        </div>
    );
}
