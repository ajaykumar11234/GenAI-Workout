const API_URL = "http://127.0.0.1:5000";

export async function fetchExercises() {
  const res = await fetch(`${API_URL}/exercises`);
  return res.json();
}
