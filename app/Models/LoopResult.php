<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoopResult extends Model
{
    protected $fillable = ['race_loop_id', 'participant_id', 'status', 'finished_at'];

    protected function casts(): array
    {
        return ['finished_at' => 'datetime'];
    }

    public function raceLoop(): BelongsTo
    {
        return $this->belongsTo(RaceLoop::class);
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(Participant::class);
    }
}
