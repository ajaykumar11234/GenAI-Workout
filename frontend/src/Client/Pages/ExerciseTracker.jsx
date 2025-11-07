import React, { useState, useEffect } from "react";
import { Play, Square, RotateCcw, Activity, Target, Flame, Clock, Eye, Zap, Trophy, TrendingUp } from "lucide-react";

const EXERCISES = [
  { id: "bicep_curl", name: "Bicep Curl", icon: "💪", color: "from-blue-500 to-purple-600" },
  { id: "squat", name: "Squat", icon: "🦵", color: "from-green-500 to-teal-600" },
  { id: "pushup", name: "Push-up", icon: "🤲", color: "from-red-500 to-pink-600" }
];

const BASE_URL = "http://localhost:5000";

function App() {
  const [exercise, setExercise] = useState(EXERCISES[0]);
  const [status, setStatus] = useState({});
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workoutSummary, setWorkoutSummary] = useState(null);

  // Fetch status periodically
  useEffect(() => {
    let interval;
    if (running) {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`${BASE_URL}/status`);
          if (response.ok) {
            const data = await response.json();
            setStatus(data);
            setError('');
          }
        } catch (err) {
          setError('Connection lost. Check if the server is running.');
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
      const response = await fetch(`${BASE_URL}/start/${exercise.id}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setRunning(true);
        setWorkoutSummary(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start exercise');
      }
    } catch (err) {
      setError('Cannot connect to server. Make sure it\'s running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const stopExercise = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/stop`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkoutSummary(data.summary);
        setRunning(false);
      }
    } catch (err) {
      setError('Error stopping exercise');
    } finally {
      setLoading(false);
    }
  };

  const resetExercise = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/reset`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setStatus({});
        setWorkoutSummary(null);
        setError('');
      }
    } catch (err) {
      setError('Error resetting exercise');
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = status.target_reps
    ? Math.min((status.reps / status.target_reps) * 100, 100)
    : 0;

  const getQualityColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getFeedbackStyle = (feedback) => {
    if (!feedback) return 'bg-gray-700 text-gray-300';
    
    if (feedback.includes('✅') || feedback.includes('🎉') || feedback.includes('🏆')) {
      return 'bg-gradient-to-r from-green-600 to-green-500 text-white animate-pulse shadow-lg shadow-green-500/30';
    }
    if (feedback.includes('⏱️') || feedback.toLowerCase().includes('rest')) {
      return 'bg-gradient-to-r from-blue-600 to-blue-500 text-white animate-pulse shadow-lg shadow-blue-500/30';
    }
    if (feedback.includes('🔥') || feedback.includes('💪') || feedback.includes('🚀')) {
      return 'bg-gradient-to-r from-orange-600 to-red-500 text-white animate-bounce shadow-lg shadow-orange-500/30';
    }
    if (feedback.includes('⚠️') || feedback.includes('❌')) {
      return 'bg-gradient-to-r from-red-600 to-pink-500 text-white shadow-lg shadow-red-500/30';
    }
    
    return 'bg-gradient-to-r from-purple-600 to-indigo-500 text-white shadow-lg shadow-purple-500/30';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative px-6 py-8">
          <div className="flex items-center justify-center gap-3">
            <Activity className="w-12 h-12 text-white animate-pulse" />
            <h1 className="text-5xl font-extrabold text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-200">
              AI Fitness Trainer
            </h1>
            <Trophy className="w-12 h-12 text-yellow-400 animate-bounce" />
          </div>
          <p className="text-center mt-2 text-gray-200 text-lg font-medium">
            Your Personal AI Workout Companion
          </p>
        </div>
      </div>

      <div className="px-6 py-8">
        {/* Error Display */}
        {error && (
          <div className="max-w-4xl mx-auto mb-6 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 text-center animate-pulse">
            ⚠️ {error}
          </div>
        )}

        {/* Exercise Selection */}
        <div className="max-w-4xl mx-auto mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center text-gray-200">Choose Your Exercise</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {EXERCISES.map((ex) => (
              <button
                key={ex.id}
                onClick={() => setExercise(ex)}
                disabled={running || loading}
                className={`p-6 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl ${
                  exercise.id === ex.id
                    ? `bg-gradient-to-r ${ex.color} text-white shadow-2xl ring-4 ring-white/30`
                    : 'bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white'
                } ${(running || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-2xl'}`}
              >
                <div className="text-4xl mb-2">{ex.icon}</div>
                {ex.name}
              </button>
            ))}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-4 justify-center">
            {!running ? (
              <button
                onClick={startExercise}
                disabled={loading}
                className="flex items-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-6 h-6" />
                {loading ? 'Starting...' : 'Start Workout'}
              </button>
            ) : (
              <button
                onClick={stopExercise}
                disabled={loading}
                className="flex items-center gap-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Square className="w-6 h-6" />
                {loading ? 'Stopping...' : 'Stop Workout'}
              </button>
            )}

            <button
              onClick={resetExercise}
              disabled={running || loading}
              className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="w-6 h-6" />
              {loading ? 'Resetting...' : 'Reset'}
            </button>
          </div>
        </div>

        {/* Workout Summary */}
        {workoutSummary && (
          <div className="max-w-4xl mx-auto mb-8 p-6 bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-2xl border border-green-500/30 shadow-2xl">
            <h3 className="text-2xl font-bold mb-4 text-center text-green-400">🎉 Workout Complete! 🎉</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-3xl font-bold text-green-400">{workoutSummary.total_reps}</p>
                <p className="text-gray-300">Quality Reps</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-3xl font-bold text-yellow-400">{workoutSummary.best_quality}</p>
                <p className="text-gray-300">Best Quality</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-3xl font-bold text-red-400">{workoutSummary.calories}</p>
                <p className="text-gray-300">Calories</p>
              </div>
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-3xl font-bold text-blue-400">{Math.floor(workoutSummary.time / 60)}:{(workoutSummary.time % 60).toString().padStart(2, '0')}</p>
                <p className="text-gray-300">Duration</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Dashboard */}
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-8">
          {/* Video Feed */}
          <div className="flex-1 bg-slate-800/50 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-slate-700/50">
            <h3 className="text-xl font-bold mb-4 text-center text-gray-200 flex items-center justify-center gap-2">
              <Eye className="w-6 h-6" />
              Live Camera Feed
            </h3>
            <div className="relative">
              {running ? (
                <img
                  src={`${BASE_URL}/video_feed`}
                  alt="Live Feed"
                  className="w-full h-96 object-cover rounded-2xl border-4 border-slate-600 shadow-xl"
                  onError={() => setError('Video feed unavailable. Check camera permissions.')}
                />
              ) : (
                <div className="w-full h-96 flex items-center justify-center text-gray-400 text-2xl rounded-2xl bg-slate-700/50 border-4 border-dashed border-slate-600">
                  <div className="text-center">
                    <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Camera feed will appear here</p>
                    <p className="text-lg text-gray-500 mt-2">Start a workout to begin</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="flex-1 flex flex-col gap-6">
            {/* Enhanced Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <EnhancedStatCard 
                title="Correct Reps" 
                value={status.reps || 0} 
                icon={<Target className="w-8 h-8" />}
                color="text-green-400"
                bgGradient="from-green-500/20 to-emerald-500/20"
              />
              <EnhancedStatCard 
                title="Sets" 
                value={`${status.set || 0}/${status.total_sets || 0}`} 
                icon={<TrendingUp className="w-8 h-8" />}
                color="text-blue-400"
                bgGradient="from-blue-500/20 to-cyan-500/20"
              />
              <EnhancedStatCard 
                title="Calories" 
                value={status.calories || 0} 
                icon={<Flame className="w-8 h-8" />}
                color="text-red-400"
                bgGradient="from-red-500/20 to-pink-500/20"
              />
              {/* <EnhancedStatCard 
                title="Quality" 
                value={`${status.quality_score || 0}/100`} 
                icon={<Trophy className="w-8 h-8" />}
                color={getQualityColor(status.quality_score || 0)}
                bgGradient="from-yellow-500/20 to-orange-500/20"
              /> */}
              {/* <EnhancedStatCard 
                title="Time" 
                value={`${Math.floor((status.time || 0) / 60)}:${((status.time || 0) % 60).toString().padStart(2, '0')}`} 
                icon={<Clock className="w-8 h-8" />}
                color="text-purple-400"
                bgGradient="from-purple-500/20 to-indigo-500/20"
              /> */}
              {/* <EnhancedStatCard 
                title="FPS" 
                value={status.fps || 0} 
                icon={<Zap className="w-8 h-8" />}
                color="text-yellow-400"
                bgGradient="from-yellow-500/20 to-amber-500/20"
              /> */}
            </div>

            {/* Enhanced Progress Section */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50 shadow-xl">
              <h3 className="text-lg font-bold mb-4 text-center text-gray-200">Correct Reps Progress</h3>
              
              {/* Progress Bar */}
              <div className="relative w-full bg-slate-700 rounded-2xl overflow-hidden h-8 shadow-inner mb-4">
                <div
                  className={`h-full bg-gradient-to-r ${exercise.color} transition-all duration-700 ease-out relative`}
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-bold text-white drop-shadow-lg">
                    {Math.floor(progressPercent)}%
                  </span>
                </div>
              </div>

              {/* Rep Progress */}
              <div className="flex justify-between text-sm text-gray-300 mb-4">
                <span>✅ Correct: {status.reps || 0} reps</span>
                <span>🎯 Target: {status.target_reps || 0} reps</span>
              </div>

              {/* Quality Note */}
              <div className="text-center text-xs text-gray-400 mb-4 p-2 bg-slate-700/50 rounded-lg">
                💡 Only reps with good form count towards your progress
              </div>

              {/* Quality Metrics */}
              {status.consecutive_good_reps > 0 && (
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>🔥 Streak: {status.consecutive_good_reps} good reps</span>
                  <span>📊 Total Good: {status.total_good_reps}</span>
                </div>
              )}
            </div>

            {/* Enhanced Feedback Section */}
            <div className={`p-6 rounded-2xl text-center font-bold text-lg transition-all duration-500 shadow-2xl border ${getFeedbackStyle(status.feedback)}`}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Activity className="w-6 h-6 animate-pulse" />
                <span>Coach Feedback</span>
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <p className="text-xl leading-relaxed">
                {status.feedback || "Get ready to start your workout! 💪"}
              </p>
            </div>

            {/* Form Issues Alert */}
            {status.form_issues && status.form_issues.length > 0 && (
              <div className="bg-red-900/50 border border-red-500 rounded-2xl p-4 shadow-xl">
                <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                  ⚠️ Form Issues Detected
                </h4>
                <ul className="list-disc list-inside text-red-200 space-y-1">
                  {status.form_issues.map((issue, index) => (
                    <li key={index} className="text-sm">{issue}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EnhancedStatCard({ title, value, icon, color, bgGradient }) {
  return (
    <div className={`bg-gradient-to-br ${bgGradient} backdrop-blur-sm rounded-2xl shadow-xl p-4 text-center border border-white/10 transition-all duration-300 hover:scale-105 hover:shadow-2xl`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        <div className={color}>{icon}</div>
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">{title}</h3>
      </div>
      <p className={`text-3xl font-bold ${color} drop-shadow-lg`}>{value}</p>
    </div>
  );
}

export default App;