<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\CongeController;
use App\Http\Controllers\Api\DepenseController;
use App\Http\Controllers\Api\EmployeController;
use App\Http\Controllers\Api\FactureController;
use App\Http\Controllers\Api\PaiementController;
use App\Http\Controllers\Api\RapportController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VisiteController;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // ---- Personnel du salon (admin + réception) ----
    Route::get('clients-anniversaires', [ClientController::class, 'anniversaires']);
    Route::apiResource('clients', ClientController::class)->except('destroy');

    Route::apiResource('services', ServiceController::class)->only(['index', 'show']);
    Route::apiResource('employes', EmployeController::class)->only(['index', 'show']);
    Route::apiResource('conges', CongeController::class)->only(['index', 'show']);

    Route::apiResource('visites', VisiteController::class)->except('destroy');
    Route::apiResource('factures', FactureController::class)->only(['index', 'show']);
    Route::apiResource('paiements', PaiementController::class)->except(['update', 'destroy']);

    // ---- Administration (admin uniquement) ----
    Route::middleware(RoleMiddleware::class.':admin')->group(function () {
        Route::apiResource('users', UserController::class);

        Route::apiResource('employes', EmployeController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('services', ServiceController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('conges', CongeController::class)->only(['store', 'update', 'destroy']);
        Route::apiResource('depenses', DepenseController::class);

        Route::delete('clients/{client}', [ClientController::class, 'destroy']);
        Route::delete('visites/{visite}', [VisiteController::class, 'destroy']);
        Route::delete('paiements/{paiement}', [PaiementController::class, 'destroy']);

        Route::prefix('rapports')->group(function () {
            Route::get('dashboard', [RapportController::class, 'dashboard']);
            Route::get('jour', [RapportController::class, 'jour']);
            Route::get('mensuel', [RapportController::class, 'mensuel']);
            Route::get('annuel', [RapportController::class, 'annuel']);
            Route::get('employes', [RapportController::class, 'employes']);
            Route::get('clients-fideles', [RapportController::class, 'clientsFideles']);
        });
    });
});
