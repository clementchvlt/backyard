// Utilitaires partagés du système de course (admin + page publique Résultats)

/** Secondes → "h:mm:ss" ou "mm:ss" */
export function fmtDur(totalSeconds) {
    if (totalSeconds == null) return '—';
    const abs = Math.max(0, Math.round(totalSeconds));
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60).toString().padStart(2, '0');
    const s = (abs % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
}

/** ISO → "HH:MM:SS" (fr) */
export function fmtClock(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

/** ISO → "samedi 12 septembre à 08:00" */
export function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return (
        d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
        ' à ' +
        d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    );
}

/** Date → valeur pour <input type="datetime-local" step="1"> */
export function toDatetimeLocal(date = new Date()) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

/** Date → ISO 8601 avec offset (le serveur convertit dans son fuseau) */
export function toApiDateTime(date) {
    return date.toISOString();
}

/** Départ théorique de la boucle n (Date) */
export function loopStartDate(race, n) {
    if (!race?.start_at) return null;
    return new Date(new Date(race.start_at).getTime() + (n - 1) * race.loop_duration_minutes * 60000);
}

/**
 * Combine une heure "HH:MM(:SS)" avec la date du départ théorique de la boucle.
 * Si l'heure obtenue précède le départ de la boucle (boucle à cheval sur minuit),
 * on passe au jour suivant.
 */
export function timeToArrivalDate(race, loopNumber, timeStr) {
    const start = loopStartDate(race, loopNumber);
    if (!start || !timeStr) return null;
    const [h = 0, m = 0, s = 0] = timeStr.split(':').map(Number);
    const candidate = new Date(start);
    candidate.setHours(h, m, s || 0, 0);
    if (candidate < start) candidate.setDate(candidate.getDate() + 1);
    return candidate;
}

/** Libellé + couleurs d'un statut participant */
export function statusInfo(p) {
    if (p.is_winner) {
        return { label: 'Vainqueur', cls: 'bg-or-principal text-creme border-or-principal' };
    }
    switch (p.status) {
        case 'waiting':
            return { label: 'En attente', cls: 'bg-gray-100 text-gris border-gray-200' };
        case 'running':
            return { label: 'En course', cls: 'bg-green-50 text-green-700 border-green-300' };
        case 'arrived':
            return { label: `Boucle ${p.status_loop - 1} validée`, cls: 'bg-green-50 text-green-700 border-green-300' };
        case 'eliminated':
            return { label: `Éliminé (B${p.status_loop})`, cls: 'bg-red-50 text-red-600 border-red-300' };
        case 'dnf':
            return { label: `Abandon (B${p.status_loop})`, cls: 'bg-red-50 text-red-600 border-red-300' };
        case 'finisher':
            return { label: 'Finisher', cls: 'bg-blue-50 text-blue-700 border-blue-300' };
        default:
            return { label: p.status, cls: 'bg-gray-100 text-gris border-gray-200' };
    }
}

/** Hook simple d'horloge synchronisée serveur : renvoie une fonction now() */
export function makeServerClock(serverNowIso) {
    const offset = serverNowIso ? new Date(serverNowIso).getTime() - Date.now() : 0;
    return () => new Date(Date.now() + offset);
}
