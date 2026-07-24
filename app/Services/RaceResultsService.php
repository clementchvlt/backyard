<?php

namespace App\Services;

use App\Models\Participant;
use App\Models\Race;
use Carbon\CarbonInterface;

/**
 * Moteur de calcul des résultats — réplique la logique de l'Excel :
 * on ne stocke que des heures d'arrivée (ou DNF), tout le reste est dérivé.
 *
 * - Temps de boucle = arrivée − départ théorique de la boucle (départ + (n−1) × durée)
 * - Boucle validée si 0 < temps ≤ durée ; sinon HORS DÉLAI → éliminé
 * - Pas d'arrivée alors que l'heure limite est passée → éliminé (non revenu)
 * - Classement : boucles validées (décroissant) puis temps cumulé (croissant)
 * - Vainqueur : unique 1er du classement une fois la course terminée
 */
class RaceResultsService
{
    public function compute(?Race $race, ?CarbonInterface $now = null): array
    {
        $now = $now ?: now();
        $participants = Participant::orderBy('bib_number')->get();

        if (! $race) {
            return [
                'race'         => null,
                'participants' => [],
                'stats'        => ['in_race' => 0, 'winner' => null, 'total' => $participants->count()],
                'server_now'   => $now->toIso8601String(),
            ];
        }

        $start   = $race->start_at;
        $durSec  = $race->loop_duration_minutes * 60;
        $max     = $race->max_loops;
        $started = $start !== null && $now->greaterThanOrEqualTo($start);

        $arrivalsByParticipant = $race->arrivals->groupBy('participant_id');

        $rows = [];
        foreach ($participants as $p) {
            $rows[] = $this->computeParticipant(
                $p,
                $arrivalsByParticipant->get($p->id),
                $race,
                $now,
                $started
            );
        }

        // Classement type compétition : rang = 1 + nombre de coureurs strictement meilleurs
        foreach ($rows as $i => $row) {
            $better = 0;
            foreach ($rows as $other) {
                if ($other['loops_completed'] > $row['loops_completed']
                    || ($other['loops_completed'] === $row['loops_completed']
                        && $other['total_seconds'] < $row['total_seconds'])) {
                    $better++;
                }
            }
            $rows[$i]['rank'] = $better + 1;
        }

        usort($rows, fn ($a, $b) => [$a['rank'], $a['bib_number']] <=> [$b['rank'], $b['bib_number']]);

        $inRace = count(array_filter($rows, fn ($r) => in_array($r['status'], ['running', 'arrived'], true)));

        // Statut global
        if (! $started) {
            $status = 'pending';
        } elseif ($inRace === 0) {
            $status = 'finished';
        } else {
            $status = 'live';
        }

        // Vainqueur : course terminée + un seul rang 1
        $winner = null;
        if ($status === 'finished' && count($rows) > 0) {
            $firsts = array_values(array_filter($rows, fn ($r) => $r['rank'] === 1));
            if (count($firsts) === 1 && $firsts[0]['loops_completed'] > 0) {
                $winner = $firsts[0]['id'];
            }
        }
        foreach ($rows as $i => $row) {
            $rows[$i]['is_winner'] = ($row['id'] === $winner);
        }

        // Boucle en cours (théorique)
        $currentLoop = null;
        $currentLoopStart = null;
        $currentLoopDeadline = null;
        if ($status === 'live') {
            $elapsed     = (int) $start->diffInSeconds($now, false);
            $currentLoop = min(intdiv($elapsed, $durSec) + 1, $max);
            $currentLoopStart    = $start->copy()->addSeconds(($currentLoop - 1) * $durSec);
            $currentLoopDeadline = $currentLoopStart->copy()->addSeconds($durSec);
        }

        $winnerRow = $winner ? current(array_filter($rows, fn ($r) => $r['id'] === $winner)) : null;

        return [
            'race' => [
                'id'                    => $race->id,
                'name'                  => $race->name,
                'start_at'              => $start?->toIso8601String(),
                'loop_distance_km'      => (float) $race->loop_distance_km,
                'loop_duration_minutes' => $race->loop_duration_minutes,
                'max_loops'             => $max,
                'status'                => $status,
                'current_loop'          => $currentLoop,
                'current_loop_start'    => $currentLoopStart?->toIso8601String(),
                'current_loop_deadline' => $currentLoopDeadline?->toIso8601String(),
            ],
            'participants' => $rows,
            'stats' => [
                'in_race' => $inRace,
                'total'   => count($rows),
                'winner'  => $winnerRow ? [
                    'id'         => $winnerRow['id'],
                    'name'       => trim($winnerRow['first_name'] . ' ' . $winnerRow['last_name']),
                    'bib_number' => $winnerRow['bib_number'],
                    'loops'      => $winnerRow['loops_completed'],
                ] : null,
            ],
            'server_now' => $now->toIso8601String(),
        ];
    }

    private function computeParticipant(
        Participant $p,
        $arrivals,
        Race $race,
        CarbonInterface $now,
        bool $started
    ): array {
        $byLoop = $arrivals ? $arrivals->keyBy('loop_number') : collect();
        $start  = $race->start_at;
        $durSec = $race->loop_duration_minutes * 60;
        $max    = $race->max_loops;

        $loops      = [];
        $completed  = 0;
        $total      = 0;
        $status     = $started ? 'running' : 'waiting';
        $statusLoop = null;
        $terminal   = false;

        for ($n = 1; $n <= $max; $n++) {
            $cell = ['loop' => $n, 'arrived_at' => null, 'seconds' => null, 'state' => 'future'];

            if (! $started || $terminal) {
                if ($terminal) {
                    $cell['state'] = 'closed';
                }
                $loops[] = $cell;
                continue;
            }

            $loopStart = $start->copy()->addSeconds(($n - 1) * $durSec);
            $deadline  = $loopStart->copy()->addSeconds($durSec);
            $row       = $byLoop->get($n);

            if ($row && $row->is_dnf) {
                // Abandon volontaire saisi par l'admin
                $cell['state'] = 'dnf';
                $status        = 'dnf';
                $statusLoop    = $n;
                $terminal      = true;
            } elseif ($row && $row->arrived_at) {
                $sec = (int) $loopStart->diffInSeconds($row->arrived_at, false);
                $cell['arrived_at'] = $row->arrived_at->toIso8601String();
                $cell['seconds']    = $sec;

                if ($sec > 0 && $sec <= $durSec) {
                    $cell['state'] = 'valid';
                    $completed++;
                    $total += $sec;
                } else {
                    // Arrivée hors délai (ou incohérente) → éliminé
                    $cell['state'] = 'late';
                    $status        = 'eliminated';
                    $statusLoop    = $n;
                    $terminal      = true;
                }
            } else {
                if ($now->greaterThanOrEqualTo($deadline)) {
                    // Heure limite dépassée sans arrivée → éliminé automatiquement
                    $cell['state'] = 'missed';
                    $status        = 'eliminated';
                    $statusLoop    = $n;
                    $terminal      = true;
                } elseif ($now->lessThan($loopStart)) {
                    // Boucle précédente validée, la suivante n'a pas encore démarré
                    $status     = 'arrived';
                    $statusLoop = $n;
                    $terminal   = true;
                } else {
                    // Boucle en cours, pas encore arrivé
                    $cell['state'] = 'pending';
                    $status        = 'running';
                    $statusLoop    = $n;
                    $terminal      = true;
                }
            }

            $loops[] = $cell;
        }

        if ($started && ! $terminal && $completed === $max) {
            $status     = 'finisher';
            $statusLoop = $max;
        }

        return [
            'id'                  => $p->id,
            'bib_number'          => $p->bib_number,
            'first_name'          => $p->first_name,
            'last_name'           => $p->last_name,
            'profile_picture_url' => $p->profile_picture_url,
            'status'              => $status,
            'status_loop'         => $statusLoop,
            'loops_completed'     => $completed,
            'total_seconds'       => $total,
            'avg_seconds'         => $completed > 0 ? intdiv($total, $completed) : null,
            'distance_km'         => round($completed * (float) $race->loop_distance_km, 3),
            'loops'               => $loops,
        ];
    }
}
