<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // participants.bib_number is already unique (indexed).
        // users.email is already unique (indexed).
        // Add an index on participants.created_at to speed up
        // any ORDER BY / range queries on that column.
        Schema::table('participants', function (Blueprint $table) {
            $table->index('created_at', 'participants_created_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropIndex('participants_created_at_index');
        });
    }
};
