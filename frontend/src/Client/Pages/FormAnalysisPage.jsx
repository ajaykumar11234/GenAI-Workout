import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, TrendingUp, AlertTriangle, Target, Clock, Zap } from 'lucide-react';
import config from '../../config/config';

const FormAnalysisPage = () => {
  const [selectedExercise, setSelectedExercise] = useState('squat');
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState([]);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);

  const exercises = ['squat', 'pushup', 'bicep_curl'];

  useEffect(() => {
    fetchData();
  }, [selectedExercise]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const headers = { Authorization: `Bearer ${token}` };

      console.log('🔍 Fetching form analysis data for:', selectedExercise);
      console.log('API Base URL:', config.backendUrl);

      // Fetch all data in parallel
      const [historyRes, summaryRes, trendsRes] = await Promise.all([
        axios.get(`${config.backendUrl}/form-analysis/history/${selectedExercise}?limit=10`, { headers }),
        axios.get(`${config.backendUrl}/form-analysis/summary`, { headers }),
        axios.get(`${config.backendUrl}/form-analysis/trends/${selectedExercise}?days=30`, { headers })
      ]);

      console.log('📊 History response:', historyRes.data);
      console.log('📊 Summary response:', summaryRes.data);
      console.log('📊 Trends response:', trendsRes.data);

      setHistory(historyRes?.data?.data?.history || []);
      setSummary(summaryRes?.data?.data || []);
      setTrends(trendsRes?.data?.data || null);
    } catch (error) {
      console.error('❌ Error fetching form analysis:', error);
      console.error('Error details:', error.response?.data);
      setHistory([]);
      setSummary([]);
      setTrends(null);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-blue-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="text-green-500" size={20} />;
    if (trend === 'declining') return <AlertTriangle className="text-red-500" size={20} />;
    return <Activity className="text-gray-500" size={20} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading form analysis...</div>
      </div>
    );
  }

  const latestSession = history[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Form Analysis
          </h1>
          <p className="text-gray-400">Track your form improvements and get AI-powered recommendations</p>
        </div>

        {/* Exercise Selector */}
        <div className="flex gap-4 mb-6">
          {exercises.map((exercise) => (
            <button
              key={exercise}
              onClick={() => setSelectedExercise(exercise)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                selectedExercise === exercise
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {exercise.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        {/* No Data Message */}
        {!latestSession && (
          <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center mb-8">
            <Activity className="mx-auto mb-4 text-gray-600" size={48} />
            <h3 className="text-xl font-semibold mb-2">No Form Analysis Data Yet</h3>
            <p className="text-gray-400 mb-4">
              Complete a workout using the Exercise Tracker to see your form analysis here.
            </p>
            <p className="text-sm text-gray-500">
              Your form scores, injury alerts, and AI recommendations will appear after your first session.
            </p>
          </div>
        )}

        {/* Latest Session Overview */}
        {latestSession && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Overall Score Card */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm font-semibold mb-4">OVERALL FORM SCORE</h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-5xl font-bold ${getScoreColor(latestSession.formScores.overall)}`}>
                    {latestSession.formScores.overall}
                  </div>
                  <div className="text-gray-400 text-sm mt-2">out of 100</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getTrendIcon(latestSession.improvements.trend)}
                  <span className="text-xs text-gray-400 capitalize">{latestSession.improvements.trend}</span>
                </div>
              </div>
              {latestSession.improvements.fromLastSession !== 0 && (
                <div className={`mt-4 text-sm ${latestSession.improvements.fromLastSession > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {latestSession.improvements.fromLastSession > 0 ? '+' : ''}
                  {latestSession.improvements.fromLastSession.toFixed(1)}% from last session
                </div>
              )}
            </div>

            {/* Session Stats */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-gray-400 text-sm font-semibold mb-4">SESSION STATS</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Reps</span>
                  <span className="text-white font-semibold">{latestSession.totalReps}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white font-semibold">{Math.floor(latestSession.sessionDuration / 60)}m {latestSession.sessionDuration % 60}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="text-white font-semibold">{new Date(latestSession.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            {latestSession.aiSuggestions && (
              <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-xl p-6 border border-purple-500">
                <h3 className="text-purple-200 text-sm font-semibold mb-4 flex items-center gap-2">
                  <Zap size={16} />
                  AI RECOMMENDATIONS
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200">Optimal Reps</span>
                    <span className="text-white font-semibold">
                      {latestSession.aiSuggestions.optimalRepRange.min}-{latestSession.aiSuggestions.optimalRepRange.max}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200">Suggested Sets</span>
                    <span className="text-white font-semibold">{latestSession.aiSuggestions.suggestedSets}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-200">Rest Time</span>
                    <span className="text-white font-semibold">{latestSession.aiSuggestions.restTime}s</span>
                  </div>
                  <p className="text-purple-100 text-xs mt-3 italic">"{latestSession.aiSuggestions.reasoning}"</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Form Scores */}
        {latestSession && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <h3 className="text-xl font-bold mb-6">Detailed Form Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(latestSession.formScores).map(([key, score]) => {
                if (key === 'overall') return null;
                return (
                  <div key={key} className="bg-gray-900 rounded-lg p-4">
                    <div className="text-gray-400 text-xs mb-2 uppercase">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {score}
                    </div>
                    <div className="w-full bg-gray-700 h-2 rounded-full mt-2">
                      <div
                        className={`h-2 rounded-full ${getScoreBgColor(score)}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Injury Alerts */}
        {latestSession && latestSession.injuryAlerts.length > 0 && (
          <div className="bg-red-900 bg-opacity-20 border border-red-500 rounded-xl p-6 mb-8">
            <h3 className="text-red-400 text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle size={20} />
              Injury Alerts from Latest Session
            </h3>
            <div className="space-y-3">
              {latestSession.injuryAlerts.map((alert, idx) => (
                <div key={idx} className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      alert.severity === 'critical' ? 'bg-red-600' :
                      alert.severity === 'high' ? 'bg-orange-600' :
                      alert.severity === 'medium' ? 'bg-yellow-600' :
                      'bg-blue-600'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold">{alert.issue}</div>
                      <div className="text-gray-400 text-sm mt-1">{alert.recommendation}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Recommendations */}
        {latestSession && latestSession.recommendations.length > 0 && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 mb-8">
            <h3 className="text-xl font-bold mb-4">Form Improvement Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {latestSession.recommendations.map((rec, idx) => (
                <div key={idx} className="bg-gray-900 rounded-lg p-4 flex items-start gap-3">
                  <div className={`px-2 py-1 rounded text-xs font-bold ${
                    rec.priority === 'high' ? 'bg-red-600' :
                    rec.priority === 'medium' ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}>
                    {rec.priority.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-400 text-xs uppercase mb-1">{rec.category}</div>
                    <div className="text-white">{rec.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold mb-4">Session History</h3>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No workout history for {selectedExercise.replace('_', ' ')} yet.</p>
              <p className="text-sm mt-2">Start a workout to build your history!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((session, idx) => (
              <div key={session._id} className="bg-gray-900 rounded-lg p-4 flex items-center justify-between hover:bg-gray-850 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="text-gray-500 font-mono">#{history.length - idx}</div>
                  <div>
                    <div className="text-white font-semibold">{new Date(session.date).toLocaleDateString()}</div>
                    <div className="text-gray-400 text-sm">{session.totalReps} reps • {Math.floor(session.sessionDuration / 60)}m {session.sessionDuration % 60}s</div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className={`text-2xl font-bold ${getScoreColor(session.formScores.overall)}`}>
                    {session.formScores.overall}
                  </div>
                  {getTrendIcon(session.improvements.trend)}
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormAnalysisPage;
