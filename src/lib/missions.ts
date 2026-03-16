export interface MissionDef {
  id: string
  name: string
  emoji: string
  difficulty: 'Beginner' | 'Intermediate' | 'Hard' | 'Expert'
  points: number
  type: 'naked_eye' | 'telescope'
  desc: string
  hint: string
}

export const MISSIONS: MissionDef[] = [
  {
    id: 'moon', name: 'The Moon', emoji: '🌕', difficulty: 'Beginner',
    points: 50, type: 'naked_eye',
    desc: 'Observe the lunar surface. Identify at least 3 craters.',
    hint: 'Best viewed during first/last quarter for crater shadow detail.',
  },
  {
    id: 'jupiter', name: 'Jupiter', emoji: '🪐', difficulty: 'Beginner',
    points: 75, type: 'telescope',
    desc: 'Locate Jupiter and observe its Galilean moons.',
    hint: "Look for the bright 'star' that doesn't twinkle.",
  },
  {
    id: 'orion', name: 'Orion Nebula', emoji: '✨', difficulty: 'Intermediate',
    points: 100, type: 'telescope',
    desc: "Find M42 in Orion's sword. Photograph the nebula.",
    hint: "Below the three belt stars — middle 'star' of the sword.",
  },
  {
    id: 'saturn', name: 'Saturn', emoji: '🪐', difficulty: 'Intermediate',
    points: 100, type: 'telescope',
    desc: "Observe Saturn's rings.",
    hint: "Even a small telescope shows rings. Yellowish 'star'.",
  },
  {
    id: 'pleiades', name: 'Pleiades (M45)', emoji: '💫', difficulty: 'Beginner',
    points: 60, type: 'naked_eye',
    desc: 'Locate the Seven Sisters star cluster.',
    hint: 'Fuzzy patch to naked eye. Binoculars show dozens of stars.',
  },
  {
    id: 'andromeda', name: 'Andromeda Galaxy', emoji: '🌌', difficulty: 'Hard',
    points: 175, type: 'telescope',
    desc: 'Locate M31 — the nearest major galaxy at 2.5 million light-years.',
    hint: 'Find the Great Square of Pegasus, then hop two stars NE. Dark skies required.',
  },
  {
    id: 'crab', name: 'Crab Nebula', emoji: '🔭', difficulty: 'Expert',
    points: 250, type: 'telescope',
    desc: 'Capture M1 — the supernova remnant in Taurus.',
    hint: 'Requires at least 8" aperture and dark skies. Located 1° NW of ζ Tauri.',
  },
]

export const DIFFICULTY_CONFIG = {
  Beginner:     { dots: 1, color: 'rgba(255,209,102,0.55)',  label: 'Easy'   },
  Intermediate: { dots: 2, color: 'rgba(255,209,102,0.55)',  label: 'Medium' },
  Hard:         { dots: 4, color: 'rgba(251,113,133,0.7)',   label: 'Hard+'  },
  Expert:       { dots: 5, color: 'rgba(239,68,68,0.8)',     label: 'Expert' },
}
