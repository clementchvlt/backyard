<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoopArrival extends Model
{
    protected $fillable = [
        'race_id',
        'participant_id',
        'loop_number',
        'arrived_at',
        'is_dnf',
    ];

    protected function casts(): array
    {
        return [
            'arrived_at'  => 'datetime',
            'is_dnf'      => 'boolean',
            'loop_number' => 'integer',
        ];
    }

    public function race(): BelongsTo
    {
        return $this->belongsTo(Race::class);
    }

    public function participant(): BelongsTo
    {
        return $this->belongsTo(Participant::class);
    }
}
