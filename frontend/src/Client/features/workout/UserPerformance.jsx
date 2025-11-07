import React, { useEffect, useState } from "react";
import axios from "axios";
import config from "../../../config/config";

const UserPerformance = () => {
  const [user, setUser] = useState({});
  const [perform, setPerform] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user data from localStorage
  const fetchUserData = async () => {
    try {
      const storedData = localStorage.getItem("userData");
      if (storedData) {
        const parsedUser = JSON.parse(storedData);
        setUser(parsedUser);
        return parsedUser;
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
    return {};
  };

  // Fetch performance data from API based on user ID
  const fetchPerformance = async (userId) => {
    try {
      const accessToken = localStorage.getItem('accessToken'); // Get token from localStorage
      const response = await axios.get(
        `${config.backendUrl}/workoutPerformance/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (response && response.data) {
        setPerform(response.data.users[0].workouts);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const userData = await fetchUserData();
      if (userData?._id) {
        fetchPerformance(userData._id);
      }
    };
    fetchData();
  }, []);

  // Helper function to format the date in a professional way
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Group workouts by date and consolidate exercises for each date
  const groupWorkoutsByDate = (workouts) => {
    return workouts.reduce((grouped, workout) => {
      const date = workout.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(...workout.todayExercises);
      return grouped;
    }, {});
  };

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center space-x-2 h-full">
      <div className="w-4 h-4 bg-white rounded-full animate-bounce"></div>
      <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
      <div className="w-4 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
    </div>
  );

  const NotFound = () => (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No Workout Data Found</h3>
      <p className="text-gray-400">Start tracking your workouts to see your performance data here.</p>
    </div>
  );

  return (
    <div className="min-h-screen w-screen bg-black flex flex-col">
      {/* Header with gradient background */}
      <header className="w-full bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Performance Dashboard
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Track your progress, analyze your workouts, and achieve your fitness goals
            </p>
            {user.name && (
              <div className="mt-6 inline-flex items-center px-4 py-2 bg-gray-800 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                <span className="text-white font-medium">Welcome back, {user.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-full text-center py-20">
            <LoadingSpinner />
            <p className="text-gray-400 text-xl mt-6 animate-pulse">
              Loading your performance data...
            </p>
          </div>
        ) : perform && Object.keys(groupWorkoutsByDate(perform)).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupWorkoutsByDate(perform)).map(
              ([date, exercises], index) => (
                <div key={index} className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700">
                  {/* Date header */}
                  <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-8 py-6 border-b border-gray-600">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-bold text-white flex items-center">
                        <svg className="w-6 h-6 mr-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(date)}
                      </h3>
                      <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
                        {exercises.length} exercise{exercises.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>

                  {/* Exercises */}
                  <div className="p-8 space-y-8">
                    {exercises.map((exercise, exIndex) => (
                      <div key={exIndex} className="bg-black rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                        <div className="flex items-center mb-6">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-4">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <h4 className="text-2xl font-bold text-white">
                            {exercise.workoutName}
                          </h4>
                        </div>

                        {/* Sets grid */}
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {exercise.sets.map((set, setIndex) => (
                            <div
                              key={setIndex}
                              className="bg-gradient-to-br from-gray-800 to-gray-700 p-5 rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-200 hover:transform hover:scale-105"
                            >
                              <div className="text-center">
                                <div className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                                  Set {set.set}
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">Reps:</span>
                                    <span className="text-lg font-bold text-blue-400">{set.rep}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-300">Weight:</span>
                                    <span className="text-lg font-bold text-green-400">{set.weight} kg</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Exercise summary */}
                        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-sm text-gray-400">Total Sets</div>
                              <div className="text-xl font-bold text-white">{exercise.sets.length}</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">Total Reps</div>
                              <div className="text-xl font-bold text-white">
                                {exercise.sets.reduce((total, set) => total + set.rep, 0)}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-400">Max Weight</div>
                              <div className="text-xl font-bold text-white">
                                {Math.max(...exercise.sets.map(set => set.weight))} kg
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col justify-center items-center h-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700">
            <NotFound />
          </div>
        )}
      </main>
    </div>
  );
};

export default UserPerformance;