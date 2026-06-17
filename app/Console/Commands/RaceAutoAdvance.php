<?php

namespace App\Console\Commands;

use App\Models\LoopResult;
use App\Models\Participant;
use App\Models\RaceSession;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class RaceAutoAdvance extends Command
{
    protected $signature   = 'race:auto-advance';
    protected $description = 'Démarre automatiquement les courses planifiées et avance les boucles.';

    public function handle(): void
    {
        $this->autoStart();
        $this->autoAdvance();
    }

    /**
     * Démarre une session planifiée dont l'heure de départ est atteinte.
     */
    private function autoStart(): void
    {
        $session = RaceSession::where('status', 'scheduled')
            ->where('scheduled_start_at', '<=', now())
            ->latest('scheduled_start_at')
            ->first();

        if (! $session) {
            return;
        }

        if (Participant::count() === 0) {
            $this->warn('Démarrage automatique impossible : aucun participant inscrit.');
            return;
        }

        $startedAt = Carbon::parse($session->scheduled_start_at);

        // La session garde l'heure planifiée dans started_at,
        // mais la boucle démarre à now() pour éviter une auto-avance immédiate
        // si le démarrage arrive avec quelques minutes de retard.
        $session->update(['status' => 'active', 'started_at' => $startedAt]);

        $loop = $session->loops()->create([
            'loop_number' => 1,
            'started_at'  => now(),
        ]);

        $inserts = Participant::all()->map(fn ($p) => [
            'race_loop_id'   => $loop->id,
            'participant_id' => $p->id,
            'status'         => 'running',
            'created_at'     => now(),
            'updated_at'     => now(),
        ])->all();

        LoopResult::insert($inserts);

        $this->info("Course démarrée automatiquement — Boucle 1 lancée à {$startedAt->format('H:i')}.");
    }

    /**
     * Avance à la boucle suivante si la durée de la boucle courante est écoulée.
     */
    private function autoAdvance(): void
    {
        $session = RaceSession::where('status', 'active')->latest()->first();

        if (! $session) {
            return;
        }

        $currentLoop = $session->loops()->latest('loop_number')->first();
        $loopEnd     = Carbon::parse($currentLoop->started_at)->addMinutes($session->loop_duration_minutes);

        if (now()->lt($loopEnd)) {
            return; // Boucle encore en cours
        }

        $result = app(\App\Http\Controllers\Api\RaceController::class)
            ->advanceLoop($session, $currentLoop, $loopEnd);

        $this->info($result['message']);
    }
}
