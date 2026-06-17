<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('race_sessions', function (Blueprint $table) {
            $table->timestamp('scheduled_start_at')->nullable()->after('started_at');
            $table->unsignedTinyInteger('max_loops')->nullable()->after('loop_duration_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('race_sessions', function (Blueprint $table) {
            $table->dropColumn(['scheduled_start_at', 'max_loops']);
        });
    }
};
