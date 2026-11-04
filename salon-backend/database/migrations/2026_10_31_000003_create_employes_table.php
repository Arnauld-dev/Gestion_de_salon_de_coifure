<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employes', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('prenom');
            $table->string('telephone')->nullable();
            $table->string('adresse')->nullable();
            $table->string('poste');
            $table->string('specialites')->nullable();
            $table->string('horaires')->nullable();
            // salaire_fixe : montant mensuel | commission : taux entre 0 et 1 (0.30 = 30 %)
            $table->string('type_remuneration')->default('commission');
            $table->decimal('salaire_ou_commission', 12, 2)->default(0);
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });

        Schema::create('conges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employe_id')->constrained('employes')->cascadeOnDelete();
            $table->date('date_debut');
            $table->date('date_fin');
            $table->string('motif')->nullable();
            $table->timestamps();
            $table->index(['employe_id', 'date_debut', 'date_fin']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conges');
        Schema::dropIfExists('employes');
    }
};
