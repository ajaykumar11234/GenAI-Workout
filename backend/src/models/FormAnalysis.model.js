import mongoose from 'mongoose';

const formAnalysisSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    exercise: {
        type: String,
        required: true,
        enum: ['squat', 'pushup', 'bicep_curl', 'plank', 'lunges', 'deadlift']
    },
    date: {
        type: Date,
        default: Date.now,
        required: true,
        index: true
    },
    sessionDuration: {
        type: Number, // in seconds
        default: 0
    },
    totalReps: {
        type: Number,
        required: true,
        min: 0
    },
    formScores: {
        // Overall form score 0-100
        overall: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        // Detailed breakdown
        kneeAlignment: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        backPosition: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        hipAlignment: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        rangeOfMotion: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        tempo: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        }
    },
    injuryAlerts: [{
        timestamp: Date,
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        issue: String,
        recommendation: String
    }],
    repData: [{
        repNumber: Number,
        quality: {
            type: String,
            enum: ['excellent', 'good', 'fair', 'poor', 'incomplete']
        },
        score: Number,
        duration: Number, // milliseconds
        angles: {
            min: Number,
            max: Number,
            average: Number
        },
        issues: [String]
    }],
    improvements: {
        fromLastSession: {
            type: Number, // percentage improvement
            default: 0
        },
        trend: {
            type: String,
            enum: ['improving', 'stable', 'declining', 'new'],
            default: 'new'
        }
    },
    recommendations: [{
        text: String,
        priority: {
            type: String,
            enum: ['high', 'medium', 'low']
        },
        category: {
            type: String,
            enum: ['form', 'tempo', 'range', 'alignment', 'safety']
        }
    }],
    aiSuggestions: {
        optimalRepRange: {
            min: Number,
            max: Number
        },
        suggestedSets: Number,
        restTime: Number,
        reasoning: String
    }
}, {
    timestamps: true
});

// Index for efficient querying
formAnalysisSchema.index({ user: 1, exercise: 1, date: -1 });

// Method to calculate improvement from last session
formAnalysisSchema.methods.calculateImprovement = async function() {
    const lastSession = await this.constructor.findOne({
        user: this.user,
        exercise: this.exercise,
        _id: { $ne: this._id },
        date: { $lt: this.date }
    }).sort({ date: -1 });

    if (!lastSession) {
        this.improvements.trend = 'new';
        return 0;
    }

    const improvement = this.formScores.overall - lastSession.formScores.overall;
    this.improvements.fromLastSession = improvement;

    if (improvement > 5) {
        this.improvements.trend = 'improving';
    } else if (improvement < -5) {
        this.improvements.trend = 'declining';
    } else {
        this.improvements.trend = 'stable';
    }

    return improvement;
};

const FormAnalysis = mongoose.model('FormAnalysis', formAnalysisSchema);

export default FormAnalysis;
