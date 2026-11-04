<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('visites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->restrictOnDelete();
            $table->foreignId('employe_id')->constrained('employes')->restrictOnDelete();
            $table->foreignId('service_id')->constrained('services')->restrictOnDelete();
            $table->dateTime('date_visite')->index();
            // Prix figé au moment de la visite (le tarif du service peut évoluer ensuite)
            $table->decimal('prix', 12, 2);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('factures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visite_id')->unique()->constrained('visites')->cascadeOnDelete();
            $table->string('numero')->nullable()->unique();
            $table->date('date_facture');
            $table->decimal('montant_total', 12, 2);
            $table->timestamps();
        });

        Schema::create('paiements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('visite_id')->constrained('visites')->cascadeOnDelete();
            $table->decimal('montant', 12, 2);
            $table->string('mode_paiement');
            $table->date('date_paiement')->index();
            $table->string('reference')->nullable(); // n° de transaction mobile money, etc.
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('paiements');
        Schema::dropIfExists('factures');
        Schema::dropIfExists('visites');
    }
};
