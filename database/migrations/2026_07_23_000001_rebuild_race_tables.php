<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Ancien système (machine à états) supprimé
        Schema::dropIfExists('loop_results');
        Schema::dropIfExists('race_loops');
        Schema::dropIfExists('race_sessions');

        // Paramètres de la course (équivalent de l'onglet "Tableau de bord" de l'Excel)
        Schema::create('races', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('Backyard des Mools 2026');
            $table->dateTime('start_at')->nullable();          // Heure de départ (boucle 1)
            $table->decimal('loop_distance_km', 6, 3)->default(6.706);
            $table->unsignedSmallInteger('loop_duration_minutes')->default(60);
            $table->unsignedSmallInteger('max_loops')->default(12);
            $table->timestamps();
        });

        // Une cellule de la grille Excel : heure d'arrivée (ou DNF) par participant × boucle.
        // Tout le reste (temps, hors délai, éliminations, classement) est calculé.
        Schema::create('loop_arrivals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('race_id')->constrained()->cascadeOnDelete();
            $table->foreignId('participant_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('loop_number');
            $table->dateTime('arrived_at')->nullable();
            $table->boolean('is_dnf')->default(false);
            $table->timestamps();

            $table->unique(['race_id', 'participant_id', 'loop_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loop_arrivals');
        Schema::dropIfExists('races');
    }
};
