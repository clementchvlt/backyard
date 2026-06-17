<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ParticipantController;
use App\Http\Controllers\Api\RaceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Routes réservées aux admins
    Route::middleware(\App\Http\Middleware\IsAdmin::class)->group(function () {
        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::apiResource('/admin/participants', ParticipantController::class);

        // Race management
        Route::prefix('admin/race')->group(function () {
            Route::get('/', [RaceController::class, 'status']);
            Route::get('/loops/{loop}', [RaceController::class, 'loopDetail']);
            Route::post('/schedule', [RaceController::class, 'schedule']);
            Route::delete('/schedule', [RaceController::class, 'cancelSchedule']);
            Route::post('/start', [RaceController::class, 'start']);
            Route::post('/next-loop', [RaceController::class, 'nextLoop']);
            Route::post('/reopen', [RaceController::class, 'reopen']);
            Route::post('/reset', [RaceController::class, 'reset']);
            Route::post('/participants/{participant}/finish', [RaceController::class, 'finish']);
            Route::post('/participants/{participant}/dnf', [RaceController::class, 'dnf']);
            Route::post('/participants/{participant}/restore', [RaceController::class, 'restore']);
        });
    });
});
