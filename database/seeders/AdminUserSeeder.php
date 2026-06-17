<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@backyard.fr'],
            [
                'name' => 'Administrateur',
                'password' => bcrypt('admin1234'),
                'is_admin' => true,
            ]
        );
    }
}
