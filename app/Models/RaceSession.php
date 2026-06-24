<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RaceSession extends Model
{
    protected $fillable = ['name', 'started_at', 'scheduled_start_at', 'loop_duration_minutes', 'max_loops', 'status'];

    protected function casts(): array
    {
        return [
            'started_at'           => 'datetime',
            'scheduled_start_at'   => 'datetime',
            'max_loops'            => 'integer',
            'loop_duration_minutes' => 'integer',
        ];
    }

    public function loops(): HasMany
    {
        return $this->hasMany(RaceLoop::class);
    }
}
