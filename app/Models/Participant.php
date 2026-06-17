<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Participant extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'last_name',
        'date_of_birth',
        'profile_picture',
        'bib_number',
    ];

    protected $appends = ['profile_picture_url'];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date:Y-m-d',
            'bib_number'    => 'integer',
        ];
    }

    protected function profilePictureUrl(): Attribute
    {
        return Attribute::make(
            get: fn (mixed $value, array $attributes) => isset($attributes['profile_picture']) && $attributes['profile_picture']
                ? '/storage/' . $attributes['profile_picture']
                : null,
        );
    }
}
