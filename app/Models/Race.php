<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Race extends Model
{
    protected $fillable = [
        'name',
        'start_at',
        'loop_distance_km',
        'loop_duration_minutes',
        'max_loops',
    ];

    protected function casts(): array
    {
        return [
            'start_at'              => 'datetime',
            'loop_distance_km'      => 'float',
            'loop_duration_minutes' => 'integer',
            'max_loops'             => 'integer',
        ];
    }

    public function arrivals(): HasMany
    {
        return $this->hasMany(LoopArrival::class);
    }
}
