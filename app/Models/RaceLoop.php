<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RaceLoop extends Model
{
    protected $fillable = ['race_session_id', 'loop_number', 'started_at'];

    protected function casts(): array
    {
        return ['started_at' => 'datetime'];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(RaceSession::class, 'race_session_id');
    }

    public function results(): HasMany
    {
        return $this->hasMany(LoopResult::class);
    }
}
