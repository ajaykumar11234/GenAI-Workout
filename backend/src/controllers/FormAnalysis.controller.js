import FormAnalysis from '../models/FormAnalysis.model.js';
import { asyncHandler } from '../asyncHandler.js';
import { ApiSuccess } from '../utils/ApiSuccess.js';
import { ApiError } from '../utils/ApiError.js';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Save form analysis data from OpenCV workout
export const saveFormAnalysis = asyncHandler(async (req, res) => {
    console.log('📊 Form analysis save request received');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user?._id);
    
    const {
        exercise,
        totalReps,
        sessionDuration,
        formScores,
        injuryAlerts,
        repData
    } = req.body;

    if (!exercise || !totalReps) {
        console.log('❌ Missing required fields:', { exercise, totalReps });
        throw new ApiError(400, "Exercise and total reps are required");
    }

    if (!req.user) {
        console.log('❌ User not authenticated');
        throw new ApiError(401, "User not authenticated");
    }

    console.log(`✅ Validation passed for user ${req.user._id}`);

    const formAnalysis = new FormAnalysis({
        user: req.user._id,
        exercise,
        totalReps,
        sessionDuration,
        formScores,
        injuryAlerts: injuryAlerts || [],
        repData: repData || []
    });

    console.log('📈 Calculating improvements...');
    // Calculate improvement from last session
    await formAnalysis.calculateImprovement();

    console.log('🤖 Generating AI recommendations...');
    // Generate AI recommendations
    const aiSuggestions = await generateAIRecommendations(exercise, formAnalysis, req.user);
    formAnalysis.aiSuggestions = aiSuggestions;

    console.log('📋 Generating form recommendations...');
    // Generate specific recommendations based on form scores
    const recommendations = generateFormRecommendations(formScores, exercise);
    formAnalysis.recommendations = recommendations;

    console.log('💾 Saving to database...');
    await formAnalysis.save();

    console.log('✅ Form analysis saved successfully:', formAnalysis._id);

    res.status(201).json(
        new ApiSuccess(201, formAnalysis, "Form analysis saved successfully")
    );
});

// Get user's form analysis history for an exercise
export const getFormAnalysisHistory = asyncHandler(async (req, res) => {
    const { exercise } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const history = await FormAnalysis.find({
        user: req.user._id,
        exercise
    })
        .sort({ date: -1 })
        .limit(limit);

    // Calculate overall trends
    const trend = calculateFormTrend(history);

    res.status(200).json(
        new ApiSuccess(200, { history, trend }, "Form analysis history retrieved")
    );
});

// Get form analysis summary across all exercises
export const getFormAnalysisSummary = asyncHandler(async (req, res) => {
    const summary = await FormAnalysis.aggregate([
        { $match: { user: req.user._id } },
        {
            $group: {
                _id: '$exercise',
                totalSessions: { $sum: 1 },
                avgFormScore: { $avg: '$formScores.overall' },
                totalReps: { $sum: '$totalReps' },
                totalInjuryAlerts: { $sum: { $size: '$injuryAlerts' } },
                latestSession: { $max: '$date' },
                bestFormScore: { $max: '$formScores.overall' }
            }
        },
        { $sort: { latestSession: -1 } }
    ]);

    res.status(200).json(
        new ApiSuccess(200, summary, "Form analysis summary retrieved")
    );
});

// Get improvement trends over time
export const getImprovementTrends = asyncHandler(async (req, res) => {
    const { exercise } = req.params;
    const days = parseInt(req.query.days) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trends = await FormAnalysis.find({
        user: req.user._id,
        exercise,
        date: { $gte: startDate }
    })
        .select('date formScores.overall formScores.kneeAlignment formScores.backPosition formScores.hipAlignment injuryAlerts')
        .sort({ date: 1 });

    const analysis = {
        exercise,
        period: `${days} days`,
        dataPoints: trends.length,
        trends: trends.map(t => ({
            date: t.date,
            overallScore: t.formScores.overall,
            kneeAlignment: t.formScores.kneeAlignment,
            backPosition: t.formScores.backPosition,
            hipAlignment: t.formScores.hipAlignment,
            hadInjuryAlerts: t.injuryAlerts.length > 0
        })),
        averageImprovement: calculateAverageImprovement(trends)
    };

    res.status(200).json(
        new ApiSuccess(200, analysis, "Improvement trends retrieved")
    );
});

// Helper: Generate AI-powered recommendations
async function generateAIRecommendations(exercise, formAnalysis, user) {
    try {
        const prompt = `You are a certified personal trainer analyzing workout form data.

Exercise: ${exercise}
User's form scores (out of 100):
- Overall: ${formAnalysis.formScores.overall}
- Knee Alignment: ${formAnalysis.formScores.kneeAlignment}
- Back Position: ${formAnalysis.formScores.backPosition}
- Hip Alignment: ${formAnalysis.formScores.hipAlignment}
- Range of Motion: ${formAnalysis.formScores.rangeOfMotion}
- Tempo: ${formAnalysis.formScores.tempo}

Total Reps: ${formAnalysis.totalReps}
Recent Injury Alerts: ${formAnalysis.injuryAlerts.map(a => a.issue).join(', ') || 'None'}
Improvement from Last Session: ${formAnalysis.improvements.fromLastSession}%

Based on this data, provide:
1. Optimal rep range (min-max) for next session
2. Suggested number of sets
3. Recommended rest time between sets (in seconds)
4. Brief reasoning (max 2 sentences)

Respond in JSON format:
{
  "optimalRepRange": {"min": number, "max": number},
  "suggestedSets": number,
  "restTime": number,
  "reasoning": "string"
}`;

        const completion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.3-70b-versatile',
            temperature: 0.7,
            max_tokens: 300
        });

        const response = completion.choices[0]?.message?.content;
        
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback recommendations
        return {
            optimalRepRange: { min: 8, max: 12 },
            suggestedSets: 3,
            restTime: 60,
            reasoning: "Standard recommendation based on form data."
        };
    } catch (error) {
        console.error('AI recommendation error:', error);
        return {
            optimalRepRange: { min: 8, max: 12 },
            suggestedSets: 3,
            restTime: 60,
            reasoning: "Standard recommendation - AI unavailable."
        };
    }
}

// Helper: Generate form-specific recommendations
function generateFormRecommendations(formScores, exercise) {
    const recommendations = [];

    if (formScores.kneeAlignment < 70) {
        recommendations.push({
            text: "Focus on knee tracking - keep knees aligned with toes",
            priority: "high",
            category: "alignment"
        });
    }

    if (formScores.backPosition < 70) {
        recommendations.push({
            text: exercise === 'squat' 
                ? "Maintain upright torso - engage core and keep chest up"
                : "Keep spine neutral - avoid sagging or arching",
            priority: "high",
            category: "form"
        });
    }

    if (formScores.hipAlignment < 75) {
        recommendations.push({
            text: "Improve hip stability and symmetry",
            priority: "medium",
            category: "alignment"
        });
    }

    if (formScores.rangeOfMotion < 75) {
        recommendations.push({
            text: "Work on flexibility to achieve full range of motion",
            priority: "medium",
            category: "range"
        });
    }

    if (formScores.tempo < 70) {
        recommendations.push({
            text: "Control your tempo - slower reps build better strength",
            priority: "medium",
            category: "tempo"
        });
    }

    if (recommendations.length === 0) {
        recommendations.push({
            text: "Excellent form! Focus on progressive overload",
            priority: "low",
            category: "form"
        });
    }

    return recommendations;
}

// Helper: Calculate form trend
function calculateFormTrend(history) {
    if (history.length < 2) return 'new';

    const recent = history.slice(0, 3);
    const older = history.slice(3, 6);

    if (older.length === 0) return 'new';

    const recentAvg = recent.reduce((sum, h) => sum + h.formScores.overall, 0) / recent.length;
    const olderAvg = older.reduce((sum, h) => sum + h.formScores.overall, 0) / older.length;

    const improvement = recentAvg - olderAvg;

    if (improvement > 5) return 'improving';
    if (improvement < -5) return 'declining';
    return 'stable';
}

// Helper: Calculate average improvement
function calculateAverageImprovement(trends) {
    if (trends.length < 2) return 0;

    const improvements = [];
    for (let i = 1; i < trends.length; i++) {
        const improvement = trends[i].formScores.overall - trends[i - 1].formScores.overall;
        improvements.push(improvement);
    }

    return improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
}

export default {
    saveFormAnalysis,
    getFormAnalysisHistory,
    getFormAnalysisSummary,
    getImprovementTrends
};
