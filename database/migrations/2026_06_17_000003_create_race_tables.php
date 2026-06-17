<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('race_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->default('Backyard des Mools 2026');
            $table->timestamp('started_at')->nullable();
            $table->unsignedTinyInteger('loop_duration_minutes')->default(60);
            $table->string('status')->default('pending'); // pending | active | finished
            $table->timestamps();
        });

        Schema::create('race_loops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('race_session_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('loop_number');
            $table->timestamp('started_at');
            $table->timestamps();
        });

        Schema::create('loop_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('race_loop_id')->constrained()->cascadeOnDelete();
            $table->foreignId('participant_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('running'); // running | finished | dnf
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->unique(['race_loop_id', 'participant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loop_results');
        Schema::dropIfExists('race_loops');
        Schema::dropIfExists('race_sessions');
    }
};
