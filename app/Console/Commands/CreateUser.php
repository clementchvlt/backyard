<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateUser extends Command
{
    protected $signature = 'user:create
        {--name= : Nom de l\'utilisateur}
        {--email= : Adresse e-mail}
        {--password= : Mot de passe (sinon demandé de façon masquée)}
        {--admin : Donner les droits administrateur}';

    protected $description = 'Crée un utilisateur, avec l\'option --admin pour un administrateur';

    public function handle(): int
    {
        $name     = $this->option('name') ?: $this->ask('Nom');
        $email    = $this->option('email') ?: $this->ask('Adresse e-mail');
        $password = $this->option('password') ?: $this->secret('Mot de passe (min. 8 caractères)');
        $isAdmin  = (bool) $this->option('admin');

        $validator = Validator::make(
            compact('name', 'email', 'password'),
            [
                'name'     => 'required|string|max:255',
                'email'    => 'required|email|max:255|unique:users,email',
                'password' => 'required|string|min:8',
            ],
            [
                'email.unique' => 'Un utilisateur avec cet e-mail existe déjà.',
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::create([
            'name'     => $name,
            'email'    => $email,
            'password' => $password, // hashé automatiquement (cast "hashed")
            'is_admin' => $isAdmin,
        ]);

        $this->info(sprintf(
            'Utilisateur #%d créé : %s <%s>%s',
            $user->id,
            $user->name,
            $user->email,
            $isAdmin ? ' [ADMIN]' : ''
        ));

        return self::SUCCESS;
    }
}
