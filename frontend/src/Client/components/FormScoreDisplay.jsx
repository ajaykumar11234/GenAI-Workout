import React from 'react';
import { Activity, AlertTriangle, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

const FormScoreDisplay = ({ formData }) => {
  const {
    detailed_scores = {},
    injury_alert = null,
    quality_score = 0,
    form_issues = [],
    consecutive_good_reps = 0
  } = formData;

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-blue-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Injury Alert Banner */}
      {injury_alert && (
        <div className={`rounded-lg p-4 border-2 animate-pulse ${
          injury_alert.severity === 'critical' ? 'bg-red-900 bg-opacity-30 border-red-500' :
          injury_alert.severity === 'high' ? 'bg-orange-900 bg-opacity-30 border-orange-500' :
          'bg-yellow-900 bg-opacity-30 border-yellow-500'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={24} />
            <div>
              <div className="font-bold text-white">{injury_alert.issue}</div>
              <div className="text-sm text-gray-300 mt-1">{injury_alert.recommendation}</div>
            </div>
          </div>
        </div>
      )}

      {/* Overall Form Score */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400 text-sm font-semibold">CURRENT FORM QUALITY</span>
          <div className="flex items-center gap-2">
            {consecutive_good_reps > 0 ? (
              <div className="flex items-center gap-1 text-green-400">
                <CheckCircle size={16} />
                <span className="text-xs">{consecutive_good_reps} in a row</span>
              </div>
            ) : (
              <XCircle size={16} className="text-red-400" />
            )}
          </div>
        </div>
        <div className={`text-4xl font-bold ${getScoreColor(detailed_scores.overall || quality_score)}`}>
          {detailed_scores.overall || quality_score}
          <span className="text-gray-500 text-2xl">/100</span>
        </div>
      </div>

      {/* Detailed Scores */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-gray-400 text-sm font-semibold mb-3">FORM BREAKDOWN</h4>
        <div className="space-y-3">
          {Object.entries(detailed_scores).map(([key, score]) => {
            if (key === 'overall') return null;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={`font-bold ${getScoreColor(score)}`}>
                    {score}
                  </span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getScoreBg(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Form Issues */}
      {form_issues.length > 0 && (
        <div className="bg-yellow-900 bg-opacity-20 border border-yellow-600 rounded-lg p-3">
          <div className="text-yellow-400 text-xs font-semibold mb-2">FORM ISSUES DETECTED</div>
          <div className="space-y-1">
            {form_issues.map((issue, idx) => (
              <div key={idx} className="text-yellow-200 text-sm">
                • {issue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormScoreDisplay;
