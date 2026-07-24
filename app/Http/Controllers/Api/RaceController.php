<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoopArrival;
use App\Models\Race;
use App\Services\RaceResultsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Http\Request;

/**
 * Gestion de course, sur le modèle de l'Excel :
 * - des paramètres (départ, distance, durée, nb max de boucles)
 * - des heures d'arrivée (ou DNF) par participant × boucle
 * Tout le reste (temps, éliminations, classement) est calculé par RaceResultsService.
 */
class RaceController extends Controller
{
    public function __construct(private RaceResultsService $results)
    {
    }

    /** État complet de la course (lecture publique : sert aussi l'onglet Résultats). */
    public function state(): JsonResponse
    {
        return $this->stateResponse();
    }

    /** Création / mise à jour des paramètres de la course. */
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                  => 'sometimes|string|max:255',
            'start_at'              => 'sometimes|nullable|date',
            'loop_distance_km'      => 'sometimes|numeric|min:0.001|max:999.999',
            'loop_duration_minutes' => 'sometimes|integer|min:1|max:1440',
            'max_loops'             => 'sometimes|integer|min:1|max:200',
        ]);

        if (array_key_exists('start_at', $data)) {
            $data['start_at'] = $this->parseDate($data['start_at']);
        }

        $race = Race::latest('id')->first() ?? new Race();
        $race->fill($data)->save();

        return $this->stateResponse();
    }

    /** Enregistre (ou corrige) une arrivée. Sans heure fournie : maintenant. */
    public function storeArrival(Request $request): JsonResponse
    {
        $data = $request->validate([
            'participant_id' => 'required|exists:participants,id',
            'loop_number'    => 'required|integer|min:1',
            'arrived_at'     => 'sometimes|nullable|date',
        ]);

        $race = $this->requireRace();
        abort_if($data['loop_number'] > $race->max_loops, 422, 'Numéro de boucle supérieur au maximum.');

        LoopArrival::updateOrCreate(
            [
                'race_id'        => $race->id,
                'participant_id' => $data['participant_id'],
                'loop_number'    => $data['loop_number'],
            ],
            [
                'arrived_at' => $this->parseDate($data['arrived_at'] ?? null) ?? now(),
                'is_dnf'     => false,
            ]
        );

        return $this->stateResponse();
    }

    /** Arrivée groupée : même boucle, même heure, plusieurs coureurs. */
    public function storeGroupArrival(Request $request): JsonResponse
    {
        $data = $request->validate([
            'participant_ids'   => 'required|array|min:1',
            'participant_ids.*' => 'exists:participants,id',
            'loop_number'       => 'required|integer|min:1',
            'arrived_at'        => 'sometimes|nullable|date',
        ]);

        $race = $this->requireRace();
        abort_if($data['loop_number'] > $race->max_loops, 422, 'Numéro de boucle supérieur au maximum.');

        $arrivedAt = $this->parseDate($data['arrived_at'] ?? null) ?? now();

        foreach (array_unique($data['participant_ids']) as $participantId) {
            LoopArrival::updateOrCreate(
                [
                    'race_id'        => $race->id,
                    'participant_id' => $participantId,
                    'loop_number'    => $data['loop_number'],
                ],
                ['arrived_at' => $arrivedAt, 'is_dnf' => false]
            );
        }

        return $this->stateResponse();
    }

    /** Abandon volontaire sur une boucle. */
    public function storeDnf(Request $request): JsonResponse
    {
        $data = $request->validate([
            'participant_id' => 'required|exists:participants,id',
            'loop_number'    => 'required|integer|min:1',
        ]);

        $race = $this->requireRace();
        abort_if($data['loop_number'] > $race->max_loops, 422, 'Numéro de boucle supérieur au maximum.');

        LoopArrival::updateOrCreate(
            [
                'race_id'        => $race->id,
                'participant_id' => $data['participant_id'],
                'loop_number'    => $data['loop_number'],
            ],
            ['arrived_at' => null, 'is_dnf' => true]
        );

        return $this->stateResponse();
    }

    /** Efface une cellule (arrivée ou DNF) — annulation / correction. */
    public function destroyArrival(Request $request): JsonResponse
    {
        $data = $request->validate([
            'participant_id' => 'required|exists:participants,id',
            'loop_number'    => 'required|integer|min:1',
        ]);

        $race = $this->requireRace();

        LoopArrival::where('race_id', $race->id)
            ->where('participant_id', $data['participant_id'])
            ->where('loop_number', $data['loop_number'])
            ->delete();

        return $this->stateResponse();
    }

    /** Efface toutes les arrivées (les paramètres sont conservés). */
    public function reset(): JsonResponse
    {
        $race = Race::latest('id')->first();
        $race?->arrivals()->delete();

        return $this->stateResponse();
    }

    /**
     * Parse une date reçue de l'API et la convertit dans le fuseau de l'application.
     * Le front envoie de l'ISO 8601 UTC (toISOString) ; sans cette conversion,
     * Laravel stockerait l'heure UTC telle quelle (décalage de 2 h).
     */
    private function parseDate(?string $value): ?Carbon
    {
        if (! $value) {
            return null;
        }

        return Carbon::parse($value)->setTimezone(config('app.timezone'));
    }

    private function requireRace(): Race
    {
        $race = Race::latest('id')->first();
        abort_if(! $race, 422, "Aucune course configurée : renseignez d'abord les paramètres.");

        return $race;
    }

    private function stateResponse(): JsonResponse
    {
        $race = Race::with('arrivals')->latest('id')->first();

        return response()->json($this->results->compute($race));
    }
}
