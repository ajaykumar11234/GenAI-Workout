import mongoose from 'mongoose';

const foodLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    foodName: {
        type: String,
        required: true,
        trim: true
    },
    imageUrl: {
        type: String,
        default: null
    },
    portion: {
        type: String,
        default: '1 serving'
    },
    nutrition: {
        calories: {
            type: Number,
            required: true,
            min: 0
        },
        protein: {
            type: Number,
            required: true,
            min: 0
        },
        carbs: {
            type: Number,
            required: true,
            min: 0
        },
        fats: {
            type: Number,
            required: true,
            min: 0
        },
        fiber: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    mealType: {
        type: String,
        enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
        default: 'Snack'
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Index for efficient querying by user and date
foodLogSchema.index({ user: 1, date: -1 });

const FoodLog = mongoose.model('FoodLog', foodLogSchema);

export default FoodLog;
