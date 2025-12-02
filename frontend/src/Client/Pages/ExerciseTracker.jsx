import React, { useState, useEffect } from "react";
import { Play, Square, RotateCcw, Activity, Target, Flame } from "lucide-react";
import flaskAPI, { EXERCISES } from "../../services/flaskApi";
import FormScoreDisplay from "../components/FormScoreDisplay";

// Stats Card Component
function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-5 text-center border border-gray-100 transform hover:scale-105 transition-all duration-300">
      <div className="flex flex-col items-center gap-2">
        <div className={`${color} bg-opacity-10 p-3 rounded-full`}>
          <div className={color}>{icon}</div>
        </div>
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</h3>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function App() {
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [status, setStatus] = useState({});
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workoutSummary, setWorkoutSummary] = useState(null);

  // Check Flask server health on mount
  useEffect(() => {
    const checkServer = async () => {
      const isHealthy = await flaskAPI.checkServerHealth();
      if (!isHealthy) {
        setError('Flask server is not running. Please start it on port 5000.');
      }
    };
    checkServer();
  }, []);

  // Fetch status periodically
  useEffect(() => {
    let interval;
    if (running) {
      interval = setInterval(async () => {
        try {
          const data = await flaskAPI.getStatus();
          setStatus(data);
          setError('');
        } catch (err) {
          setError(err.message);
          console.error('Status fetch error:', err);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [running]);

  const startExercise = async () => {
    setLoading(true);
    setError('');
    try {
      await flaskAPI.startExercise(exercise.id);
      setRunning(true);
      setWorkoutSummary(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stopExercise = async () => {
    setLoading(true);
    try {
      const data = await flaskAPI.stopExercise();
      setWorkoutSummary(data.summary);
      setRunning(false);
      
      // Performance data is now automatically saved by Flask to Node.js backend
      console.log('Workout stopped. Data saved automatically by Flask.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetExercise = async () => {
    setLoading(true);
    try {
      await flaskAPI.resetExercise();
      setStatus({});
      setWorkoutSummary(null);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = status.target_reps
    ? Math.min((status.reps / status.target_reps) * 100, 100)
    : 0;

  const getQualityColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-yellow-500';
    if (score >= 50) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200 flex-shrink-0">
        <div className="w-full px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">AI Exercise Tracker</h1>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full h-full px-4 py-4">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-700 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Exercise Selection */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-indigo-600 rounded"></span>
            Select Exercise
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {EXERCISES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setExercise(ex)}
                disabled={running || loading}
                className={`p-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  exercise.id === ex.id
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-xl ring-2 ring-indigo-300'
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 hover:shadow-lg border border-gray-200'
                } ${(running || loading) ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
              >
                <div className="text-3xl mb-2">{ex.icon}</div>
                <div className="text-sm">{ex.name}</div>
              </button>
            ))}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3 justify-center">
            {!running ? (
              <button
                onClick={startExercise}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Play className="w-5 h-5" />
                {loading ? 'Starting...' : 'Start'}
              </button>
            ) : (
              <button
                onClick={stopExercise}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Square className="w-5 h-5" />
                {loading ? 'Stopping...' : 'Stop'}
              </button>
            )}

            <button
              onClick={resetExercise}
              disabled={running || loading}
              className="flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              <RotateCcw className="w-5 h-5" />
              {loading ? 'Resetting...' : 'Reset'}
            </button>
          </div>
        </div>

          {/* Workout Summary */}
          {workoutSummary && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-4 mb-4 shadow-xl">
              <h3 className="text-2xl font-bold text-center text-green-800 mb-4">🎉 Workout Complete! 🏆</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              <div className="bg-white rounded-xl p-3 shadow-md border border-green-100">
                <p className="text-3xl font-bold text-green-600 mb-1">{workoutSummary.total_reps || 0}</p>
                <p className="text-xs font-semibold text-gray-500 uppercase">Reps</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-md border border-yellow-100">
                <p className="text-3xl font-bold text-yellow-600 mb-1">{workoutSummary.best_quality || 0}</p>
                <p className="text-xs font-semibold text-gray-500 uppercase">Best Quality</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-md border border-red-100">
                <p className="text-3xl font-bold text-red-600 mb-1">{workoutSummary.calories || 0}</p>
                <p className="text-xs font-semibold text-gray-500 uppercase">Calories</p>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-md border border-blue-100">
                <p className="text-3xl font-bold text-blue-600 mb-1">
                  {workoutSummary.duration ? `${Math.floor(workoutSummary.duration / 60)}:${(workoutSummary.duration % 60).toString().padStart(2, '0')}` : '0:00'}
                </p>
                <p className="text-xs font-semibold text-gray-500 uppercase">Duration</p>
              </div>
            </div>
            <p className="text-center text-green-700 font-medium mt-3">{workoutSummary.message}</p>
          </div>
        )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-auto">
            {/* Video Feed - Takes 2/3 width */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-indigo-600 rounded"></span>
                Live Camera Feed
              </h3>
              {running ? (
                <img
                  src={flaskAPI.getVideoFeedUrl()}
                  alt="Live Feed"
                  className="w-full h-[calc(100vh-280px)] object-cover rounded-xl border-2 border-indigo-200 shadow-inner"
                onError={() => setError('Video feed unavailable. Check camera permissions.')}
              />
              ) : (
                <div className="w-full h-[calc(100vh-280px)] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-400">
                  <div className="bg-gray-200 p-4 rounded-full inline-block mb-3">
                    <Activity className="w-12 h-12" />
                  </div>
                  <p className="font-medium">Start workout to view camera</p>
                </div>
              </div>
            )}
          </div>

          {/* Stats Panel - Takes 1/3 width */}
          <div className="lg:col-span-1 space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 gap-3">
              <StatCard 
                title="Reps" 
                value={status.reps || 0} 
                icon={<Target className="w-5 h-5" />}
                color="text-green-600"
              />
              <StatCard 
                title="Sets" 
                value={`${status.set || 0}/${status.total_sets || 0}`} 
                icon={<Activity className="w-5 h-5" />}
                color="text-blue-600"
              />
              {/* <StatCard 
                title="Calories" 
                value={status.calories || 0} 
                icon={<Flame className="w-5 h-5" />}
                color="text-red-600"
              /> */}
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-indigo-600 rounded"></span>
                Progress
              </h3>
              <div className="relative w-full bg-gray-200 rounded-full h-8 overflow-hidden mb-3 shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-700 shadow-md"
                  style={{ width: `${progressPercent}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-700 drop-shadow">
                    {Math.floor(progressPercent)}%
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{status.reps || 0} / {status.target_reps || 0} reps</span>
                <span>Target: {status.target_reps || 0}</span>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 shadow-md">
              <h3 className="text-lg font-bold text-indigo-900 mb-2 flex items-center gap-2">
                <span className="w-1 h-5 bg-indigo-600 rounded"></span>
                Real-time Feedback
              </h3>
              <p className="text-indigo-800 font-medium text-base">
                {status.feedback || "Ready to start!"}
              </p>
            </div>

            {/* Form Issues */}
            {status.form_issues && status.form_issues.length > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-md">
                <h4 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                  <span className="text-xl">⚠️</span>
                  Form Issues
                </h4>
                <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
                  {status.form_issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Real-time Form Analysis */}
            {running && status && (
              <FormScoreDisplay formData={status} />
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export default App;