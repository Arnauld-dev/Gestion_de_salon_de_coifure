<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->string('prenom');
            $table->string('telephone')->nullable()->index();
            $table->string('email')->nullable();
            $table->date('date_naissance')->nullable();
            $table->text('preferences')->nullable();
            $table->text('allergies')->nullable();
            $table->timestamps();
            $table->index(['nom', 'prenom']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
