import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    fmtDur,
    fmtClock,
    fmtDateTime,
    toDatetimeLocal,
    toApiDateTime,
    loopStartDate,
    timeToArrivalDate,
    parseDurationInput,
    statusInfo,
    makeServerClock,
} from '@/utils/race';

/*
 * Gestion de course — sur le modèle de l'Excel :
 * on saisit des heures d'arrivée (ou DNF), tout le reste est calculé par le serveur.
 * Plus de "démarrer / boucle suivante / clôturer" : la course vit toute seule.
 */

// ─── Petits composants ────────────────────────────────────────────────────────

function StatBox({ label, value, sub, color = 'default' }) {
    const colors = {
        default: 'bg-creme border-gray-200 text-noir',
        gold:    'bg-creme border-or-principal text-or-principal',
        red:     'bg-red-50 border-red-300 text-red-600',
        green:   'bg-green-50 border-green-300 text-green-700',
        blue:    'bg-blue-50 border-blue-300 text-blue-700',
    };
    return (
        <div className={`border p-4 ${colors[color]}`}>
            <p className="text-[10px] tracking-[0.2em] uppercase text-gris mb-1">{label}</p>
            <p className="font-chau text-2xl md:text-3xl leading-none truncate">{value}</p>
            {sub && <p className="text-[10px] text-gris mt-1">{sub}</p>}
        </div>
    );
}

function Avatar({ p, size = 'w-9 h-9' }) {
    return p.profile_picture_url ? (
        <img
            src={p.profile_picture_url}
            className={`${size} rounded-full object-cover border border-gray-200 shrink-0`}
            alt=""
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
    ) : (
        <div className={`${size} rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gris font-medium uppercase shrink-0`}>
            {p.first_name?.[0]}{p.last_name?.[0]}
        </div>
    );
}

function normalizeStr(s) {
    return (s ?? '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Filtre un participant par dossard, prénom ou nom (insensible à la casse et aux accents) */
function matchesQuery(p, q) {
    const n = normalizeStr(q).trim();
    if (!n) return true;
    return (
        normalizeStr(`${p.first_name} ${p.last_name}`).includes(n) ||
        normalizeStr(`${p.last_name} ${p.first_name}`).includes(n) ||
        String(p.bib_number).includes(n)
    );
}

function SearchInput({ value, onChange, className = '' }) {
    return (
        <div className={`relative ${className}`}>
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gris text-xs pointer-events-none">⌕</span>
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Dossard ou nom…"
                className="w-full border border-gray-200 bg-creme pl-7 pr-2 py-1.5 text-xs text-noir placeholder:text-gris/60 focus:outline-none focus:border-or-principal"
            />
        </div>
    );
}

function SectionTitle({ children, right }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-[11px] tracking-[0.25em] uppercase text-noir font-medium">{children}</h3>
            {right}
        </div>
    );
}

// ─── Paramètres de course ─────────────────────────────────────────────────────

function ParamsPanel({ race, busy, onSave, onReset }) {
    const [open, setOpen] = useState(!race?.start_at);
    const [form, setForm] = useState(null);
    const [confirmReset, setConfirmReset] = useState(false);

    const startEdit = () => {
        setForm({
            name: race?.name ?? 'Backyard des Mools 2026',
            start_at: race?.start_at ? toDatetimeLocal(new Date(race.start_at)) : '',
            loop_distance_km: race?.loop_distance_km ?? 6.706,
            loop_duration_minutes: race?.loop_duration_minutes ?? 60,
            max_loops: race?.max_loops ?? 12,
        });
    };

    const save = async () => {
        const ok = await onSave({
            ...form,
            start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
            loop_distance_km: parseFloat(form.loop_distance_km),
            loop_duration_minutes: parseInt(form.loop_duration_minutes, 10),
            max_loops: parseInt(form.max_loops, 10),
        });
        if (ok) setForm(null);
    };

    const field = (label, node) => (
        <label className="block">
            <span className="text-[10px] tracking-[0.15em] uppercase text-gris">{label}</span>
            {node}
        </label>
    );
    const inputCls = 'mt-1 w-full border border-gray-200 bg-white px-2 py-1.5 text-sm text-noir focus:outline-none focus:border-or-principal';

    return (
        <div className="border border-gray-200 bg-white">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
                <span className="text-[11px] tracking-[0.25em] uppercase text-noir font-medium">Paramètres de la course</span>
                <span className="text-gris text-xs">{open ? '▲' : '▼'}</span>
            </button>

            {open && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-4">
                    {!form ? (
                        <div className="space-y-2">
                            <dl className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div><dt className="text-[10px] uppercase tracking-[0.15em] text-gris">Nom</dt><dd className="text-noir">{race?.name ?? '—'}</dd></div>
                                <div><dt className="text-[10px] uppercase tracking-[0.15em] text-gris">Départ (boucle 1)</dt><dd className="text-noir">{race?.start_at ? fmtDateTime(race.start_at) : 'Non défini'}</dd></div>
                                <div><dt className="text-[10px] uppercase tracking-[0.15em] text-gris">Distance / boucle</dt><dd className="text-noir">{race?.loop_distance_km ?? '—'} km</dd></div>
                                <div><dt className="text-[10px] uppercase tracking-[0.15em] text-gris">Durée max / boucle</dt><dd className="text-noir">{race?.loop_duration_minutes ?? '—'} min</dd></div>
                                <div><dt className="text-[10px] uppercase tracking-[0.15em] text-gris">Boucles max</dt><dd className="text-noir">{race?.max_loops ?? '—'}</dd></div>
                            </dl>
                            <div className="flex flex-wrap gap-2 pt-2">
                                <button onClick={startEdit} className="bg-or-principal text-creme text-[10px] tracking-[0.15em] uppercase px-4 py-2 hover:bg-or-sombre transition-colors">
                                    Modifier
                                </button>
                                {race && (
                                    <button
                                        onClick={() => setConfirmReset(true)}
                                        className="border border-red-300 text-red-600 text-[10px] tracking-[0.15em] uppercase px-4 py-2 hover:bg-red-50 transition-colors"
                                    >
                                        Effacer toutes les arrivées
                                    </button>
                                )}
                            </div>
                            {confirmReset && (
                                <div className="border border-red-300 bg-red-50 p-3 mt-2">
                                    <p className="text-xs text-red-700 mb-2">
                                        Toutes les heures d'arrivée et DNF seront supprimés. Les paramètres sont conservés. Continuer ?
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => { await onReset(); setConfirmReset(false); }}
                                            disabled={busy}
                                            className="bg-red-600 text-white text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
                                        >
                                            Oui, tout effacer
                                        </button>
                                        <button onClick={() => setConfirmReset(false)} className="border border-gray-300 text-gris text-[10px] tracking-[0.15em] uppercase px-3 py-1.5">
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {field('Nom de la course', (
                                    <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                ))}
                                {field('Départ (boucle 1)', (
                                    <input type="datetime-local" step="1" className={inputCls} value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                                ))}
                                {field('Distance d\'une boucle (km)', (
                                    <input type="number" step="0.001" min="0.001" className={inputCls} value={form.loop_distance_km} onChange={(e) => setForm({ ...form, loop_distance_km: e.target.value })} />
                                ))}
                                {field('Durée max d\'une boucle (minutes)', (
                                    <input type="number" min="1" className={inputCls} value={form.loop_duration_minutes} onChange={(e) => setForm({ ...form, loop_duration_minutes: e.target.value })} />
                                ))}
                                {field('Nombre max de boucles', (
                                    <input type="number" min="1" max="200" className={inputCls} value={form.max_loops} onChange={(e) => setForm({ ...form, max_loops: e.target.value })} />
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={save} disabled={busy} className="bg-or-principal text-creme text-[10px] tracking-[0.15em] uppercase px-4 py-2 hover:bg-or-sombre transition-colors disabled:opacity-50">
                                    Enregistrer
                                </button>
                                <button onClick={() => setForm(null)} className="border border-gray-300 text-gris text-[10px] tracking-[0.15em] uppercase px-4 py-2">
                                    Annuler
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Pointage (boucle en cours) ───────────────────────────────────────────────

function PointagePanel({ state, busy, onArrive, onGroupArrive, onDnf, onEditCell }) {
    const { race, participants } = state;
    const currentLoop = race.current_loop;

    const [pinnedLoop, setPinnedLoop] = useState(null); // null = suivre la boucle en cours
    const [groupMode, setGroupMode] = useState(false);
    const [selected, setSelected] = useState([]);
    const [groupTime, setGroupTime] = useState('');
    const [groupInputMode, setGroupInputMode] = useState('clock'); // 'clock' | 'duration'
    const [query, setQuery] = useState('');

    const loop = pinnedLoop ?? currentLoop;
    const isCurrent = loop === currentLoop;

    // Si la boucle affichée change (navigation ou bascule auto), on purge la sélection
    useEffect(() => { setSelected([]); setGroupMode(false); setGroupTime(''); setGroupInputMode('clock'); }, [loop]);

    // On se base sur l'état des cellules : permet la saisie rétroactive sur les boucles passées
    const cellOf = (p) => p.loops?.[loop - 1];
    const visible = participants.filter((p) => matchesQuery(p, query));
    const awaiting = visible.filter((p) => ['pending', 'missed'].includes(cellOf(p)?.state));
    const arrivedThisLoop = visible.filter((p) => cellOf(p)?.state === 'valid');
    const stopped = visible.filter((p) => ['late', 'dnf'].includes(cellOf(p)?.state));

    const toggle = (id) =>
        setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

    const groupArrivalDate = () => {
        if (!groupTime) return null;
        if (groupInputMode === 'duration') {
            const sec = parseDurationInput(groupTime);
            const start = loopStartDate(race, loop);
            return sec != null && start ? new Date(start.getTime() + sec * 1000) : null;
        }
        return timeToArrivalDate(race, loop, groupTime);
    };

    const validateGroup = async () => {
        // Sur une boucle passée ou en mode "temps", une saisie est obligatoire
        const needsInput = !isCurrent || groupInputMode === 'duration';
        const arrivedAt = groupArrivalDate();
        if (needsInput && !arrivedAt) return;
        const ok = await onGroupArrive(selected, loop, arrivedAt ? toApiDateTime(arrivedAt) : null);
        if (ok) { setSelected([]); setGroupMode(false); setGroupTime(''); }
    };

    return (
        <div className="border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-[11px] tracking-[0.25em] uppercase text-noir font-medium">Pointage</h3>
                    <div className="flex items-center border border-gray-200">
                        <button
                            onClick={() => setPinnedLoop(Math.max(1, loop - 1))}
                            disabled={loop <= 1}
                            className="px-2.5 py-1 text-gris hover:text-or-principal disabled:opacity-30"
                            title="Boucle précédente"
                        >
                            ◀
                        </button>
                        <span className={`px-2 py-1 text-xs font-medium ${isCurrent ? 'text-noir' : 'text-orange-600'}`}>
                            Boucle {loop}{!isCurrent && ' (passée)'}
                        </span>
                        <button
                            onClick={() => setPinnedLoop(Math.min(currentLoop, loop + 1))}
                            disabled={loop >= currentLoop}
                            className="px-2.5 py-1 text-gris hover:text-or-principal disabled:opacity-30"
                            title="Boucle suivante"
                        >
                            ▶
                        </button>
                    </div>
                    {!isCurrent && (
                        <button
                            onClick={() => setPinnedLoop(null)}
                            className="text-[10px] tracking-[0.1em] uppercase text-or-principal border border-or-principal px-2.5 py-1 hover:bg-or-principal/5 transition-colors"
                        >
                            ↩ Boucle en cours ({currentLoop})
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
                    <SearchInput value={query} onChange={setQuery} className="w-full sm:w-44" />
                    <button
                        onClick={() => { setGroupMode((g) => !g); setSelected([]); }}
                        className={`shrink-0 text-[10px] tracking-[0.15em] uppercase px-3 py-1.5 border transition-colors ${
                            groupMode ? 'border-or-principal text-or-principal bg-or-principal/5' : 'border-gray-200 text-gris hover:border-or-principal hover:text-or-principal'
                        }`}
                    >
                        {groupMode ? 'Annuler le mode groupé' : 'Arrivée groupée'}
                    </button>
                </div>
            </div>

            {!isCurrent && (
                <p className="text-[11px] text-orange-600 bg-orange-50 border border-orange-200 px-3 py-2 mb-3">
                    Saisie rétroactive sur une boucle passée : les coureurs marqués « non revenus » peuvent encore être pointés
                    (l'heure exacte est obligatoire). Le classement se recalcule automatiquement.
                </p>
            )}

            {awaiting.length === 0 ? (
                <p className="text-sm text-gris py-2">
                    {query.trim()
                        ? 'Aucun coureur attendu ne correspond à la recherche.'
                        : isCurrent
                            ? 'Tous les coureurs encore en course ont été pointés pour cette boucle.'
                            : 'Aucune saisie manquante sur cette boucle.'}
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {awaiting.map((p) => (
                        <div
                            key={p.id}
                            className={`border p-3 flex flex-col gap-2 transition-colors ${
                                groupMode && selected.includes(p.id) ? 'border-or-principal bg-or-principal/5' : 'border-gray-200 bg-white'
                            }`}
                            onClick={groupMode ? () => toggle(p.id) : undefined}
                            role={groupMode ? 'button' : undefined}
                        >
                            <div className="flex items-center gap-2">
                                {groupMode && (
                                    <input type="checkbox" readOnly checked={selected.includes(p.id)} className="text-or-principal border-gray-300 focus:ring-or-principal" />
                                )}
                                <Avatar p={p} />
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-or-principal">#{p.bib_number}</p>
                                    <p className="text-sm font-medium text-noir truncate">{p.first_name} {p.last_name}</p>
                                    {cellOf(p)?.state === 'missed' && (
                                        <p className="text-[10px] text-red-500 uppercase tracking-[0.1em]">Non revenu</p>
                                    )}
                                </div>
                            </div>
                            {!groupMode && (
                                <div className="flex gap-1.5">
                                    {isCurrent ? (
                                        <button
                                            onClick={() => onArrive(p.id, loop)}
                                            disabled={busy}
                                            className="flex-1 bg-or-principal text-creme text-[11px] tracking-[0.1em] uppercase py-2.5 hover:bg-or-sombre transition-colors disabled:opacity-50"
                                        >
                                            ✓ Arrivée
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onEditCell(p, loop)}
                                            disabled={busy}
                                            className="flex-1 bg-or-principal text-creme text-[11px] tracking-[0.1em] uppercase py-2.5 hover:bg-or-sombre transition-colors disabled:opacity-50"
                                        >
                                            ⏱ Saisir l'heure
                                        </button>
                                    )}
                                    {isCurrent && (
                                        <button
                                            onClick={() => onEditCell(p, loop)}
                                            disabled={busy}
                                            title="Saisir une heure manuellement"
                                            className="border border-gray-200 text-gris px-3 text-sm hover:text-or-principal hover:border-or-principal transition-colors"
                                        >
                                            ⏱
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onDnf(p.id, loop)}
                                        disabled={busy}
                                        title="Abandon"
                                        className="border border-red-300 text-red-600 px-3 text-[11px] uppercase hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                        DNF
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {groupMode && (
                <div className="mt-3 border-t border-gray-100 pt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gris">{selected.length} sélectionné{selected.length > 1 ? 's' : ''}</span>
                    <div className="flex border border-gray-200">
                        <button
                            onClick={() => { setGroupInputMode('clock'); setGroupTime(''); }}
                            className={`px-2.5 py-1.5 text-[10px] tracking-[0.1em] uppercase transition-colors ${
                                groupInputMode === 'clock' ? 'bg-or-principal/10 text-or-principal' : 'text-gris hover:text-or-principal'
                            }`}
                        >
                            Heure
                        </button>
                        <button
                            onClick={() => { setGroupInputMode('duration'); setGroupTime(''); }}
                            className={`px-2.5 py-1.5 text-[10px] tracking-[0.1em] uppercase border-l border-gray-200 transition-colors ${
                                groupInputMode === 'duration' ? 'bg-or-principal/10 text-or-principal' : 'text-gris hover:text-or-principal'
                            }`}
                        >
                            Temps
                        </button>
                    </div>
                    {groupInputMode === 'clock' ? (
                        <input
                            type="time"
                            step="1"
                            value={groupTime}
                            onChange={(e) => setGroupTime(e.target.value)}
                            className="border border-gray-200 bg-creme px-2 py-1.5 text-xs text-noir focus:outline-none focus:border-or-principal"
                            title={isCurrent ? "Heure d'arrivée (vide = maintenant)" : "Heure d'arrivée (obligatoire)"}
                        />
                    ) : (
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="52:30"
                            value={groupTime}
                            onChange={(e) => setGroupTime(e.target.value)}
                            className="border border-gray-200 bg-creme px-2 py-1.5 text-xs text-noir w-24 focus:outline-none focus:border-or-principal"
                            title="Temps de boucle (mm:ss ou h:mm:ss)"
                        />
                    )}
                    <button
                        onClick={validateGroup}
                        disabled={busy || selected.length === 0 || ((!isCurrent || groupInputMode === 'duration') && !groupArrivalDate())}
                        className="bg-or-principal text-creme text-[10px] tracking-[0.15em] uppercase px-4 py-2 hover:bg-or-sombre transition-colors disabled:opacity-50"
                    >
                        ✓ Valider l'arrivée groupée
                    </button>
                    <span className="text-[11px] text-gris">
                        {groupTime && groupArrivalDate()
                            ? `→ arrivée à ${fmtClock(groupArrivalDate().toISOString())}`
                            : groupTime && !groupArrivalDate()
                                ? 'Format invalide'
                                : !isCurrent
                                    ? 'Saisie obligatoire sur une boucle passée'
                                    : groupInputMode === 'clock'
                                        ? 'Vide = maintenant'
                                        : ''}
                    </span>
                </div>
            )}

            {arrivedThisLoop.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-gris mb-2">Déjà arrivés sur cette boucle</p>
                    <div className="flex flex-wrap gap-1.5">
                        {arrivedThisLoop.map((p) => {
                            const cell = cellOf(p);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => onEditCell(p, loop)}
                                    title="Corriger"
                                    className="border border-green-300 bg-green-50 text-green-700 px-2.5 py-1.5 text-xs hover:border-or-principal transition-colors"
                                >
                                    #{p.bib_number} {p.last_name} — {fmtClock(cell.arrived_at)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {stopped.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-[10px] tracking-[0.2em] uppercase text-gris mb-2">Arrêtés sur cette boucle (cliquer pour corriger)</p>
                    <div className="flex flex-wrap gap-1.5">
                        {stopped.map((p) => {
                            const cell = cellOf(p);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => onEditCell(p, loop)}
                                    title="Corriger"
                                    className="border border-red-300 bg-red-50 text-red-600 px-2.5 py-1.5 text-xs hover:border-or-principal transition-colors"
                                >
                                    #{p.bib_number} {p.last_name} — {cell.state === 'dnf' ? 'Abandon' : 'Hors délai'}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Éditeur de cellule (grille) ──────────────────────────────────────────────

function CellEditor({ race, participant, loop, cell, busy, onSave, onDnf, onClear, onClose }) {
    const start = loopStartDate(race, loop);
    const durSec = race.loop_duration_minutes * 60;

    const [mode, setMode] = useState('clock'); // 'clock' = heure d'arrivée | 'duration' = temps de boucle
    const [time, setTime] = useState(() => {
        const base = cell?.arrived_at ? new Date(cell.arrived_at) : new Date();
        return toDatetimeLocal(base).slice(11, 19);
    });
    const [duration, setDuration] = useState(() => (cell?.seconds != null ? fmtDur(cell.seconds) : ''));

    const computeArrival = () => {
        if (mode === 'duration') {
            const sec = parseDurationInput(duration);
            if (sec == null || !start) return null;
            return new Date(start.getTime() + sec * 1000);
        }
        return timeToArrivalDate(race, loop, time);
    };

    const save = () => {
        const d = computeArrival();
        if (!d) return;
        const deadline = new Date(start.getTime() + durSec * 1000);
        if (d <= start || d > deadline) {
            const ok = window.confirm(
                `Attention : cette arrivée est en dehors de la fenêtre de la boucle ${loop} `
                + `(${fmtClock(start.toISOString())} → ${fmtClock(deadline.toISOString())}). `
                + `Le coureur sera compté hors délai et éliminé. Enregistrer quand même ?`
            );
            if (!ok) return;
        }
        onSave(toApiDateTime(d));
    };

    // Aperçu croisé : l'un se déduit de l'autre
    const preview = computeArrival();

    const tabCls = (active) =>
        `flex-1 text-[10px] tracking-[0.1em] uppercase py-2 border transition-colors ${
            active ? 'border-or-principal text-or-principal bg-or-principal/5' : 'border-gray-200 text-gris hover:text-or-principal'
        }`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-noir/40 p-4" onClick={onClose}>
            <div className="bg-white border border-gray-200 w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
                <p className="text-[10px] tracking-[0.25em] uppercase text-gris">Boucle {loop}</p>
                <p className="font-chau text-xl text-noir mt-1">
                    #{participant.bib_number} {participant.first_name} {participant.last_name}
                </p>
                <p className="text-xs text-gris mt-1">
                    Départ théorique : {start ? fmtClock(start.toISOString()) : '—'} · Heure limite : {start ? fmtClock(new Date(start.getTime() + durSec * 1000).toISOString()) : '—'}
                </p>

                <div className="flex gap-1.5 mt-4">
                    <button onClick={() => setMode('clock')} className={tabCls(mode === 'clock')}>Heure d'arrivée</button>
                    <button onClick={() => setMode('duration')} className={tabCls(mode === 'duration')}>Temps de boucle</button>
                </div>

                {mode === 'clock' ? (
                    <label className="block mt-3">
                        <span className="text-[10px] tracking-[0.15em] uppercase text-gris">Heure d'arrivée</span>
                        <input
                            type="time"
                            step="1"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="mt-1 w-full border border-gray-200 bg-creme px-2 py-2 text-sm text-noir focus:outline-none focus:border-or-principal"
                        />
                    </label>
                ) : (
                    <label className="block mt-3">
                        <span className="text-[10px] tracking-[0.15em] uppercase text-gris">Temps de boucle (mm:ss ou h:mm:ss)</span>
                        <input
                            type="text"
                            inputMode="numeric"
                            placeholder="52:30"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="mt-1 w-full border border-gray-200 bg-creme px-2 py-2 text-sm text-noir focus:outline-none focus:border-or-principal"
                        />
                    </label>
                )}

                <p className="text-[11px] text-gris mt-2">
                    {preview
                        ? mode === 'duration'
                            ? `→ arrivée enregistrée à ${fmtClock(preview.toISOString())}`
                            : `→ temps de boucle : ${fmtDur(Math.round((preview.getTime() - start.getTime()) / 1000))}`
                        : mode === 'duration' && duration
                            ? 'Format invalide — exemples : 52:30 ou 1:02:33'
                            : '\u00a0'}
                </p>

                <div className="flex gap-2 mt-3">
                    <button
                        onClick={save}
                        disabled={busy || !preview}
                        className="flex-1 bg-or-principal text-creme text-[10px] tracking-[0.15em] uppercase py-2.5 hover:bg-or-sombre transition-colors disabled:opacity-50"
                    >
                        Enregistrer
                    </button>
                    <button
                        onClick={() => onSave(null)}
                        disabled={busy}
                        title="Pointer à l'heure actuelle"
                        className="border border-or-principal text-or-principal text-[10px] tracking-[0.1em] uppercase px-3 hover:bg-or-principal/5 transition-colors"
                    >
                        Maintenant
                    </button>
                </div>
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={onDnf}
                        disabled={busy}
                        className="flex-1 border border-red-300 text-red-600 text-[10px] tracking-[0.15em] uppercase py-2 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        DNF (abandon)
                    </button>
                    {(cell?.arrived_at || cell?.state === 'dnf') && (
                        <button
                            onClick={onClear}
                            disabled={busy}
                            className="flex-1 border border-gray-300 text-gris text-[10px] tracking-[0.15em] uppercase py-2 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                            Effacer la cellule
                        </button>
                    )}
                </div>
                <button onClick={onClose} className="w-full mt-3 text-[10px] tracking-[0.2em] uppercase text-gris hover:text-noir">
                    Fermer
                </button>
            </div>
        </div>
    );
}

// ─── Grille type Excel ────────────────────────────────────────────────────────

function cellDisplay(cell) {
    switch (cell.state) {
        case 'valid':   return { text: fmtDur(cell.seconds), cls: 'bg-green-50 text-green-700' };
        case 'late':    return { text: 'HD',  cls: 'bg-red-100 text-red-700 font-medium', title: 'Hors délai' };
        case 'dnf':     return { text: 'DNF', cls: 'bg-red-100 text-red-700 font-medium' };
        case 'missed':  return { text: '—',   cls: 'bg-red-50 text-red-400', title: 'Non revenu' };
        case 'pending': return { text: '…',   cls: 'bg-yellow-50 text-yellow-700 animate-pulse' };
        case 'closed':  return { text: '',    cls: 'bg-gray-50 text-gray-300' };
        default:        return { text: '',    cls: 'bg-white text-gray-300' };
    }
}

function GridPanel({ state, onEditCell }) {
    const { race, participants } = state;
    const [query, setQuery] = useState('');
    const loops = Array.from({ length: race.max_loops }, (_, i) => i + 1);
    const visible = participants.filter((p) => matchesQuery(p, query));

    return (
        <div className="border border-gray-200 bg-white">
            <div className="px-4 pt-4">
                <SectionTitle right={<SearchInput value={query} onChange={setQuery} className="w-44" />}>
                    Grille des boucles
                </SectionTitle>
                <p className="text-[11px] text-gris -mt-2 mb-3">
                    Cliquez sur une cellule pour saisir, corriger ou effacer une arrivée. Vert : boucle validée · Rouge : hors délai / abandon / non revenu.
                </p>
            </div>
            <div className="overflow-x-auto pb-2">
                <table className="text-xs whitespace-nowrap min-w-full">
                    <thead>
                        <tr className="border-y border-gray-200 bg-creme">
                            <th className="sticky left-0 bg-creme px-3 py-2 text-left text-[10px] tracking-[0.15em] uppercase text-gris z-10">Coureur</th>
                            {loops.map((n) => {
                                const s = loopStartDate(race, n);
                                return (
                                    <th key={n} className="px-2 py-2 text-center text-[10px] tracking-[0.1em] uppercase text-gris" title={s ? `Départ ${fmtClock(s.toISOString())}` : ''}>
                                        B{n}
                                    </th>
                                );
                            })}
                            <th className="px-3 py-2 text-center text-[10px] tracking-[0.15em] uppercase text-gris">Boucles</th>
                            <th className="px-3 py-2 text-center text-[10px] tracking-[0.15em] uppercase text-gris">Cumul</th>
                            <th className="px-3 py-2 text-center text-[10px] tracking-[0.15em] uppercase text-gris">Statut</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.length === 0 && (
                            <tr>
                                <td colSpan={loops.length + 4} className="px-3 py-4 text-center text-gris">
                                    Aucun coureur ne correspond à la recherche.
                                </td>
                            </tr>
                        )}
                        {visible.map((p) => {
                            const st = statusInfo(p);
                            return (
                                <tr key={p.id} className="border-b border-gray-100">
                                    <td className="sticky left-0 bg-white px-3 py-1.5 z-10 border-r border-gray-100">
                                        <span className="text-or-principal font-medium">#{p.bib_number}</span>{' '}
                                        <span className="text-noir">{p.first_name} {p.last_name}</span>
                                    </td>
                                    {p.loops.map((cell) => {
                                        const d = cellDisplay(cell);
                                        return (
                                            <td key={cell.loop} className="p-0.5 text-center">
                                                <button
                                                    onClick={() => onEditCell(p, cell.loop)}
                                                    title={d.title || (cell.arrived_at ? `Arrivée ${fmtClock(cell.arrived_at)}` : '')}
                                                    className={`w-full min-w-[52px] px-1.5 py-1.5 ${d.cls} hover:outline hover:outline-1 hover:outline-or-principal`}
                                                >
                                                    {d.text || ' '}
                                                </button>
                                            </td>
                                        );
                                    })}
                                    <td className="px-3 py-1.5 text-center font-medium text-noir">{p.loops_completed}</td>
                                    <td className="px-3 py-1.5 text-center text-noir">{p.loops_completed > 0 ? fmtDur(p.total_seconds) : '—'}</td>
                                    <td className="px-2 py-1.5 text-center">
                                        <span className={`inline-block border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${st.cls}`}>{st.label}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CourseSection() {
    const [state, setState] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(null); // { participant, loop }
    const [, setNowTick] = useState(0);

    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;

    const refresh = useCallback(async () => {
        try {
            const r = await fetch('/api/race', { headers: { Accept: 'application/json' } });
            if (!r.ok) throw new Error();
            setState(await r.json());
            setError(null);
        } catch {
            setError('Impossible de charger l\'état de la course.');
        }
    }, []);

    const call = useCallback(async (method, url, body) => {
        setBusy(true);
        try {
            const r = await fetch(url, {
                method,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: body ? JSON.stringify(body) : undefined,
            });
            const data = await r.json().catch(() => null);
            if (!r.ok) throw new Error(data?.message || 'Erreur serveur');
            setState(data);
            setError(null);
            return true;
        } catch (e) {
            setError(e.message || 'Erreur serveur');
            return false;
        } finally {
            setBusy(false);
        }
    }, [token]);

    // Chargement + polling (5 s pendant la course, 30 s sinon)
    useEffect(() => { refresh(); }, [refresh]);
    useEffect(() => {
        const live = state?.race?.status === 'live';
        const id = setInterval(refresh, live ? 5000 : 30000);
        return () => clearInterval(id);
    }, [state?.race?.status, refresh]);

    // Horloge locale (compte à rebours)
    useEffect(() => {
        const id = setInterval(() => setNowTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    const serverClock = useMemo(() => makeServerClock(state?.server_now), [state?.server_now]);

    // Actions
    const saveParams   = (data) => call('PUT', '/api/admin/race', data);
    const reset        = () => call('POST', '/api/admin/race/reset');
    const arrive       = (participantId, loop, arrivedAt = null) =>
        call('POST', '/api/admin/race/arrivals', { participant_id: participantId, loop_number: loop, arrived_at: arrivedAt });
    const groupArrive  = (ids, loop, arrivedAt = null) =>
        call('POST', '/api/admin/race/arrivals/group', { participant_ids: ids, loop_number: loop, arrived_at: arrivedAt });
    const dnf          = (participantId, loop) =>
        call('POST', '/api/admin/race/arrivals/dnf', { participant_id: participantId, loop_number: loop });
    const clearCell    = (participantId, loop) =>
        call('DELETE', '/api/admin/race/arrivals', { participant_id: participantId, loop_number: loop });

    const openEditor = (participant, loop) => setEditing({ participant, loop });

    if (!state) {
        return <p className="text-sm text-gris py-8 text-center">Chargement…</p>;
    }

    const { race, participants, stats } = state;

    // Compte à rebours de la boucle en cours
    let countdown = null;
    if (race?.status === 'live' && race.current_loop_deadline) {
        const remaining = Math.floor((new Date(race.current_loop_deadline).getTime() - serverClock().getTime()) / 1000);
        countdown = fmtDur(Math.max(0, remaining));
    }
    let untilStart = null;
    if (race?.status === 'pending' && race.start_at) {
        const remaining = Math.floor((new Date(race.start_at).getTime() - serverClock().getTime()) / 1000);
        if (remaining > 0) untilStart = fmtDur(remaining);
    }

    const statusLabel = { pending: 'En attente', live: 'En course', finished: 'Terminée' }[race?.status] ?? '—';
    const leader = participants.length > 0 ? participants[0] : null;

    return (
        <div className="space-y-4">
            {error && (
                <div className="border border-red-300 bg-red-50 text-red-700 text-sm px-4 py-2 flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">✕</button>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox
                    label="Statut"
                    value={statusLabel}
                    sub={race?.status === 'pending' && untilStart ? `Départ dans ${untilStart}` : race?.start_at ? fmtDateTime(race.start_at) : 'Paramètres à définir'}
                    color={race?.status === 'live' ? 'green' : race?.status === 'finished' ? 'gold' : 'default'}
                />
                <StatBox
                    label="Boucle"
                    value={race?.status === 'live' ? `${race.current_loop}/${race.max_loops}` : '—'}
                    sub={countdown ? `Temps restant : ${countdown}` : null}
                    color={race?.status === 'live' ? 'gold' : 'default'}
                />
                <StatBox
                    label="En course"
                    value={`${stats.in_race}/${stats.total}`}
                    color={race?.status === 'live' ? 'green' : 'default'}
                />
                <StatBox
                    label={stats.winner ? 'Vainqueur' : 'Leader'}
                    value={stats.winner ? stats.winner.name : leader && leader.loops_completed > 0 ? `${leader.first_name} ${leader.last_name}` : '—'}
                    sub={stats.winner ? `${stats.winner.loops} boucles` : leader?.loops_completed > 0 ? `${leader.loops_completed} boucle${leader.loops_completed > 1 ? 's' : ''}` : null}
                    color={stats.winner ? 'gold' : 'default'}
                />
            </div>

            <ParamsPanel race={race} busy={busy} onSave={saveParams} onReset={reset} />

            {race?.status === 'live' && (
                <PointagePanel
                    state={state}
                    busy={busy}
                    onArrive={arrive}
                    onGroupArrive={groupArrive}
                    onDnf={dnf}
                    onEditCell={openEditor}
                />
            )}

            {race?.status === 'finished' && stats.winner && (
                <div className="border border-or-principal bg-creme p-4 text-center">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-or-principal">Dernier survivant</p>
                    <p className="font-chau text-2xl text-noir mt-1">🏆 {stats.winner.name}</p>
                    <p className="text-xs text-gris mt-1">#{stats.winner.bib_number} — {stats.winner.loops} boucles validées</p>
                </div>
            )}

            {race && <GridPanel state={state} onEditCell={openEditor} />}

            {!race && (
                <p className="text-sm text-gris text-center py-6">
                    Aucune course configurée. Renseignez les paramètres ci-dessus pour commencer.
                </p>
            )}

            {editing && (
                <CellEditor
                    race={race}
                    participant={editing.participant}
                    loop={editing.loop}
                    cell={editing.participant.loops?.[editing.loop - 1]}
                    busy={busy}
                    onSave={async (arrivedAt) => {
                        const ok = await arrive(editing.participant.id, editing.loop, arrivedAt);
                        if (ok) setEditing(null);
                    }}
                    onDnf={async () => {
                        const ok = await dnf(editing.participant.id, editing.loop);
                        if (ok) setEditing(null);
                    }}
                    onClear={async () => {
                        const ok = await clearCell(editing.participant.id, editing.loop);
                        if (ok) setEditing(null);
                    }}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}
