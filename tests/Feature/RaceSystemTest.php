<?php

namespace Tests\Feature;

use App\Models\LoopArrival;
use App\Models\Participant;
use App\Models\Race;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RaceSystemTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function actingAsAdmin(): User
    {
        $user = User::factory()->create(['is_admin' => true]);
        Sanctum::actingAs($user);

        return $user;
    }

    private function makeParticipants(int $count = 3): array
    {
        return collect(range(1, $count))->map(fn ($i) => Participant::create([
            'first_name' => "Prenom{$i}",
            'last_name'  => "Nom{$i}",
            'bib_number' => $i,
        ]))->all();
    }

    private function makeRace(string $startAt = '2026-09-12 08:00:00'): Race
    {
        return Race::create([
            'name'                  => 'Backyard Test',
            'start_at'              => $startAt,
            'loop_distance_km'      => 6.706,
            'loop_duration_minutes' => 60,
            'max_loops'             => 12,
        ]);
    }

    // ─── Lecture publique ─────────────────────────────────────────────────────

    public function test_public_state_is_available_without_auth(): void
    {
        $this->makeParticipants(2);

        $this->getJson('/api/race')
            ->assertOk()
            ->assertJsonPath('race', null)
            ->assertJsonPath('stats.total', 2);
    }

    public function test_pending_race_before_start(): void
    {
        Carbon::setTestNow('2026-09-12 07:00:00');
        $this->makeParticipants(1);
        $this->makeRace();

        $this->getJson('/api/race')
            ->assertOk()
            ->assertJsonPath('race.status', 'pending')
            ->assertJsonPath('participants.0.status', 'waiting');
    }

    // ─── Paramètres ───────────────────────────────────────────────────────────

    public function test_admin_can_configure_race(): void
    {
        $this->actingAsAdmin();

        $this->putJson('/api/admin/race', [
            'name'                  => 'Backyard des Mools 2026',
            'start_at'              => '2026-09-12 08:00:00',
            'loop_distance_km'      => 6.706,
            'loop_duration_minutes' => 60,
            'max_loops'             => 12,
        ])->assertOk()->assertJsonPath('race.max_loops', 12);

        $this->assertDatabaseCount('races', 1);

        // Une seconde sauvegarde met à jour la même course
        $this->putJson('/api/admin/race', ['max_loops' => 10])
            ->assertOk()
            ->assertJsonPath('race.max_loops', 10);

        $this->assertDatabaseCount('races', 1);
    }

    public function test_guest_cannot_modify_race(): void
    {
        $this->makeRace();

        $this->putJson('/api/admin/race', ['max_loops' => 5])->assertUnauthorized();
        $this->postJson('/api/admin/race/arrivals', [])->assertUnauthorized();
    }

    // ─── Arrivées & calculs ───────────────────────────────────────────────────

    public function test_arrival_within_time_validates_loop(): void
    {
        Carbon::setTestNow('2026-09-12 08:52:30');
        $this->actingAsAdmin();
        [$p] = $this->makeParticipants(1);
        $this->makeRace();

        // Pointage sans heure : "maintenant"
        $response = $this->postJson('/api/admin/race/arrivals', [
            'participant_id' => $p->id,
            'loop_number'    => 1,
        ])->assertOk();

        $row = $response->json('participants.0');
        $this->assertSame(1, $row['loops_completed']);
        $this->assertSame(3150, $row['total_seconds']); // 52 min 30 s
        $this->assertSame('valid', $row['loops'][0]['state']);
        $this->assertSame('arrived', $row['status']); // boucle validée, en attente de la suivante
        $this->assertEqualsWithDelta(6.706, $row['distance_km'], 0.001);
    }

    public function test_late_arrival_eliminates_runner(): void
    {
        Carbon::setTestNow('2026-09-12 09:10:00');
        $this->actingAsAdmin();
        [$p] = $this->makeParticipants(1);
        $this->makeRace();

        // Arrivée rétroactive hors délai (boucle 1 fermait à 09:00)
        $response = $this->postJson('/api/admin/race/arrivals', [
            'participant_id' => $p->id,
            'loop_number'    => 1,
            'arrived_at'     => '2026-09-12 09:05:00',
        ])->assertOk();

        $row = $response->json('participants.0');
        $this->assertSame('late', $row['loops'][0]['state']);
        $this->assertSame('eliminated', $row['status']);
        $this->assertSame(0, $row['loops_completed']);
    }

    public function test_missing_arrival_after_deadline_auto_eliminates(): void
    {
        Carbon::setTestNow('2026-09-12 09:10:00');
        $this->makeParticipants(1);
        $this->makeRace();

        $row = $this->getJson('/api/race')->json('participants.0');
        $this->assertSame('missed', $row['loops'][0]['state']);
        $this->assertSame('eliminated', $row['status']);
        $this->assertSame(1, $row['status_loop']);
    }

    public function test_voluntary_dnf(): void
    {
        Carbon::setTestNow('2026-09-12 08:30:00');
        $this->actingAsAdmin();
        [$p] = $this->makeParticipants(1);
        $this->makeRace();

        $response = $this->postJson('/api/admin/race/arrivals/dnf', [
            'participant_id' => $p->id,
            'loop_number'    => 1,
        ])->assertOk();

        $this->assertSame('dnf', $response->json('participants.0.status'));
    }

    public function test_group_arrival(): void
    {
        Carbon::setTestNow('2026-09-12 08:45:00');
        $this->actingAsAdmin();
        [$a, $b] = $this->makeParticipants(2);
        $this->makeRace();

        $response = $this->postJson('/api/admin/race/arrivals/group', [
            'participant_ids' => [$a->id, $b->id],
            'loop_number'     => 1,
            'arrived_at'      => '2026-09-12 08:44:00',
        ])->assertOk();

        foreach ($response->json('participants') as $row) {
            $this->assertSame(1, $row['loops_completed']);
            $this->assertSame(2640, $row['total_seconds']);
        }
    }

    public function test_arrival_can_be_corrected_and_cleared(): void
    {
        Carbon::setTestNow('2026-09-12 08:50:00');
        $this->actingAsAdmin();
        [$p] = $this->makeParticipants(1);
        $this->makeRace();

        // Saisie puis correction
        $this->postJson('/api/admin/race/arrivals', [
            'participant_id' => $p->id, 'loop_number' => 1, 'arrived_at' => '2026-09-12 08:40:00',
        ])->assertOk();
        $response = $this->postJson('/api/admin/race/arrivals', [
            'participant_id' => $p->id, 'loop_number' => 1, 'arrived_at' => '2026-09-12 08:42:00',
        ])->assertOk();

        $this->assertSame(2520, $response->json('participants.0.total_seconds'));
        $this->assertDatabaseCount('loop_arrivals', 1);

        // Effacement de la cellule
        $response = $this->deleteJson('/api/admin/race/arrivals', [
            'participant_id' => $p->id, 'loop_number' => 1,
        ])->assertOk();

        $this->assertSame(0, $response->json('participants.0.loops_completed'));
        $this->assertDatabaseCount('loop_arrivals', 0);
    }

    public function test_loop_number_cannot_exceed_max_loops(): void
    {
        Carbon::setTestNow('2026-09-12 08:30:00');
        $this->actingAsAdmin();
        [$p] = $this->makeParticipants(1);
        $this->makeRace();

        $this->postJson('/api/admin/race/arrivals', [
            'participant_id' => $p->id,
            'loop_number'    => 13,
        ])->assertStatus(422);
    }

    // ─── Classement, vainqueur, fin de course ─────────────────────────────────

    public function test_ranking_and_winner(): void
    {
        $this->actingAsAdmin();
        [$a, $b, $c] = $this->makeParticipants(3);
        $race = $this->makeRace();

        // A valide les boucles 1 et 2, B valide la boucle 1, C abandonne (DNF boucle 1)
        LoopArrival::create(['race_id' => $race->id, 'participant_id' => $a->id, 'loop_number' => 1, 'arrived_at' => '2026-09-12 08:50:00']);
        LoopArrival::create(['race_id' => $race->id, 'participant_id' => $a->id, 'loop_number' => 2, 'arrived_at' => '2026-09-12 09:55:00']);
        LoopArrival::create(['race_id' => $race->id, 'participant_id' => $b->id, 'loop_number' => 1, 'arrived_at' => '2026-09-12 08:52:00']);
        LoopArrival::create(['race_id' => $race->id, 'participant_id' => $c->id, 'loop_number' => 1, 'is_dnf' => true]);

        // Boucle 3 terminée : A n'est pas revenu → tout le monde est arrêté, la course est finie
        Carbon::setTestNow('2026-09-12 11:05:00');
        $json = $this->getJson('/api/race')->assertOk()->json();

        $this->assertSame('finished', $json['race']['status']);

        [$first, $second, $third] = $json['participants'];
        $this->assertSame($a->id, $first['id']);
        $this->assertSame(1, $first['rank']);
        $this->assertSame(2, $first['loops_completed']);
        $this->assertTrue($first['is_winner']);

        $this->assertSame($b->id, $second['id']);
        $this->assertSame(2, $second['rank']);

        $this->assertSame($c->id, $third['id']);
        $this->assertSame(3, $third['rank']);
        $this->assertSame('dnf', $third['status']);

        $this->assertSame($a->id, $json['stats']['winner']['id']);
        $this->assertSame(2, $json['stats']['winner']['loops']);
    }

    public function test_tie_on_loops_is_ranked_by_cumulative_time(): void
    {
        $this->actingAsAdmin();
        [$a, $b] = $this->makeParticipants(2);
        $race = $this->makeRace();

        // Même nombre de boucles, B plus rapide au cumul
        LoopArrival::create(['race_id' => $race->id, 'participant_id' => $a->id, 'loop_number' => 1, 'arrived_at' => '2026-09-12 08:58:00']);
        LoopArrival::create(['race_id' => $race->id, 'participant_id' => $b->id, 'loop_number' => 1, 'arrived_at' => '2026-09-12 08:41:00']);

        Carbon::setTestNow('2026-09-12 10:05:00'); // boucle 2 fermée, personne n'est revenu
        $json = $this->getJson('/api/race')->json();

        $this->assertSame($b->id, $json['participants'][0]['id']);
        $this->assertSame(1, $json['participants'][0]['rank']);
        $this->assertSame($a->id, $json['participants'][1]['id']);
        $this->assertSame(2, $json['participants'][1]['rank']);

        // Deux éliminés au même nombre de boucles : pas de vainqueur unique... si !
        // B a un meilleur cumul → rang 1 unique → dernier survivant
        $this->assertSame($b->id, $json['stats']['winner']['id']);
    }

    public function test_finisher_of_all_loops(): void
    {
        $this->actingAsAdmin();
        [$p] = $this->makeParticipants(1);
        $race = Race::create([
            'name' => 'Mini', 'start_at' => '2026-09-12 08:00:00',
            'loop_distance_km' => 6.706, 'loop_duration_minutes' => 60, 'max_loops' => 2,
        ]);

        LoopArrival::create(['race_id' => $race->id, 'participant_id' => $p->id, 'loop_number' => 1, 'arrived_at' => '2026-09-12 08:50:00']);
        LoopArrival::create(['race_id' => $race->id, 'participant_id' => $p->id, 'loop_number' => 2, 'arrived_at' => '2026-09-12 09:51:00']);

        Carbon::setTestNow('2026-09-12 09:52:00');
        $json = $this->getJson('/api/race')->json();

        $this->assertSame('finisher', $json['participants'][0]['status']);
        $this->assertSame('finished', $json['race']['status']);
        $this->assertTrue($json['participants'][0]['is_winner']);
    }

    public function test_utc_dates_are_converted_to_app_timezone(): void
    {
        $this->actingAsAdmin();
        [$p] = $this->makeParticipants(1);

        // Le front envoie de l'ISO UTC : 06:00Z = 08:00 Europe/Paris (heure d'été)
        $this->putJson('/api/admin/race', [
            'start_at' => '2026-09-12T06:00:00.000Z',
        ])->assertOk()->assertJsonPath('race.start_at', '2026-09-12T08:00:00+02:00');

        Carbon::setTestNow('2026-09-12 08:55:00');
        $response = $this->postJson('/api/admin/race/arrivals', [
            'participant_id' => $p->id,
            'loop_number'    => 1,
            'arrived_at'     => '2026-09-12T06:50:00.000Z', // = 08:50 heure de Paris
        ])->assertOk();

        // 50 minutes de temps de boucle : la conversion de fuseau est correcte
        $this->assertSame(3000, $response->json('participants.0.total_seconds'));
        $this->assertSame('valid', $response->json('participants.0.loops.0.state'));
    }

    public function test_reset_clears_arrivals_but_keeps_params(): void
    {
        $this->actingAsAdmin();
        [$p] = $this->makeParticipants(1);
        $race = $this->makeRace();
        LoopArrival::create(['race_id' => $race->id, 'participant_id' => $p->id, 'loop_number' => 1, 'arrived_at' => '2026-09-12 08:50:00']);

        $this->postJson('/api/admin/race/reset')->assertOk();

        $this->assertDatabaseCount('loop_arrivals', 0);
        $this->assertDatabaseCount('races', 1);
    }
}
