<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoopResult;
use App\Models\Participant;
use App\Models\RaceLoop;
use App\Models\RaceSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class RaceController extends Controller
{
    public function status(): JsonResponse
    {
        $session = RaceSession::latest()->first();

        if (! $session) {
            return response()->json([
                'status'            => 'not_started',
                'participant_count' => Participant::count(),
            ]);
        }

        if ($session->status === 'scheduled') {
            // Démarrage automatique inline si l'heure est passée
            if ($session->scheduled_start_at->lte(now())) {
                // On utilise now() et non scheduled_start_at pour le démarrage de la boucle :
                // si la course démarre avec du retard, utiliser l'heure passée ferait
                // déclencher l'auto-avance immédiatement (boucle déjà "expirée").
                $this->startSession($session, now());
                $session->refresh();
                $currentLoop = $session->loops()->latest('loop_number')->first();
                // Pas d'auto-avance pour une boucle qui vient d'être créée
                goto renderActive;
            } else {
                return response()->json([
                    'status'            => 'scheduled',
                    'session'           => $session,
                    'participant_count' => Participant::count(),
                ]);
            }
        }

        $currentLoop = $session->loops()->latest('loop_number')->first();

        // Auto-avance inline si la durée de la boucle est dépassée
        if ($session->status === 'active' && $currentLoop) {
            $loopEnd = Carbon::parse($currentLoop->started_at)->addMinutes($session->loop_duration_minutes);
            if (now()->gte($loopEnd)) {
                $this->advanceLoop($session, $currentLoop, $loopEnd);
                $session->refresh();
                $currentLoop = $session->loops()->latest('loop_number')->first();
            }
        }

        renderActive:

        // Load all results for this session in one query
        $allResults = LoopResult::whereHas('raceLoop', fn ($q) => $q->where('race_session_id', $session->id))
            ->with('raceLoop')
            ->get()
            ->groupBy('participant_id');

        $participants = Participant::orderBy('bib_number')->get()->map(function ($p) use ($allResults, $currentLoop) {
            $results     = $allResults->get($p->id, collect());
            $isDnf       = $results->where('status', 'dnf')->isNotEmpty();
            $dnfResult   = $isDnf ? $results->where('status', 'dnf')->first() : null;
            $curResult   = $currentLoop ? $results->firstWhere('race_loop_id', $currentLoop->id) : null;

            return [
                'id'                  => $p->id,
                'first_name'          => $p->first_name,
                'last_name'           => $p->last_name,
                'bib_number'          => $p->bib_number,
                'profile_picture_url' => $p->profile_picture_url,
                'is_active'           => ! $isDnf,
                'loops_completed'     => $results->where('status', 'finished')->count(),
                'current_loop_status' => $curResult?->status,
                'finished_at'         => $curResult?->finished_at?->toIso8601String(),
                'eliminated_at_loop'  => $dnfResult?->raceLoop?->loop_number,
            ];
        });

        $loopHistory = $session->loops()
            ->withCount(['results as finishers_count' => fn ($q) => $q->where('status', 'finished')])
            ->withCount(['results as dnf_count' => fn ($q) => $q->where('status', 'dnf')])
            ->orderBy('loop_number')
            ->get(['id', 'loop_number', 'started_at']);

        $activeCount = $participants->where('is_active', true)->count();

        return response()->json([
            'status'       => $session->status,
            'session'      => $session,
            'current_loop' => $currentLoop,
            'participants' => $participants->values(),
            'loop_history' => $loopHistory,
            'stats'        => [
                'active_count'           => $activeCount,
                'eliminated_count'       => $participants->count() - $activeCount,
                'total_loops_completed'  => max(0, $session->loops()->count() - 1),
            ],
        ]);
    }

    public function schedule(Request $request): JsonResponse
    {
        $data = $request->validate([
            'scheduled_start_at'    => 'required|date',
            'last_departure_at'     => 'required|date|after:scheduled_start_at',
            'loop_duration_minutes' => 'integer|min:1|max:1440',
        ]);

        if (RaceSession::whereIn('status', ['scheduled', 'active'])->exists()) {
            return response()->json(['message' => 'Une course est déjà programmée ou en cours.'], 422);
        }

        if (Participant::count() === 0) {
            return response()->json(['message' => 'Aucun participant inscrit.'], 422);
        }

        $loopDuration = $data['loop_duration_minutes'] ?? 60;
        $start        = Carbon::parse($data['scheduled_start_at']);
        $lastDep      = Carbon::parse($data['last_departure_at']);
        $diffMinutes  = $start->diffInMinutes($lastDep);
        $maxLoops     = (int) floor($diffMinutes / $loopDuration) + 1;

        RaceSession::create([
            'status'                => 'scheduled',
            'scheduled_start_at'    => $start,
            'loop_duration_minutes' => $loopDuration,
            'max_loops'             => $maxLoops,
        ]);

        return response()->json([
            'message'  => "Course programmée le {$start->format('d/m/Y à H:i')} — {$maxLoops} boucles max.",
        ]);
    }

    public function start(): JsonResponse
    {
        if (RaceSession::where('status', 'active')->exists()) {
            return response()->json(['message' => 'Une course est déjà en cours.'], 422);
        }

        if (Participant::count() === 0) {
            return response()->json(['message' => 'Aucun participant inscrit.'], 422);
        }

        // Promote a scheduled session if one exists, otherwise create fresh
        $session = RaceSession::where('status', 'scheduled')->latest()->first()
            ?? RaceSession::create(['status' => 'pending']);

        $this->startSession($session, now());

        return response()->json(['message' => 'Course démarrée — Boucle 1 en cours !']);
    }

    /**
     * Démarre une session : status → active, crée loop 1, inscrit tous les participants.
     * Utilise $startedAt pour calquer l'heure réelle (schedule ou now()).
     */
    private function startSession(RaceSession $session, Carbon $startedAt): void
    {
        $session->update(['status' => 'active', 'started_at' => $startedAt]);

        $loop = $session->loops()->create([
            'loop_number' => 1,
            'started_at'  => $startedAt,
        ]);

        $inserts = Participant::all()->map(fn ($p) => [
            'race_loop_id'   => $loop->id,
            'participant_id' => $p->id,
            'status'         => 'running',
            'created_at'     => now(),
            'updated_at'     => now(),
        ])->all();

        LoopResult::insert($inserts);
    }

    public function nextLoop(): JsonResponse
    {
        $session     = RaceSession::where('status', 'active')->latest()->firstOrFail();
        $currentLoop = $session->loops()->latest('loop_number')->firstOrFail();

        $result = $this->advanceLoop($session, $currentLoop, now());

        return response()->json($result);
    }

    /**
     * Avance la course à la boucle suivante (ou la termine).
     * Utilisé par nextLoop(), status() et RaceAutoAdvance.
     * Retourne un tableau ['message' => ..., 'status' => ...?].
     */
    public function advanceLoop(RaceSession $session, RaceLoop $currentLoop, Carbon $nextStartedAt): array
    {
        // DNF everyone still running
        LoopResult::where('race_loop_id', $currentLoop->id)
            ->where('status', 'running')
            ->update(['status' => 'dnf', 'updated_at' => now()]);

        $finisherIds = LoopResult::where('race_loop_id', $currentLoop->id)
            ->where('status', 'finished')
            ->pluck('participant_id');

        $isLastLoop = $session->max_loops !== null
            && $currentLoop->loop_number >= $session->max_loops;

        if ($finisherIds->isEmpty()) {
            $session->update(['status' => 'finished']);
            return ['message' => 'Aucun finissant — course terminée.', 'status' => 'finished'];
        }

        if ($finisherIds->count() === 1 || $isLastLoop) {
            $session->update(['status' => 'finished']);
            $winner = Participant::find($finisherIds->first());
            $msg = $isLastLoop && $finisherIds->count() > 1
                ? "Dernière boucle atteinte — course terminée. {$finisherIds->count()} finissant(s)."
                : "Vainqueur\u00a0: #{$winner->bib_number} {$winner->last_name}\u00a0!";
            return ['message' => $msg, 'status' => 'finished'];
        }

        $nextLoop = $session->loops()->create([
            'loop_number' => $currentLoop->loop_number + 1,
            'started_at'  => $nextStartedAt,
        ]);

        $inserts = $finisherIds->map(fn ($pid) => [
            'race_loop_id'   => $nextLoop->id,
            'participant_id' => $pid,
            'status'         => 'running',
            'created_at'     => now(),
            'updated_at'     => now(),
        ])->all();

        LoopResult::insert($inserts);

        return [
            'message' => "Boucle {$nextLoop->loop_number} démarrée — {$finisherIds->count()} participants en lice.",
        ];
    }

    public function finish(Request $request, Participant $participant): JsonResponse
    {
        $request->validate([
            'finished_at' => 'nullable|date',
        ]);

        $session     = RaceSession::where('status', 'active')->latest()->firstOrFail();
        $currentLoop = $session->loops()->latest('loop_number')->firstOrFail();

        $finishedAt = $request->filled('finished_at')
            ? Carbon::parse($request->finished_at)
            : now();

        $updated = LoopResult::where('race_loop_id', $currentLoop->id)
            ->where('participant_id', $participant->id)
            ->where('status', 'running')
            ->update(['status' => 'finished', 'finished_at' => $finishedAt, 'updated_at' => now()]);

        if (! $updated) {
            return response()->json(['message' => 'Participant non trouvé ou déjà traité.'], 422);
        }

        return response()->json([
            'message' => "#{$participant->bib_number} {$participant->last_name} a terminé — {$finishedAt->format('H:i:s')}.",
        ]);
    }

    public function dnf(Participant $participant): JsonResponse
    {
        $session = RaceSession::where('status', 'active')->latest()->firstOrFail();
        $currentLoop = $session->loops()->latest('loop_number')->firstOrFail();

        $updated = LoopResult::where('race_loop_id', $currentLoop->id)
            ->where('participant_id', $participant->id)
            ->where('status', 'running')
            ->update(['status' => 'dnf', 'updated_at' => now()]);

        if (! $updated) {
            return response()->json(['message' => 'Participant non trouvé ou déjà traité.'], 422);
        }

        return response()->json([
            'message' => "#{$participant->bib_number} {$participant->last_name} est éliminé.",
        ]);
    }

    public function loopDetail(RaceLoop $loop): JsonResponse
    {
        $session = RaceSession::findOrFail($loop->race_session_id);

        $results = LoopResult::where('race_loop_id', $loop->id)
            ->with('participant')
            ->get();

        $loopStarted = Carbon::parse($loop->started_at);

        $finishers = $results->where('status', 'finished')
            ->sortBy('finished_at')
            ->values()
            ->map(fn ($r, $idx) => [
                'rank'            => $idx + 1,
                'bib_number'      => $r->participant->bib_number,
                'first_name'      => $r->participant->first_name,
                'last_name'       => $r->participant->last_name,
                'finished_at'     => $r->finished_at?->toIso8601String(),
                'elapsed_seconds' => $r->finished_at
                    ? $loopStarted->diffInSeconds(Carbon::parse($r->finished_at))
                    : null,
            ]);

        $dnfs = $results->where('status', 'dnf')
            ->values()
            ->map(fn ($r) => [
                'bib_number' => $r->participant->bib_number,
                'first_name' => $r->participant->first_name,
                'last_name'  => $r->participant->last_name,
            ]);

        $running = $results->where('status', 'running')
            ->values()
            ->map(fn ($r) => [
                'bib_number' => $r->participant->bib_number,
                'first_name' => $r->participant->first_name,
                'last_name'  => $r->participant->last_name,
            ]);

        return response()->json([
            'loop_number'            => $loop->loop_number,
            'started_at'             => $loop->started_at,
            'loop_duration_minutes'  => $session->loop_duration_minutes,
            'finishers'              => $finishers,
            'dnfs'                   => $dnfs,
            'running'                => $running,
        ]);
    }

    public function cancelSchedule(): JsonResponse    {
        $session = RaceSession::where('status', 'scheduled')->latest()->first();

        if (! $session) {
            return response()->json(['message' => 'Aucune course programmée.'], 422);
        }

        $session->delete();

        return response()->json(['message' => 'Programmation annulée.']);
    }

    public function reset(): JsonResponse
    {
        LoopResult::query()->delete();
        RaceLoop::query()->delete();
        RaceSession::query()->delete();

        return response()->json(['message' => 'Course réinitialisée.']);
    }

    /**
     * Rattrapage : rouvre une course terminée en remettant les DNF de la dernière
     * boucle à "running", permettant à l'admin de les retraiter.
     */
    public function reopen(): JsonResponse
    {
        $session = RaceSession::where('status', 'finished')->latest()->first();

        if (! $session) {
            return response()->json(['message' => 'Aucune course terminée à rouvrir.'], 422);
        }

        $lastLoop = $session->loops()->latest('loop_number')->firstOrFail();

        $reset = LoopResult::where('race_loop_id', $lastLoop->id)
            ->where('status', 'dnf')
            ->update(['status' => 'running', 'finished_at' => null, 'updated_at' => now()]);

        // Remettre le started_at à maintenant pour éviter que l'auto-avance
        // se déclenche immédiatement (la boucle était dans le passé).
        $lastLoop->update(['started_at' => now()]);

        $session->update(['status' => 'active']);

        return response()->json([
            'message' => "Boucle {$lastLoop->loop_number} rouverte — {$reset} participant(s) remis en lice.",
        ]);
    }

    /**
     * Rattrapage : remet un participant éliminé (DNF) en "running" dans la boucle courante.
     * Permet de corriger un DNF automatique ou une erreur de saisie.
     */
    public function restore(Participant $participant): JsonResponse
    {
        $session     = RaceSession::where('status', 'active')->latest()->firstOrFail();
        $currentLoop = $session->loops()->latest('loop_number')->firstOrFail();

        $updated = LoopResult::where('race_loop_id', $currentLoop->id)
            ->where('participant_id', $participant->id)
            ->where('status', 'dnf')
            ->update(['status' => 'running', 'finished_at' => null, 'updated_at' => now()]);

        if (! $updated) {
            return response()->json(['message' => 'Participant non trouvé ou non éliminé dans cette boucle.'], 422);
        }

        // Si la boucle est déjà expirée, remettre le timer à maintenant
        // pour que l'admin ait le temps de traiter le rattrapage.
        $loopEnd = Carbon::parse($currentLoop->started_at)->addMinutes($session->loop_duration_minutes);
        if (now()->gte($loopEnd)) {
            $currentLoop->update(['started_at' => now()]);
        }

        return response()->json([
            'message' => "#{$participant->bib_number} {$participant->last_name} remis en lice.",
        ]);
    }
}
