<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Participant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ParticipantController extends Controller
{
    public function index()
    {
        return response()->json(
            Participant::orderBy('bib_number')->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name'      => 'required|string|max:100',
            'last_name'       => 'required|string|max:100',
            'date_of_birth'   => 'nullable|date|before:today',
            'profile_picture' => 'nullable|image|max:2048',
            'bib_number'      => 'required|integer|min:1|unique:participants,bib_number',
        ]);

        if ($request->hasFile('profile_picture')) {
            $validated['profile_picture'] = $request->file('profile_picture')
                ->store('participants', 'public');
        }

        return response()->json(Participant::create($validated), 201);
    }

    public function show(Participant $participant)
    {
        return response()->json($participant);
    }

    public function update(Request $request, Participant $participant)
    {
        $validated = $request->validate([
            'first_name'      => 'required|string|max:100',
            'last_name'       => 'required|string|max:100',
            'date_of_birth'   => 'nullable|date|before:today',
            'profile_picture' => 'nullable|image|max:2048',
            'bib_number'      => [
                'required', 'integer', 'min:1',
                Rule::unique('participants', 'bib_number')->ignore($participant->id),
            ],
        ]);

        if ($request->hasFile('profile_picture')) {
            if ($participant->profile_picture) {
                Storage::disk('public')->delete($participant->profile_picture);
            }
            $validated['profile_picture'] = $request->file('profile_picture')
                ->store('participants', 'public');
        }

        $participant->update($validated);

        return response()->json($participant->fresh());
    }

    public function destroy(Participant $participant)
    {
        if ($participant->profile_picture) {
            Storage::disk('public')->delete($participant->profile_picture);
        }

        $participant->delete();

        return response()->json(null, 204);
    }
}
