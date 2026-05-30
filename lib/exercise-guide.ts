// Curated execution guide for the built-in exercise catalog.
// Keyed by exercise name (matches the seeded global exercises). Original,
// concise how-to content — steps, form cues, and the muscles worked.

export type Guide = {
  steps: string[];
  cues: string[];
  secondary: string[];
};

export const EXERCISE_GUIDE: Record<string, Guide> = {
  "Bench Press": {
    steps: [
      "Lie back with eyes under the bar; grip slightly wider than shoulders.",
      "Unrack, lower the bar to mid-chest with elbows ~45° to your torso.",
      "Touch the chest under control, then press the bar back up over the shoulders.",
    ],
    cues: ["Keep shoulder blades pinched and feet planted", "Slight arch, hips on the bench", "Drive through the floor"],
    secondary: ["Triceps", "Shoulders"],
  },
  "Incline Bench Press": {
    steps: [
      "Set the bench to 30–45°; grip just outside shoulder width.",
      "Lower the bar to the upper chest / collarbone line.",
      "Press up and slightly back until elbows lock out.",
    ],
    cues: ["Don't flare elbows fully", "Keep wrists stacked over elbows", "Control the descent"],
    secondary: ["Shoulders", "Triceps"],
  },
  "Dumbbell Press": {
    steps: [
      "Sit with dumbbells on your thighs, then kick them up as you lie back.",
      "Press the dumbbells up until they nearly touch over the chest.",
      "Lower until you feel a stretch across the chest, elbows ~45°.",
    ],
    cues: ["Keep a neutral wrist", "Bigger range than a barbell — use it", "Control, don't bounce"],
    secondary: ["Triceps", "Shoulders"],
  },
  "Cable Fly": {
    steps: [
      "Set pulleys around chest height; grab a handle in each hand.",
      "Step forward with a soft elbow bend and a slight forward lean.",
      "Bring the handles together in front of you, squeezing the chest.",
    ],
    cues: ["Lead with the elbows", "Keep the bend fixed — it's a hug, not a press", "Slow on the way back"],
    secondary: ["Shoulders"],
  },
  "Push-up": {
    steps: [
      "Hands slightly wider than shoulders, body in a straight line.",
      "Lower your chest toward the floor, elbows ~45°.",
      "Press back up to full lockout without sagging the hips.",
    ],
    cues: ["Brace your core", "Don't let the hips drop", "Full range each rep"],
    secondary: ["Triceps", "Shoulders", "Core"],
  },
  Deadlift: {
    steps: [
      "Bar over mid-foot; hinge and grip just outside the knees.",
      "Drop hips, chest up, take the slack out of the bar.",
      "Drive the floor away and stand tall, then lower under control.",
    ],
    cues: ["Flat back — neutral spine", "Bar stays close to the legs", "Lock out with glutes, not the lower back"],
    secondary: ["Glutes", "Hamstrings", "Quads", "Core"],
  },
  "Pull-up": {
    steps: [
      "Hang from the bar with hands just wider than shoulders.",
      "Pull your chest toward the bar, driving elbows down.",
      "Lower all the way to a full hang under control.",
    ],
    cues: ["Start by depressing the shoulder blades", "Lead with the chest", "No kipping for strict reps"],
    secondary: ["Biceps", "Shoulders", "Core"],
  },
  "Barbell Row": {
    steps: [
      "Hinge to ~45°, bar hanging at arm's length.",
      "Row the bar to the lower ribs / upper stomach.",
      "Lower under control without standing up.",
    ],
    cues: ["Keep the torso angle fixed", "Squeeze shoulder blades together", "Don't yank with the lower back"],
    secondary: ["Biceps", "Shoulders", "Hamstrings"],
  },
  "Lat Pulldown": {
    steps: [
      "Grip the bar wider than shoulders; secure your thighs under the pad.",
      "Pull the bar to your upper chest, driving elbows down and back.",
      "Return to a full stretch overhead under control.",
    ],
    cues: ["Lead with the elbows, not the hands", "Slight lean back, then stay still", "Full stretch at the top"],
    secondary: ["Biceps", "Shoulders"],
  },
  "Seated Cable Row": {
    steps: [
      "Sit tall, feet braced, slight bend in the knees.",
      "Pull the handle to your stomach, driving elbows back.",
      "Let the weight stretch your back forward, then repeat.",
    ],
    cues: ["Chest up, don't round the back", "Squeeze the shoulder blades", "Avoid heaving with the torso"],
    secondary: ["Biceps", "Shoulders"],
  },
  "Overhead Press": {
    steps: [
      "Bar on the front delts, grip just outside shoulders.",
      "Brace, then press the bar overhead, moving the head back slightly.",
      "Lock out with the bar over the mid-foot; lower under control.",
    ],
    cues: ["Squeeze glutes, don't lean back excessively", "Bar path stays close to the face", "Full lockout overhead"],
    secondary: ["Triceps", "Core"],
  },
  "Lateral Raise": {
    steps: [
      "Dumbbells at your sides, soft bend in the elbows.",
      "Raise them out to the sides until just below shoulder height.",
      "Lower slowly with control.",
    ],
    cues: ["Lead with the elbows", "Don't shrug or swing", "Pour-the-jug pinky-up at the top"],
    secondary: ["Shoulders"],
  },
  "Rear Delt Fly": {
    steps: [
      "Hinge forward or set the cables high; soft elbow bend.",
      "Open the arms out and back, squeezing the rear delts.",
      "Return slowly without letting the shoulders roll forward.",
    ],
    cues: ["Lead with the pinkies", "Keep the neck relaxed", "Small weight, strict form"],
    secondary: ["Back"],
  },
  "Back Squat": {
    steps: [
      "Bar on the upper traps, feet shoulder-width, toes slightly out.",
      "Brace, break at the hips and knees together, sit down between the legs.",
      "Hit at least parallel, then drive up through the whole foot.",
    ],
    cues: ["Knees track over the toes", "Chest up, neutral spine", "Drive the floor away"],
    secondary: ["Glutes", "Hamstrings", "Core"],
  },
  "Front Squat": {
    steps: [
      "Bar on the front delts, elbows high, fingertips under the bar.",
      "Brace and squat straight down with an upright torso.",
      "Drive up keeping the elbows high.",
    ],
    cues: ["Elbows up — don't let them drop", "Stay tall through the torso", "Full-foot drive"],
    secondary: ["Glutes", "Core"],
  },
  "Leg Press": {
    steps: [
      "Feet shoulder-width on the platform, back flat against the pad.",
      "Lower the platform until knees reach ~90° or a bit deeper.",
      "Press back up without locking the knees harshly.",
    ],
    cues: ["Don't let the lower back round off the pad", "Knees track over toes", "Controlled tempo"],
    secondary: ["Glutes", "Hamstrings"],
  },
  "Leg Extension": {
    steps: [
      "Sit with the pad on the lower shins, knees at the pivot.",
      "Extend the knees until the legs are straight.",
      "Lower under control without dropping the weight.",
    ],
    cues: ["Squeeze the quads at the top", "Don't swing or use momentum", "Slow negative"],
    secondary: [],
  },
  "Romanian Deadlift": {
    steps: [
      "Stand tall with the bar at the hips, knees softly bent.",
      "Push the hips back, lowering the bar along the thighs.",
      "Feel the hamstring stretch, then drive the hips forward to stand.",
    ],
    cues: ["Hips back, not down", "Bar stays against the legs", "Neutral spine throughout"],
    secondary: ["Glutes", "Back"],
  },
  "Lying Leg Curl": {
    steps: [
      "Lie face down, pad on the lower calves / Achilles.",
      "Curl the heels toward the glutes.",
      "Lower slowly to full extension.",
    ],
    cues: ["Keep the hips down on the pad", "Squeeze at the top", "Control the negative"],
    secondary: ["Calves"],
  },
  "Hip Thrust": {
    steps: [
      "Upper back on a bench, bar across the hips.",
      "Drive through the heels to lift the hips to full extension.",
      "Squeeze the glutes hard, then lower under control.",
    ],
    cues: ["Ribs down, posterior pelvic tilt at the top", "Chin tucked", "Full lockout, don't hyperextend the back"],
    secondary: ["Hamstrings", "Quads"],
  },
  "Barbell Curl": {
    steps: [
      "Stand tall, shoulder-width grip, elbows at your sides.",
      "Curl the bar up by flexing the elbows.",
      "Lower fully under control.",
    ],
    cues: ["Keep the elbows pinned", "No swinging or leaning back", "Full stretch at the bottom"],
    secondary: ["Back"],
  },
  "Dumbbell Curl": {
    steps: [
      "Dumbbells at your sides, palms forward (or rotating).",
      "Curl one or both up, supinating the wrist.",
      "Lower slowly to full extension.",
    ],
    cues: ["Squeeze at the top", "Elbows stay still", "Control the negative"],
    secondary: [],
  },
  "Hammer Curl": {
    steps: [
      "Hold the dumbbells with a neutral (palms-facing) grip.",
      "Curl up keeping the thumbs up the whole way.",
      "Lower under control.",
    ],
    cues: ["Neutral wrist throughout", "No swing", "Targets the brachialis and forearms"],
    secondary: ["Forearms"],
  },
  "Tricep Pushdown": {
    steps: [
      "Grab the bar/rope at a high pulley, elbows at your sides.",
      "Push down until the arms are fully straight.",
      "Return under control to ~90° at the elbow.",
    ],
    cues: ["Pin the elbows to your ribs", "Squeeze the triceps at lockout", "Don't lean over the bar"],
    secondary: [],
  },
  "Skull Crusher": {
    steps: [
      "Lie back, press the bar/EZ-bar over the chest.",
      "Bend the elbows to lower the bar toward the forehead.",
      "Extend back up without moving the upper arms.",
    ],
    cues: ["Keep the upper arms vertical and still", "Control near the head", "Full lockout at the top"],
    secondary: [],
  },
  Dip: {
    steps: [
      "Support yourself on parallel bars, arms straight.",
      "Lower by bending the elbows until the upper arms are parallel.",
      "Press back up to lockout.",
    ],
    cues: ["Slight forward lean for chest, upright for triceps", "Don't shrug into the shoulders", "Control the depth"],
    secondary: ["Chest", "Shoulders"],
  },
  Plank: {
    steps: [
      "Forearms under the shoulders, body in a straight line.",
      "Brace the core and squeeze the glutes.",
      "Hold without letting the hips sag or pike.",
    ],
    cues: ["Ribs down, posterior tilt", "Squeeze everything", "Breathe steadily"],
    secondary: ["Shoulders", "Glutes"],
  },
  "Hanging Leg Raise": {
    steps: [
      "Hang from a bar with a controlled grip.",
      "Raise the legs (bent or straight) toward parallel or higher.",
      "Lower slowly without swinging.",
    ],
    cues: ["Curl the pelvis up, don't just hip-flex", "No swinging — strict reps", "Control the descent"],
    secondary: ["Hamstrings"],
  },
  "Calf Raise": {
    steps: [
      "Balls of the feet on a step / platform, heels free.",
      "Rise up onto the toes as high as possible.",
      "Lower the heels below the platform for a full stretch.",
    ],
    cues: ["Pause at the top", "Big stretch at the bottom", "Slow, controlled reps"],
    secondary: [],
  },
};

export function guideFor(name: string): Guide | null {
  return EXERCISE_GUIDE[name] ?? null;
}
