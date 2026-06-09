<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('accueil');

Route::get('/parcours', function () {
    return Inertia::render('Parcours');
})->name('parcours');

Route::get('/informations', function () {
    return Inertia::render('Informations');
})->name('informations');

Route::get('/resultats', function () {
    return Inertia::render('Resultats');
})->name('resultats');

Route::get('/contact', function () {
    return Inertia::render('Contact');
})->name('contact');

Route::get('/connexion', function () {
    return Inertia::render('LoginPage');
})->name('connexion');

Route::get('/admin', function () {
    return Inertia::render('AdminPortal');
})->name('admin');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
