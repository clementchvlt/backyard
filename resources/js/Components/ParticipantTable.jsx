import { useState, useEffect, useMemo } from 'react';

const PER_PAGE = 10;
const EMPTY_FORM = { bib_number: '', first_name: '', last_name: '', date_of_birth: '', profile_picture: null };

const inputClass =
    'w-full border border-gray-200 bg-creme px-4 py-2.5 text-sm text-noir focus:outline-none focus:border-or-principal transition-colors';
const btnPrimary =
    'bg-or-principal text-creme text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 hover:bg-or-sombre transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary =
    'border border-gray-200 text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 text-gris hover:text-noir transition-colors disabled:opacity-40';
const btnDanger =
    'bg-red-600 text-white text-[11px] tracking-[0.2em] uppercase px-5 py-2.5 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function SortIcon({ active, dir }) {
    return (
        <span className="ml-1.5 inline-flex flex-col gap-px">
            <svg
                className={`w-2 h-2 ${active && dir === 'asc' ? 'text-or-principal' : 'text-gray-300'}`}
                viewBox="0 0 8 5" fill="currentColor"
            >
                <path d="M4 0L8 5H0z" />
            </svg>
            <svg
                className={`w-2 h-2 ${active && dir === 'desc' ? 'text-or-principal' : 'text-gray-300'}`}
                viewBox="0 0 8 5" fill="currentColor"
            >
                <path d="M4 5L0 0h8z" />
            </svg>
        </span>
    );
}

function Modal({ title, onClose, children, footer }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="font-chau text-xl text-noir">{title}</h3>
                    <button onClick={onClose} className="text-gris hover:text-noir transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">{children}</div>
                {footer && (
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

function Field({ label, required, error, children }) {
    return (
        <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-gris mb-2">
                {label}
                {required && <span className="text-or-principal ml-1">*</span>}
            </label>
            {children}
            {error && (
                <p className="text-red-600 text-xs mt-1">
                    {Array.isArray(error) ? error[0] : error}
                </p>
            )}
        </div>
    );
}

function Avatar({ participant }) {
    const [imgError, setImgError] = useState(false);

    if (participant.profile_picture_url && !imgError) {
        return (
            <img
                src={participant.profile_picture_url}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                onError={() => setImgError(true)}
            />
        );
    }
    return (
        <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gris font-medium uppercase">
            {participant.first_name?.[0]}{participant.last_name?.[0]}
        </div>
    );
}

export default function ParticipantTable() {
    const token = localStorage.getItem('admin_token');
    const authHeaders = { Accept: 'application/json', Authorization: `Bearer ${token}` };

    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState('bib_number');
    const [sortDir, setSortDir] = useState('asc');
    const [page, setPage] = useState(1);
    const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'delete'
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [preview, setPreview] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchParticipants(); }, []);

    const fetchParticipants = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/participants', { headers: authHeaders });
            if (!res.ok) throw new Error();
            setParticipants(await res.json());
        } catch {
            setError('Impossible de charger les participants.');
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        let data = [...participants];
        if (search.trim()) {
            const s = search.toLowerCase();
            data = data.filter(
                (p) =>
                    p.first_name.toLowerCase().includes(s) ||
                    p.last_name.toLowerCase().includes(s) ||
                    String(p.bib_number).includes(s),
            );
        }
        data.sort((a, b) => {
            const va = a[sortKey] ?? '';
            const vb = b[sortKey] ?? '';
            const cmp = String(va).localeCompare(String(vb), 'fr', { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return data;
    }, [participants, search, sortKey, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const handleSort = (key) => {
        if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir('asc'); }
        setPage(1);
    };

    const openAdd = () => {
        setForm(EMPTY_FORM);
        setPreview(null);
        setFormErrors({});
        setSelected(null);
        setModal('add');
    };

    const openEdit = (p) => {
        setForm({
            bib_number: p.bib_number,
            first_name: p.first_name,
            last_name: p.last_name,
            date_of_birth: p.date_of_birth ?? '',
            profile_picture: null,
        });
        setPreview(p.profile_picture_url ?? null);
        setFormErrors({});
        setSelected(p);
        setModal('edit');
    };

    const openDelete = (p) => { setSelected(p); setModal('delete'); };
    const closeModal = () => { setModal(null); setSelected(null); setPreview(null); };

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        if (name === 'profile_picture') {
            const file = files[0] || null;
            setForm((f) => ({ ...f, profile_picture: file }));
            setPreview(file ? URL.createObjectURL(file) : (selected?.profile_picture_url ?? null));
        } else {
            setForm((f) => ({ ...f, [name]: value }));
        }
        setFormErrors((fe) => ({ ...fe, [name]: null }));
    };

    const handleSave = async () => {
        setSaving(true);
        setFormErrors({});
        const fd = new FormData();
        fd.append('bib_number', form.bib_number);
        fd.append('first_name', form.first_name);
        fd.append('last_name', form.last_name);
        if (form.date_of_birth) fd.append('date_of_birth', form.date_of_birth);
        if (form.profile_picture) fd.append('profile_picture', form.profile_picture);
        if (modal === 'edit') fd.append('_method', 'PUT');

        const url =
            modal === 'edit'
                ? `/api/admin/participants/${selected.id}`
                : '/api/admin/participants';

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) {
                setFormErrors(data.errors ?? { general: data.message });
                return;
            }
            await fetchParticipants();
            closeModal();
        } catch {
            setFormErrors({ general: 'Une erreur est survenue.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            await fetch(`/api/admin/participants/${selected.id}`, {
                method: 'DELETE',
                headers: authHeaders,
            });
            await fetchParticipants();
            closeModal();
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        { key: 'bib_number', label: 'Dossard' },
        { key: 'last_name', label: 'Nom' },
        { key: 'first_name', label: 'Prénom' },
        { key: 'date_of_birth', label: 'Naissance' },
    ];

    if (loading) return <p className="text-gris text-sm">Chargement…</p>;
    if (error) return <p className="text-red-600 text-sm">{error}</p>;

    return (
        <div>
            {/* Top bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <input
                    type="search"
                    placeholder="Rechercher par nom, prénom, dossard…"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="border border-gray-200 bg-creme px-4 py-2.5 text-sm text-noir focus:outline-none focus:border-or-principal transition-colors w-full sm:max-w-xs"
                />
                <button onClick={openAdd} className={btnPrimary}>
                    + Ajouter un participant
                </button>
            </div>

            {/* Count */}
            <p className="text-[10px] tracking-[0.2em] uppercase text-gris mb-4">
                {filtered.length} participant{filtered.length !== 1 ? 's' : ''}
            </p>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="pb-3 pr-4 w-10" />
                            {columns.map((col) => (
                                <th key={col.key} className="pb-3 pr-6">
                                    <button
                                        onClick={() => handleSort(col.key)}
                                        className="flex items-center text-[10px] tracking-[0.2em] uppercase text-gris font-medium hover:text-noir transition-colors"
                                    >
                                        {col.label}
                                        <SortIcon active={sortKey === col.key} dir={sortDir} />
                                    </button>
                                </th>
                            ))}
                            <th className="pb-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + 2} className="py-10 text-center text-gris text-sm">
                                    Aucun participant trouvé.
                                </td>
                            </tr>
                        ) : (
                            rows.map((p) => (
                                <tr
                                    key={p.id}
                                    className="border-b border-gray-100 last:border-0 hover:bg-creme/50 transition-colors"
                                >
                                    <td className="py-3 pr-4"><Avatar participant={p} /></td>
                                    <td className="py-3 pr-6 text-sm font-medium text-noir">#{p.bib_number}</td>
                                    <td className="py-3 pr-6 text-sm text-noir">{p.last_name}</td>
                                    <td className="py-3 pr-6 text-sm text-gris">{p.first_name}</td>
                                    <td className="py-3 pr-6 text-sm text-gris">
                                        {p.date_of_birth
                                            ? new Date(p.date_of_birth).toLocaleDateString('fr-FR')
                                            : '—'}
                                    </td>
                                    <td className="py-3 text-right whitespace-nowrap">
                                        <button
                                            onClick={() => openEdit(p)}
                                            className="text-[10px] tracking-[0.15em] uppercase text-gris hover:text-or-principal transition-colors mr-4"
                                        >
                                            Modifier
                                        </button>
                                        <button
                                            onClick={() => openDelete(p)}
                                            className="text-[10px] tracking-[0.15em] uppercase text-gris hover:text-red-600 transition-colors"
                                        >
                                            Supprimer
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className={btnSecondary}
                    >
                        ← Précédent
                    </button>
                    <span className="text-[10px] tracking-[0.2em] uppercase text-gris">
                        Page {page} / {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className={btnSecondary}
                    >
                        Suivant →
                    </button>
                </div>
            )}

            {/* Add / Edit modal */}
            {(modal === 'add' || modal === 'edit') && (
                <Modal
                    title={modal === 'add' ? 'Ajouter un participant' : 'Modifier le participant'}
                    onClose={closeModal}
                    footer={
                        <>
                            <button className={btnSecondary} onClick={closeModal} disabled={saving}>
                                Annuler
                            </button>
                            <button className={btnPrimary} onClick={handleSave} disabled={saving}>
                                {saving ? 'Enregistrement…' : 'Enregistrer'}
                            </button>
                        </>
                    }
                >
                    {formErrors.general && (
                        <p className="text-red-600 text-xs">{formErrors.general}</p>
                    )}
                    <Field label="Numéro de dossard" required error={formErrors.bib_number}>
                        <input
                            type="number" name="bib_number" min="1"
                            value={form.bib_number} onChange={handleChange}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Nom" required error={formErrors.last_name}>
                        <input
                            type="text" name="last_name"
                            value={form.last_name} onChange={handleChange}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Prénom" required error={formErrors.first_name}>
                        <input
                            type="text" name="first_name"
                            value={form.first_name} onChange={handleChange}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Date de naissance" error={formErrors.date_of_birth}>
                        <input
                            type="date" name="date_of_birth"
                            value={form.date_of_birth} onChange={handleChange}
                            className={inputClass}
                        />
                    </Field>
                    <Field label="Photo de profil" error={formErrors.profile_picture}>
                        <div className="flex items-center gap-4">
                            {preview && (
                                <img
                                    src={preview} alt="Aperçu"
                                    className="w-12 h-12 rounded-full object-cover border border-gray-200 shrink-0"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                            <input
                                type="file" name="profile_picture" accept="image/*"
                                onChange={handleChange}
                                className="text-sm text-gris file:mr-3 file:py-1.5 file:px-4 file:border file:border-gray-200 file:text-[11px] file:tracking-[0.1em] file:uppercase file:bg-creme file:text-noir hover:file:bg-gray-100 file:cursor-pointer"
                            />
                        </div>
                    </Field>
                </Modal>
            )}

            {/* Delete confirmation modal */}
            {modal === 'delete' && selected && (
                <Modal
                    title="Supprimer le participant"
                    onClose={closeModal}
                    footer={
                        <>
                            <button className={btnSecondary} onClick={closeModal} disabled={saving}>
                                Annuler
                            </button>
                            <button className={btnDanger} onClick={handleDelete} disabled={saving}>
                                {saving ? 'Suppression…' : 'Supprimer'}
                            </button>
                        </>
                    }
                >
                    <p className="text-sm text-gris">
                        Voulez-vous vraiment supprimer{' '}
                        <span className="text-noir font-medium">
                            {selected.first_name} {selected.last_name}
                        </span>{' '}
                        (dossard #{selected.bib_number}) ?
                    </p>
                    <p className="text-xs text-gris mt-2">Cette action est irréversible.</p>
                </Modal>
            )}
        </div>
    );
}
