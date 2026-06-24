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

Route::redirect('/admin', '/admin/dashboard')->name('admin');
Route::get('/admin/dashboard', fn () => Inertia::render('AdminPortal', ['section' => 'dashboard']))->name('admin.dashboard');
Route::get('/admin/participants', fn () => Inertia::render('AdminPortal', ['section' => 'participants']))->name('admin.participants');
Route::get('/admin/course', fn () => Inertia::render('AdminPortal', ['section' => 'course']))->name('admin.course');
Route::get('/admin/reglages', fn () => Inertia::render('AdminPortal', ['section' => 'reglages']))->name('admin.reglages');

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
