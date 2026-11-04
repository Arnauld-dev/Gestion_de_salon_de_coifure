<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->string('nom_service')->unique();
            $table->unsignedSmallInteger('duree_minutes');
            $table->decimal('prix', 12, 2);
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });

        Schema::create('employe_service', function (Blueprint $table) {
            $table->foreignId('employe_id')->constrained('employes')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->cascadeOnDelete();
            $table->primary(['employe_id', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employe_service');
        Schema::dropIfExists('services');
    }
};
