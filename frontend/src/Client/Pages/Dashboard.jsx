import React, { useState, useEffect } from "react";
import axios from "axios";
import config from '../../config/config';

import {
  Activity,
  TrendingUp,
  Heart,
  PlusCircle,
  Calendar,
  Users,
  BarChart,
  Dumbbell,
} from "lucide-react";
import { Link } from "react-router-dom";

// console.log(user);

const Dashboard = () => {
  const [name, setName] = useState("");
  const [performanceData, setPerformanceData] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const storedData = localStorage.getItem("userData");
    if (storedData) {
      const user = JSON.parse(storedData);
      console.log("Retrieved user data:", user);
      setName(user.fullName || "");
      setUserId(user._id);
    } else {
      console.log("No user data found in localStorage.");
    }
  }, []);

  // Fetch performance data and form analysis
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      
      try {
        const accessToken = localStorage.getItem('accessToken');
        
        // Fetch performance data with cache busting
        const perfResponse = await axios.get(
          `${config.backendUrl}/workoutPerformance/${userId}?t=${Date.now()}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        console.log("Dashboard performance response:", perfResponse.data);
        console.log("Dashboard performance response:", perfResponse.data);
        if (perfResponse.data.users && perfResponse.data.users.length > 0) {
          setPerformanceData(perfResponse.data.users[0]);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    
    fetchData();
  }, [userId]);
  // Calculate stats from performance data
  const getStats = () => {
    if (!performanceData || !performanceData.workouts || performanceData.workouts.length === 0) {
      return { totalWorkouts: 0, totalReps: 0, totalDuration: 0, totalCalories: 0, recentExercise: 'None' };
    }

    const totalWorkouts = performanceData.workouts.length;
    let totalReps = 0;
    let totalDuration = 0;
    let totalCalories = 0;
    let recentExercise = 'None';

    if (performanceData.workouts.length > 0) {
      // Sort workouts by date (most recent first)
      const sortedWorkouts = [...performanceData.workouts].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      const recentWorkout = sortedWorkouts[0];
      if (recentWorkout.todayExercises && recentWorkout.todayExercises.length > 0) {
        // Get the most recent exercise (last one in the array)
        const latestExercise = recentWorkout.todayExercises[recentWorkout.todayExercises.length - 1];
        recentExercise = latestExercise.workoutName;
        
        // Calculate totals from all workouts
        performanceData.workouts.forEach(workout => {
          workout.todayExercises?.forEach(exercise => {
            exercise.sets?.forEach(set => {
              totalReps += set.rep || 0;
            });
            totalDuration += exercise.duration || 0;
            totalCalories += exercise.calories || 0;
          });
        });
      }
    }

    return { totalWorkouts, totalReps, totalDuration, totalCalories, recentExercise };
  };

  const stats = getStats();

  return (
    <div className="flex flex-col min-h-screen w-screen overflow-x-hidden bg-black text-gray-100">
    <div className="w-full max-w-screen-xl mx-auto flex-1 px-4 py-10 sm:px-6 md:px-8 lg:px-16">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back, {name || "User"}!
        </h1>
        <p className="text-gray-400">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            icon={<Dumbbell className="h-8 w-8 text-blue-400" />}
            title="Total Workouts"
            value={stats.totalWorkouts.toString()}
            subtitle="Completed sessions"
          />
          <StatCard
            icon={<TrendingUp className="h-8 w-8 text-green-400" />}
            title="Total Reps"
            value={stats.totalReps.toString()}
            subtitle="All time"
          />
          <StatCard
            icon={<Activity className="h-8 w-8 text-purple-400" />}
            title="Time Spent"
            value={stats.totalDuration > 0 ? `${Math.floor(stats.totalDuration / 60)}m` : '0m'}
            subtitle="Total duration"
          />
          <StatCard
            icon={<Heart className="h-8 w-8 text-red-400" />}
            title="Calories Burned"
            value={stats.totalCalories > 0 ? `${Math.round(stats.totalCalories)}` : '0'}
            subtitle="Total kcal"
          />
          <StatCard
            icon={<Activity className="h-8 w-8 text-purple-400" />}
            title="Recent Exercise"
            value={stats.recentExercise}
            subtitle="Last workout"
          />
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <QuickAction
            icon={<PlusCircle className="h-6 w-6 text-gray-200" />}
            title="Create Workout Plan"
            description="Generate a personalized workout plan based on your goals"
            link="/generateWorout"
          />
          <QuickAction
            icon={<PlusCircle className="h-6 w-6 text-gray-200" />}
            title="Create Diet Plan"
            description="Generate a personalized workout plan based on your goals"
            link="/dietplan"
          />
          <QuickAction
            icon={<Calendar className="h-6 w-6 text-gray-200" />}
            title="Pose Correction"
            description="Perfect your moves and push your limits with real-time corrections"
            link="/exerciseTracker"
          />
        </div>
      </div>
      <hr />
    </div>
  );
};

const StatCard = ({ icon, title, value, subtitle }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center space-x-4">
          
        {icon}
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <div className="text-3xl font-bold text-gray-100">{value}</div>
          <p className="text-gray-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
};

const QuickAction = ({ icon, title, description, link }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center space-x-4 mb-4">
        {icon}
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <p className="text-gray-400 mb-4">{description}</p>
      <Link
        to={link}
        className="inline-flex items-center justify-center px-4 py-2 border border-transparent border-0 no-underline rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-700 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-700"
      >
        Get Started
      </Link>
    </div>
  );
};

export default Dashboard;
