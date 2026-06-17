<?php

use App\Console\Commands\RaceAutoAdvance;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Vérifie chaque minute si une course doit démarrer ou avancer automatiquement
Schedule::command(RaceAutoAdvance::class)->everyMinute()->withoutOverlapping();
