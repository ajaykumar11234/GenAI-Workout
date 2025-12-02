import cv2
import mediapipe as mp
import numpy as np
import time
import os
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from collections import deque
import threading
import random
import requests
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration for Node.js backend (use environment variable for production)
NODEJS_BACKEND_URL = os.environ.get('NODEJS_BACKEND_URL', 'http://localhost:4000/api/v1/user')

# -----------------------------
# Mediapipe setup
# -----------------------------
mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

# -----------------------------
# Exercise configs with enhanced feedback
# -----------------------------
EXERCISE_CONFIG = {
    'bicep_curl': {
        'thresholds': {'down': 160, 'up': 40},
        'joints': ['RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST'],
        'calories_per_rep': 0.5,
        'rep_quality': {'excellent': [35, 45], 'good': [30, 50], 'poor': [20, 60]}
    },
    'squat': {
        'thresholds': {'down': 90, 'up': 160},
        'joints': ['RIGHT_HIP', 'RIGHT_KNEE', 'RIGHT_ANKLE'],
        'calories_per_rep': 1.0,
        'rep_quality': {'excellent': [80, 100], 'good': [70, 110], 'poor': [60, 120]}
    },
    'pushup': {
        'thresholds': {'down': 90, 'up': 160},
        'joints': ['RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST'],
        'calories_per_rep': 0.8,
        'rep_quality': {'excellent': [80, 100], 'good': [70, 110], 'poor': [60, 120]}
    }
}

WORKOUT_PLAN = {
    "bicep_curl": {"target_reps": 12, "sets": 3, "rest": 45},
    "squat": {"target_reps": 15, "sets": 4, "rest": 60},
    "pushup": {"target_reps": 10, "sets": 3, "rest": 30},
}

# -----------------------------
# Motivational messages
# -----------------------------
MOTIVATION_MESSAGES = {
    'start': [
        "Let's crush this workout! 💪",
        "Time to get strong! You've got this! 🔥",
        "Ready to push your limits? Let's go! 🚀",
        "Your body can do it. It's your mind you need to convince! 💯"
    ],
    'milestone_5': [
        "Amazing! 5 reps done! Keep the momentum! 🎯",
        "You're on fire! 5 down, keep pushing! 🔥",
        "Fantastic form! 5 reps completed! 💪",
        "Great job! Halfway there, don't stop now! ⚡"
    ],
    'milestone_10': [
        "WOW! 10 reps! You're unstoppable! 🚀",
        "Double digits! Your strength is showing! 💪",
        "10 reps down! You're in the zone! 🎯",
        "Incredible! Feel that burn, it's growth! 🔥"
    ],
    'set_complete': [
        "SET COMPLETE! You're a champion! 🏆",
        "Boom! Another set crushed! Rest up! 😤",
        "Outstanding! That's how it's done! 👑",
        "Set finished! You're getting stronger! 💯"
    ],
    'encouragement': [
        "Perfect form! Keep it up! ✨",
        "Excellent technique! 👏",
        "Beautiful rep! You're nailing it! 🎯",
        "Textbook form! Outstanding! 📚"
    ],
    'push_harder': [
        "Come on! Push through it! 💪",
        "You've got more in you! Don't quit! 🔥",
        "This is where champions are made! 👑",
        "Feel the burn! It's working! ⚡"
    ]
}

FORM_CORRECTIONS = {
    'bicep_curl': {
        'elbow_forward': "🔄 Keep your elbow pinned to your side! Don't let it drift forward!",
        'elbow_high': "⬇️ Lower your elbow! It should stay by your ribs throughout the movement!",
        'partial_range': "📏 Full range of motion! Lower the weight completely, then curl all the way up!",
        'swinging': "🚫 Stop swinging! Control the weight with your biceps, not momentum!",
        'wrist_bent': "✋ Keep your wrist straight and strong! Don't let it bend backward!",
        'too_fast': "🐌 Slow down! Control the weight on both the way up AND down!",
        'shoulders_up': "⬇️ Relax those shoulders! Keep them down and back!"
    },
    'squat': {
        'knees_cave': "🦵 Push your knees OUT! Don't let them cave inward!",
        'not_deep': "⬇️ Go DEEPER! Your hips should go below your knees!",
        'heels_up': "🦶 Keep your heels DOWN! Drive through your whole foot!",
        'forward_lean': "🏠 Chest up! Don't lean forward - keep your torso upright!",
        'knees_forward': "🔄 Sit back more! Push your hips back like you're sitting in a chair!",
        'uneven': "⚖️ Keep your weight balanced! Both legs should work equally!",
        'too_narrow': "📏 Widen your stance! Feet should be shoulder-width apart!"
    },
    'pushup': {
        'hips_sag': "🏠 Plank position! Tighten your core and lift those hips!",
        'hips_high': "⬇️ Lower your hips! Your body should be one straight line!",
        'partial_range': "📏 Go all the way down! Chest should almost touch the ground!",
        'hands_wrong': "✋ Hand position! Hands should be under your shoulders!",
        'head_down': "👁️ Look forward! Don't let your head hang down!",
        'elbows_flare': "🔄 Tuck your elbows! Keep them close to your body at 45 degrees!",
        'unsteady': "🎯 Stay steady! Control the movement, don't rush!"
    }
}

# -----------------------------
# Global State with enhanced tracking
# -----------------------------
state = {
    'is_running': False,
    'exercise': 'bicep_curl',
    'reps': 0,
    'stage': 'down',
    'feedback': 'Get ready!',
    'angle': 0,
    'form_score': 100,
    'last_rep_time': 0.0,
    'workout_start_time': 0.0,
    'total_workout_time': 0,
    'calories_burned': 0.0,
    'angle_history': deque(maxlen=5),
    'current_set': 1,
    'total_sets': 1,
    'target_reps': 0,
    'in_rest': False,
    'rest_end_time': 0.0,
    'latest_frame': None,
    'capture_thread': None,
    'fps': 0,
    # Enhanced tracking
    'rep_quality_score': 0,
    'total_good_reps': 0,
    'consecutive_good_reps': 0,
    'last_motivation_rep': 0,
    'form_issues': [],
    'last_feedback_time': 0,
    'rep_times': deque(maxlen=10),  # Track rep timing
    'average_rep_time': 0,
    'best_rep_quality': 0,
    # NEW: Detailed form analysis
    'detailed_scores': {
        'knee_alignment': 100,
        'back_position': 100,
        'hip_alignment': 100,
        'range_of_motion': 100,
        'tempo': 100,
        'overall': 100
    },
    'injury_risks': [],
    'rep_history': [],  # Store each rep's detailed data
    'active_injury_alert': None,
    'form_trend': 'stable'  # improving, stable, declining
}

# -----------------------------
# Utils
# -----------------------------
def calculate_angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    radians = np.arctan2(c[1]-b[1], c[0]-b[0]) - np.arctan2(a[1]-b[1], a[0]-b[0])
    angle = np.abs(radians * 180.0 / np.pi)
    if angle > 180.0:
        angle = 360 - angle
    return round(angle, 1)

def smooth_angle(new_angle):
    state['angle_history'].append(new_angle)
    return sum(state['angle_history']) / max(1, len(state['angle_history']))

def get_random_message(message_type):
    messages = MOTIVATION_MESSAGES.get(message_type, ['Keep going!'])
    return random.choice(messages)

def calculate_rep_quality(angle, exercise):
    """Calculate rep quality based on range of motion"""
    cfg = EXERCISE_CONFIG[exercise]
    quality_ranges = cfg['rep_quality']
    
    if quality_ranges['excellent'][0] <= angle <= quality_ranges['excellent'][1]:
        return 'excellent', 100
    elif quality_ranges['good'][0] <= angle <= quality_ranges['good'][1]:
        return 'good', 75
    elif quality_ranges['poor'][0] <= angle <= quality_ranges['poor'][1]:
        return 'poor', 50
    else:
        return 'incomplete', 25

# -----------------------------
# Enhanced form correction checks with detailed scoring
# -----------------------------
def calculate_detailed_form_scores(landmarks, exercise):
    """Calculate detailed form scores (0-100) for each aspect"""
    scores = {
        'knee_alignment': 100,
        'back_position': 100,
        'hip_alignment': 100,
        'range_of_motion': 100,
        'tempo': 100,
        'overall': 100
    }
    
    injury_risks = []
    
    if exercise == "squat":
        hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
        knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
        ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
        left_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
        shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP.value]
        
        # Calculate knee angle for detailed tracking
        knee_angle = calculate_angle(
            [hip.x, hip.y],
            [knee.x, knee.y],
            [ankle.x, ankle.y]
        )
        
        # Knee alignment score (checking for knee cave)
        knee_offset = abs(knee.x - ankle.x)
        if knee_offset > 0.15:
            scores['knee_alignment'] = max(0, 100 - (knee_offset - 0.15) * 500)
            injury_risks.append({
                'severity': 'high',
                'issue': 'Severe knee cave detected',
                'recommendation': 'Push knees out! This can cause knee injury.'
            })
        elif knee_offset > 0.1:
            scores['knee_alignment'] = max(70, 100 - (knee_offset - 0.1) * 400)
            injury_risks.append({
                'severity': 'medium',
                'issue': 'Knee valgus (cave-in)',
                'recommendation': 'Focus on pushing knees outward'
            })
        
        # Back position score (checking forward lean)
        lean_offset = abs(shoulder.x - hip.x)
        if lean_offset > 0.15:
            scores['back_position'] = max(0, 100 - (lean_offset - 0.15) * 400)
            injury_risks.append({
                'severity': 'high',
                'issue': 'Excessive forward lean - back injury risk',
                'recommendation': 'Keep chest up and back straight!'
            })
        elif lean_offset > 0.1:
            scores['back_position'] = max(70, 100 - (lean_offset - 0.1) * 300)
        
        # Hip alignment score
        hip_level = abs(hip.y - left_hip.y)
        if hip_level > 0.05:
            scores['hip_alignment'] = max(60, 100 - hip_level * 800)
        
        # Range of motion score (depth)
        if state['stage'] == 'down':
            if hip.y >= knee.y:
                depth_diff = hip.y - knee.y
                scores['range_of_motion'] = max(50, 100 - depth_diff * 300)
        
    elif exercise == "pushup":
        shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
        ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
        elbow = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value]
        wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
        
        # Back alignment score (plank position)
        hip_sag = hip.y - shoulder.y
        if hip_sag > 0.15:
            scores['back_position'] = max(0, 100 - (hip_sag - 0.15) * 400)
            injury_risks.append({
                'severity': 'high',
                'issue': 'Lower back sagging - injury risk!',
                'recommendation': 'Engage core! Lift hips to plank position.'
            })
        elif hip_sag > 0.1:
            scores['back_position'] = max(70, 100 - (hip_sag - 0.1) * 300)
        elif hip_sag < -0.1:
            scores['back_position'] = max(70, 100 - abs(hip_sag + 0.1) * 300)
        
        # Elbow alignment score
        elbow_flare = abs(elbow.x - shoulder.x)
        if elbow_flare > 0.25:
            scores['hip_alignment'] = max(50, 100 - (elbow_flare - 0.25) * 300)
            injury_risks.append({
                'severity': 'medium',
                'issue': 'Elbows flaring out',
                'recommendation': 'Tuck elbows closer to body (45° angle)'
            })
        elif elbow_flare > 0.2:
            scores['hip_alignment'] = max(75, 100 - (elbow_flare - 0.2) * 200)
        
        # Hand position score
        hand_offset = abs(wrist.x - shoulder.x)
        if hand_offset > 0.2:
            scores['knee_alignment'] = max(60, 100 - (hand_offset - 0.2) * 300)
    
    elif exercise == "bicep_curl":
        wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
        elbow = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value]
        shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        
        # Elbow position score
        elbow_forward = abs(min(0, shoulder.x - elbow.x - 0.15))
        if elbow_forward > 0.2:
            scores['hip_alignment'] = max(50, 100 - (elbow_forward - 0.2) * 300)
            injury_risks.append({
                'severity': 'medium',
                'issue': 'Elbow moving forward',
                'recommendation': 'Pin elbow to your side - isolate bicep!'
            })
        elif elbow_forward > 0.15:
            scores['hip_alignment'] = max(75, 100 - (elbow_forward - 0.15) * 200)
        
        # Check for momentum/swinging
        elbow_movement = abs(elbow.x - shoulder.x)
        if elbow_movement > 0.25:
            scores['knee_alignment'] = max(40, 100 - (elbow_movement - 0.25) * 400)
            injury_risks.append({
                'severity': 'low',
                'issue': 'Using momentum instead of muscle',
                'recommendation': 'Control the weight - no swinging!'
            })
    
    # Tempo score (check rep timing)
    if state['average_rep_time'] > 0:
        # Ideal rep time: 2-4 seconds
        if state['average_rep_time'] < 1.5:
            scores['tempo'] = 60  # Too fast
        elif state['average_rep_time'] > 5:
            scores['tempo'] = 75  # Too slow
        else:
            scores['tempo'] = 100
    
    # Calculate overall score (weighted average)
    scores['overall'] = int(
        scores['knee_alignment'] * 0.25 +
        scores['back_position'] * 0.30 +
        scores['hip_alignment'] * 0.20 +
        scores['range_of_motion'] * 0.15 +
        scores['tempo'] * 0.10
    )
    
    return scores, injury_risks

def check_detailed_form(landmarks, exercise):
    """Legacy function - now calls detailed scoring"""
    scores, injury_risks = calculate_detailed_form_scores(landmarks, exercise)
    
    # Convert low scores to form issues
    form_issues = []
    
    if scores['knee_alignment'] < 70:
        if exercise == "squat":
            form_issues.append('knees_cave')
        elif exercise == "bicep_curl":
            form_issues.append('swinging')
        elif exercise == "pushup":
            form_issues.append('hands_wrong')
    
    if scores['back_position'] < 70:
        if exercise == "squat":
            form_issues.append('forward_lean')
        elif exercise == "pushup":
            form_issues.append('hips_sag')
    
    if scores['hip_alignment'] < 70:
        if exercise == "pushup":
            form_issues.append('elbows_flare')
        elif exercise == "bicep_curl":
            form_issues.append('elbow_forward')
    
    if scores['range_of_motion'] < 70:
        if exercise == "squat":
            form_issues.append('not_deep')
        elif exercise == "pushup":
            form_issues.append('partial_range')
        elif exercise == "bicep_curl":
            form_issues.append('partial_range')
    
    # Store scores and injury risks in state
    state['detailed_scores'] = scores
    state['injury_risks'] = injury_risks
    
    return form_issues

def provide_form_feedback(form_issues, exercise):
    """Provide specific form correction feedback"""
    if not form_issues:
        return None
    
    # Return the most critical issue first
    critical_issue = form_issues[0]
    corrections = FORM_CORRECTIONS.get(exercise, {})
    return corrections.get(critical_issue, "Focus on your form!")

# -----------------------------
# Enhanced pose processing with motivation
# -----------------------------
def process_pose(landmarks, exercise):
    now = time.time()
    cfg = EXERCISE_CONFIG[exercise]

    joints = []
    for name in cfg['joints']:
        idx = getattr(mp_pose.PoseLandmark, name).value
        joints.append([landmarks[idx].x, landmarks[idx].y])

    raw_angle = calculate_angle(joints[0], joints[1], joints[2])
    smoothed = smooth_angle(raw_angle)
    state['angle'] = int(smoothed)

    # Check form issues
    form_issues = check_detailed_form(landmarks, exercise)
    state['form_issues'] = form_issues

    thr = cfg['thresholds']
    stage = state['stage']
    reps = state['reps']

    # Rep counting logic with quality assessment
    if smoothed > thr['down']:
        if stage != 'down':
            state['stage'] = 'down'
            if not form_issues:
                state['feedback'] = "Perfect position! Now push/curl up with control! 💪"
            else:
                correction = provide_form_feedback(form_issues, exercise)
                state['feedback'] = correction if correction else "Focus on your form!"
    
    elif smoothed < thr['up'] and stage == 'down':
        if now - state['last_rep_time'] > 0.8:  # Prevent too fast reps
            # Calculate rep quality
            rep_quality, quality_score = calculate_rep_quality(smoothed, exercise)
            
            # Get detailed form scores
            detailed_scores = state.get('detailed_scores', {})
            overall_form_score = detailed_scores.get('overall', quality_score)
            
            # Only count good quality reps (at least 60% form score)
            if overall_form_score >= 60:
                reps += 1
                state['reps'] = reps
                state['stage'] = 'up'
                rep_duration = now - state['last_rep_time']
                state['last_rep_time'] = now
                state['calories_burned'] += cfg['calories_per_rep']
                state['rep_quality_score'] = overall_form_score
                
                # Store detailed rep data
                rep_data = {
                    'rep_number': reps,
                    'quality': rep_quality,
                    'score': overall_form_score,
                    'duration': round(rep_duration, 2),
                    'timestamp': now,
                    'detailed_scores': detailed_scores.copy(),
                    'issues': state['form_issues'].copy()
                }
                state['rep_history'].append(rep_data)
                
                # Track rep timing
                state['rep_times'].append(rep_duration)
                state['average_rep_time'] = sum(state['rep_times']) / len(state['rep_times'])
                
                # Track consecutive good reps
                state['consecutive_good_reps'] += 1
                state['total_good_reps'] += 1
                
                if overall_form_score > state['best_rep_quality']:
                    state['best_rep_quality'] = overall_form_score
                
                # Provide motivational feedback based on form quality
                feedback = None
                
                if overall_form_score >= 90:
                    feedback = f"🌟 PERFECT REP #{reps}! Flawless form! {get_random_message('encouragement')}"
                elif overall_form_score >= 80:
                    feedback = f"✨ EXCELLENT REP #{reps}! {get_random_message('encouragement')}"
                elif overall_form_score >= 70:
                    feedback = f"✅ Great rep #{reps}!"
                else:
                    feedback = f"✓ Rep #{reps} counted - improve form for better results"
                
                # Milestone motivation
                if reps % 5 == 0 and reps > state['last_motivation_rep']:
                    if reps == 5:
                        feedback = get_random_message('milestone_5')
                    elif reps == 10:
                        feedback = get_random_message('milestone_10')
                    elif reps % 10 == 0:
                        feedback = f"🚀 {reps} REPS! You're crushing it! {get_random_message('push_harder')}"
                    state['last_motivation_rep'] = reps
                
                state['feedback'] = feedback or f"Rep {reps} ✅"

                # Set management
                if state['target_reps'] and reps >= state['target_reps']:
                    plan = WORKOUT_PLAN[exercise]
                    if state['current_set'] < state['total_sets']:
                        state['in_rest'] = True
                        state['rest_end_time'] = now + plan['rest']
                        state['feedback'] = f"{get_random_message('set_complete')} Rest {plan['rest']}s"
                        state['current_set'] += 1
                        state['reps'] = 0
                        state['consecutive_good_reps'] = 0
                        state['last_motivation_rep'] = 0
                    else:
                        state['feedback'] = "🎉🏆 WORKOUT COMPLETE! You're amazing! 🏆🎉"
            
            else:
                # Poor quality rep - don't count it
                state['consecutive_good_reps'] = 0
                state['feedback'] = f"⚠️ Rep not counted (Form: {int(overall_form_score)}%) - Check your form!"

    # Provide form corrections if no recent feedback
    if form_issues and now - state['last_feedback_time'] > 2.0:
        correction = provide_form_feedback(form_issues, exercise)
        if correction:
            state['feedback'] = correction
            state['last_feedback_time'] = now
    
    # INJURY ALERT SYSTEM - Priority feedback
    injury_risks = state.get('injury_risks', [])
    if injury_risks:
        # Show most severe injury risk
        critical_risks = [r for r in injury_risks if r['severity'] in ['critical', 'high']]
        if critical_risks and now - state['last_feedback_time'] > 1.5:
            alert = critical_risks[0]
            state['active_injury_alert'] = alert
            state['feedback'] = f"🚨 {alert['issue']}! {alert['recommendation']}"
            state['last_feedback_time'] = now
    else:
        state['active_injury_alert'] = None
    
    # Rest period countdown
    if state['in_rest'] and now < state['rest_end_time']:
        remaining = int(state['rest_end_time'] - now)
        state['feedback'] = f"⏱️ Rest: {remaining}s - You're doing great! Prepare for next set!"
    elif state['in_rest'] and now >= state['rest_end_time']:
        state['in_rest'] = False
        state['feedback'] = f"🔥 SET {state['current_set']} - Let's go! {get_random_message('start')}"

    # Update workout time
    if state['workout_start_time'] > 0:
        state['total_workout_time'] = int(time.time() - state['workout_start_time'])

# -----------------------------
# Video capture thread (unchanged)
# -----------------------------
def capture_frames():
    cap = cv2.VideoCapture(0)
    last_time = time.time()

    with mp_pose.Pose(min_detection_confidence=0.7, min_tracking_confidence=0.7) as pose:
        while state['is_running']:
            ok, frame = cap.read()
            if not ok:
                continue
            frame = cv2.flip(frame, 1)
            image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(image)

            if results.pose_landmarks:
                process_pose(results.pose_landmarks.landmark, state['exercise'])
                mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

            # Display enhanced information
            # cv2.putText(frame, f"Reps: {state['reps']} (Set {state['current_set']}/{state['total_sets']})",
                        # (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
            
            # Quality indicator
            quality_color = (0, 255, 0) if state['rep_quality_score'] > 75 else (0, 165, 255) if state['rep_quality_score'] > 50 else (0, 0, 255)
            # cv2.putText(frame, f"Quality: {state['rep_quality_score']}/100", 
            #             (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, quality_color, 2)
            
            # Feedback with word wrapping for long messages
            feedback_lines = [state['feedback'][i:i+50] for i in range(0, len(state['feedback']), 50)]
            # for i, line in enumerate(feedback_lines[:2]):  # Max 2 lines
            #     cv2.putText(frame, line, (20, 80 + i*25),
            #                 cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,255,0), 2)

            _, buffer = cv2.imencode('.jpg', frame)
            state['latest_frame'] = buffer.tobytes()

            current_time = time.time()
            state['fps'] = round(1 / (current_time - last_time), 1)
            last_time = current_time

    cap.release()
    cv2.destroyAllWindows()

# -----------------------------
# Enhanced API Endpoints
# -----------------------------
@app.route("/start/<exercise>", methods=["POST"])
def start(exercise):
    if exercise not in EXERCISE_CONFIG:
        return jsonify({"error": "Invalid exercise"}), 400

    t_old = state.get('capture_thread')
    if t_old and t_old.is_alive():
        state['is_running'] = False
        t_old.join()

    plan = WORKOUT_PLAN[exercise]
    now = time.time()
    state.update({
        'is_running': True,
        'exercise': exercise,
        'reps': 0,
        'stage': 'down',
        'feedback': f"{get_random_message('start')} Starting {exercise.title()}!",
        'angle': 0,
        'form_score': 100,
        'last_rep_time': now,
        'workout_start_time': now,
        'total_workout_time': 0,
        'calories_burned': 0.0,
        'current_set': 1,
        'total_sets': plan['sets'],
        'target_reps': plan['target_reps'],
        'in_rest': False,
        'rest_end_time': 0.0,
        'latest_frame': None,
        'fps': 0,
        'rep_quality_score': 0,
        'total_good_reps': 0,
        'consecutive_good_reps': 0,
        'last_motivation_rep': 0,
        'form_issues': [],
        'last_feedback_time': 0,
        'average_rep_time': 0,
        'best_rep_quality': 0
    })
    state['angle_history'].clear()
    state['rep_times'].clear()

    t = threading.Thread(target=capture_frames, daemon=True)
    t.start()
    state['capture_thread'] = t

    return jsonify({
        "status": "started", 
        "plan": plan,
        "message": f"Let's crush this {exercise} workout! 💪"
    })

@app.route("/stop", methods=["POST"])
def stop():
    state['is_running'] = False
    t = state.get('capture_thread')
    if t and t.is_alive():
        t.join()
    state['capture_thread'] = None
    
    # Calculate workout duration
    workout_duration = int(time.time() - state['workout_start_time']) if state['workout_start_time'] > 0 else 0
    
    # Calculate average form scores from rep history
    rep_history = state.get('rep_history', [])
    avg_scores = {
        'knee_alignment': 100,
        'back_position': 100,
        'hip_alignment': 100,
        'range_of_motion': 100,
        'tempo': 100,
        'overall': state.get('detailed_scores', {}).get('overall', 100)
    }
    
    if rep_history:
        for score_key in avg_scores.keys():
            if score_key != 'overall':
                scores = [rep.get('detailed_scores', {}).get(score_key, 100) for rep in rep_history]
                avg_scores[score_key] = int(sum(scores) / len(scores)) if scores else 100
        
        # Recalculate overall from averages
        avg_scores['overall'] = int(
            avg_scores['knee_alignment'] * 0.25 +
            avg_scores['back_position'] * 0.30 +
            avg_scores['hip_alignment'] * 0.20 +
            avg_scores['range_of_motion'] * 0.15 +
            avg_scores['tempo'] * 0.10
        )
    
    # Provide detailed workout summary
    summary = {
        "exercise_name": state['exercise'],
        "total_reps": state['total_good_reps'],
        "total_sets": state['current_set'],
        "best_quality": state['best_rep_quality'],
        "average_quality": state['rep_quality_score'],
        "calories": round(state['calories_burned'], 1),
        "duration": workout_duration,
        "average_rep_time": round(state['average_rep_time'], 2) if state['average_rep_time'] > 0 else 0,
        "form_score": state['form_score'],
        "message": f"Workout complete! {state['total_good_reps']} quality reps! 🎉",
        # NEW: Detailed form analysis
        "form_scores": avg_scores,
        "injury_alerts": state.get('injury_risks', []),
        "rep_data": rep_history
    }
    
    # Get user token from request headers and save to backend
    auth_header = request.headers.get('Authorization')
    if auth_header:
        try:
            # Save performance data (existing)
            save_to_backend(summary, auth_header)
            # Save form analysis data (new)
            save_form_analysis(summary, auth_header)
        except Exception as e:
            print(f"Failed to save to backend: {e}")
    
    return jsonify({"status": "stopped", "summary": summary})

def save_to_backend(summary, auth_token):
    """Save workout performance data to Node.js backend"""
    try:
        # Prepare data in the format expected by backend
        performance_data = {
            "workoutName": summary['exercise_name'],
            "sets": [{
                "set": summary['total_sets'],
                "rep": summary['total_reps'],
                "weight": 0  # OpenCV doesn't track weight
            }],
            "duration": summary.get('duration', 0),
            "calories": summary.get('calories', 0)
        }
        
        # Send POST request to Node.js backend
        headers = {
            'Authorization': auth_token,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{NODEJS_BACKEND_URL}/add-performance",
            json=performance_data,
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            print(f"✅ Performance data saved to backend: {summary['exercise_name']} - {summary['total_reps']} reps")
            return True
        else:
            print(f"❌ Failed to save to backend: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error saving to backend: {str(e)}")
        return False

def save_form_analysis(summary, auth_token):
    """Save detailed form analysis data to Node.js backend"""
    try:
        # Clean rep data - ensure proper structure and remove invalid data
        rep_data = summary.get('rep_data', [])
        cleaned_rep_data = []
        
        for rep in rep_data:
            # Only include reps with valid data
            if isinstance(rep, dict) and rep.get('rep_number') and rep.get('score'):
                cleaned_rep = {
                    'repNumber': rep.get('rep_number'),
                    'quality': rep.get('quality', 'fair'),
                    'score': rep.get('score'),
                    'duration': rep.get('duration', 0),
                    'issues': rep.get('issues', [])
                }
                # Ensure quality is valid
                if cleaned_rep['quality'] not in ['excellent', 'good', 'fair', 'poor', 'incomplete']:
                    cleaned_rep['quality'] = 'fair'
                cleaned_rep_data.append(cleaned_rep)
        
        # Clean injury alerts
        injury_alerts = summary.get('injury_alerts', [])
        cleaned_alerts = []
        
        for alert in injury_alerts:
            if isinstance(alert, dict):
                cleaned_alert = {
                    'severity': alert.get('severity', 'low'),
                    'issue': alert.get('issue', ''),
                    'recommendation': alert.get('recommendation', '')
                }
                # Ensure severity is valid
                if cleaned_alert['severity'] not in ['low', 'medium', 'high', 'critical']:
                    cleaned_alert['severity'] = 'low'
                cleaned_alerts.append(cleaned_alert)
        
        # Prepare form analysis data
        form_data = {
            "exercise": summary['exercise_name'],
            "totalReps": summary['total_reps'],
            "sessionDuration": summary.get('duration', 0),
            "formScores": summary.get('form_scores', {}),
            "injuryAlerts": cleaned_alerts,
            "repData": cleaned_rep_data
        }
        
        # Send POST request to form analysis endpoint
        headers = {
            'Authorization': auth_token,
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            f"{NODEJS_BACKEND_URL}/form-analysis/save",
            json=form_data,
            headers=headers,
            timeout=5
        )
        
        if response.status_code in [200, 201]:
            print(f"✅ Form analysis saved: {summary['exercise_name']} - Overall score: {form_data['formScores'].get('overall', 'N/A')}")
            return True
        else:
            print(f"❌ Failed to save form analysis: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error saving form analysis: {str(e)}")
        return False

@app.route("/reset", methods=["POST"])
def reset():
    state.update({
        'reps': 0,
        'stage': 'down',
        'feedback': f"{get_random_message('start')} Reset and ready!",
        'angle': 0,
        'calories_burned': 0,
        'current_set': 1,
        'in_rest': False,
        'rest_end_time': 0.0,
        'rep_quality_score': 0,
        'total_good_reps': 0,
        'consecutive_good_reps': 0,
        'last_motivation_rep': 0,
        'form_issues': [],
        'last_feedback_time': 0,
        'average_rep_time': 0,
        'best_rep_quality': 0
    })
    state['angle_history'].clear()
    state['rep_times'].clear()
    return jsonify({"status": "reset", "message": "Ready for another round! 🔥"})

@app.route("/video_feed")
def video_feed():
    if not state['is_running']:
        return "Stream not running", 400

    def generate():
        while state['is_running']:
            if state['latest_frame'] is None:
                continue
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + state['latest_frame'] + b'\r\n')

    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")

@app.route("/status")
def status():
    return jsonify({
        "exercise": state['exercise'],
        "set": state['current_set'],
        "total_sets": state['total_sets'],
        "reps": state['reps'],
        "feedback": state['feedback'],
        "calories": round(state['calories_burned'], 1),
        "time": state['total_workout_time'],
        "angle": state['angle'],
        "fps": state['fps'],
        "target_reps": state['target_reps'],
        "quality_score": state['rep_quality_score'],
        "consecutive_good_reps": state['consecutive_good_reps'],
        "total_good_reps": state['total_good_reps'],
        "form_issues": state['form_issues'],
        "average_rep_time": round(state['average_rep_time'], 1) if state['average_rep_time'] else 0,
        "best_quality": state['best_rep_quality'],
        "in_rest": state['in_rest'],
        "correct_reps_only": True,
        # NEW: Detailed form analysis
        "detailed_scores": state.get('detailed_scores', {}),
        "injury_alert": state.get('active_injury_alert'),
        "form_trend": state.get('form_trend', 'stable')
    })

@app.route("/motivation", methods=["POST"])
def get_motivation():
    """Endpoint to get random motivation message"""
    message_types = ['encouragement', 'push_harder']
    message_type = random.choice(message_types)
    return jsonify({
        "message": get_random_message(message_type),
        "type": message_type
    })

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    debug_mode = os.environ.get('FLASK_ENV') != 'production'
    app.run(host='0.0.0.0', port=port, debug=debug_mode, threaded=True)