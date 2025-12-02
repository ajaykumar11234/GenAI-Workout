import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.middleware.js';
import {
    saveFormAnalysis,
    getFormAnalysisHistory,
    getFormAnalysisSummary,
    getImprovementTrends
} from '../controllers/FormAnalysis.controller.js';

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Save form analysis data from OpenCV workout
router.post('/save', saveFormAnalysis);

// Get form analysis history for a specific exercise
router.get('/history/:exercise', getFormAnalysisHistory);

// Get overall form analysis summary across all exercises
router.get('/summary', getFormAnalysisSummary);

// Get improvement trends for an exercise over time
router.get('/trends/:exercise', getImprovementTrends);

export default router;
