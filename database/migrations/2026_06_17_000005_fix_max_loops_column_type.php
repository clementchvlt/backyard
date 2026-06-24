<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('race_sessions', function (Blueprint $table) {
            // tinyInteger (max 255) était trop petit pour des boucles courtes (ex: 1 min → 660 boucles)
            $table->unsignedSmallInteger('max_loops')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('race_sessions', function (Blueprint $table) {
            $table->unsignedTinyInteger('max_loops')->nullable()->change();
        });
    }
};
