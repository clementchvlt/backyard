<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ParticipantController;
use App\Http\Controllers\Api\RaceController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);

// Lecture publique : alimente l'onglet Résultats du site (et l'admin)
Route::get('/race', [RaceController::class, 'state']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Routes réservées aux admins
    Route::middleware(\App\Http\Middleware\IsAdmin::class)->group(function () {
        Route::get('/admin/dashboard', [AdminController::class, 'dashboard']);
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::apiResource('/admin/participants', ParticipantController::class);

        // Gestion de course (modèle "Excel" : paramètres + heures d'arrivée)
        Route::prefix('admin/race')->group(function () {
            Route::put('/', [RaceController::class, 'update']);
            Route::post('/arrivals', [RaceController::class, 'storeArrival']);
            Route::post('/arrivals/group', [RaceController::class, 'storeGroupArrival']);
            Route::post('/arrivals/dnf', [RaceController::class, 'storeDnf']);
            Route::delete('/arrivals', [RaceController::class, 'destroyArrival']);
            Route::post('/reset', [RaceController::class, 'reset']);
        });
    });
});
