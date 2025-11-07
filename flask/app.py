import cv2
import mediapipe as mp
import numpy as np
import time
from flask import Flask, Response, jsonify
from flask_cors import CORS
from collections import deque
import threading
import random

app = Flask(__name__)
CORS(app)

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
    'best_rep_quality': 0
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
# Enhanced form correction checks
# -----------------------------
def check_detailed_form(landmarks, exercise):
    form_issues = []
    now = time.time()
    
    if exercise == "squat":
        hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
        knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value]
        ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
        left_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value]
        shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]

        # Check depth
        if hip.y < knee.y and state['stage'] == 'down':
            form_issues.append('not_deep')
        
        # Check knee alignment
        if abs(knee.x - ankle.x) > 0.1:
            form_issues.append('knees_cave')
        
        # Check forward lean
        if shoulder.x < hip.x - 0.1:
            form_issues.append('forward_lean')
        
        # Check knee tracking over toes
        if knee.x > ankle.x + 0.15:
            form_issues.append('knees_forward')

    elif exercise == "pushup":
        shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value]
        ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
        elbow = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value]
        wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]

        # Check plank position
        hip_shoulder_diff = abs(hip.y - shoulder.y)
        shoulder_ankle_diff = abs(shoulder.y - ankle.y)
        
        if hip.y > shoulder.y + 0.1:
            form_issues.append('hips_sag')
        elif hip.y < shoulder.y - 0.1:
            form_issues.append('hips_high')
        
        # Check elbow flare
        if abs(elbow.x - shoulder.x) > 0.2:
            form_issues.append('elbows_flare')
        
        # Check hand position
        if abs(wrist.x - shoulder.x) > 0.15:
            form_issues.append('hands_wrong')

    elif exercise == "bicep_curl":
        wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
        elbow = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value]
        shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]

        # Check elbow position
        if elbow.x < shoulder.x - 0.15:
            form_issues.append('elbow_forward')
        
        if elbow.y < shoulder.y - 0.1:
            form_issues.append('elbow_high')
        
        # Check for swinging
        if abs(elbow.x - shoulder.x) > 0.2:
            form_issues.append('swinging')

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
            
            # Only count good quality reps
            if rep_quality in ['excellent', 'good']:
                reps += 1
                state['reps'] = reps
                state['stage'] = 'up'
                state['last_rep_time'] = now
                state['calories_burned'] += cfg['calories_per_rep']
                state['rep_quality_score'] = quality_score
                
                # Track rep timing
                if state['rep_times']:
                    rep_time = now - (state['last_rep_time'] - 0.8)
                    state['rep_times'].append(rep_time)
                    state['average_rep_time'] = sum(state['rep_times']) / len(state['rep_times'])
                
                # Track consecutive good reps
                state['consecutive_good_reps'] += 1
                state['total_good_reps'] += 1
                
                if quality_score > state['best_rep_quality']:
                    state['best_rep_quality'] = quality_score
                
                # Provide motivational feedback based on milestones
                feedback = None
                
                if rep_quality == 'excellent':
                    feedback = f"🌟 EXCELLENT REP #{reps}! Perfect form! {get_random_message('encouragement')}"
                elif rep_quality == 'good':
                    feedback = f"✅ Great rep #{reps}! {get_random_message('encouragement')}"
                
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
                if rep_quality == 'poor':
                    state['feedback'] = "⚠️ Incomplete rep! Focus on full range of motion!"
                else:
                    state['feedback'] = "❌ Rep not counted - improve your form!"

    # Provide form corrections if no recent feedback
    if form_issues and now - state['last_feedback_time'] > 2.0:
        correction = provide_form_feedback(form_issues, exercise)
        if correction:
            state['feedback'] = correction
            state['last_feedback_time'] = now
    
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
    
    # Provide workout summary
    summary = {
        "total_reps": state['total_good_reps'],
        "best_quality": state['best_rep_quality'],
        "calories": round(state['calories_burned'], 1),
        "time": state['total_workout_time'],
        "message": f"Workout complete! {state['total_good_reps']} quality reps! 🎉"
    }
    
    return jsonify({"status": "stopped", "summary": summary})

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
        "reps": state['reps'],  # This is already only correct reps
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
        "correct_reps_only": True  # Indicate that reps count only includes correct form reps
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
    app.run(debug=True, threaded=True)