import React, { useState, useEffect } from 'react';
import { Plus, Calendar, TrendingUp, Flame, Apple } from 'lucide-react';
import axios from 'axios';
import config from '../../config/config';
import FoodUpload from '../components/FoodUpload';

const NutritionTracker = () => {
  const [showUpload, setShowUpload] = useState(false);
  const [foodLogs, setFoodLogs] = useState([]);
  const [totals, setTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    fiber: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTodayLogs();
  }, []);

  const fetchTodayLogs = async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const response = await axios.get(
        `${config.backendUrl}/food-log/today`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );

      if (response.data.success) {
        setFoodLogs(response.data.data.foodLogs);
        setTotals(response.data.data.totals);
      }
    } catch (error) {
      console.error('Error fetching food logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFoodLogged = (newFood) => {
    setFoodLogs([newFood, ...foodLogs]);
    setTotals({
      calories: totals.calories + newFood.nutrition.calories,
      protein: totals.protein + newFood.nutrition.protein,
      carbs: totals.carbs + newFood.nutrition.carbs,
      fats: totals.fats + newFood.nutrition.fats,
      fiber: totals.fiber + newFood.nutrition.fiber
    });
    setShowUpload(false);
  };

  const handleDeleteFood = async (id) => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      await axios.delete(
        `${config.backendUrl}/food-log/${id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      );
      fetchTodayLogs();
    } catch (error) {
      console.error('Error deleting food log:', error);
    }
  };

  const groupByMealType = (logs) => {
    return logs.reduce((acc, log) => {
      if (!acc[log.mealType]) {
        acc[log.mealType] = [];
      }
      acc[log.mealType].push(log);
      return acc;
    }, {});
  };

  const groupedLogs = groupByMealType(foodLogs);
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-900 via-black to-green-900 border-b border-gray-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Nutrition Tracker</h1>
              <p className="text-gray-400 flex items-center">
                <Calendar className="mr-2" size={16} />
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 rounded-lg hover:opacity-90 transition flex items-center font-medium"
            >
              <Plus className="mr-2" size={20} />
              Log Food
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Daily Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MacroCard
            title="Calories"
            value={Math.round(totals.calories)}
            unit="kcal"
            icon={<Flame className="text-orange-400" size={24} />}
            color="from-orange-500 to-red-500"
          />
          <MacroCard
            title="Protein"
            value={Math.round(totals.protein)}
            unit="g"
            icon={<TrendingUp className="text-blue-400" size={24} />}
            color="from-blue-500 to-cyan-500"
          />
          <MacroCard
            title="Carbs"
            value={Math.round(totals.carbs)}
            unit="g"
            icon={<Apple className="text-yellow-400" size={24} />}
            color="from-yellow-500 to-orange-500"
          />
          <MacroCard
            title="Fats"
            value={Math.round(totals.fats)}
            unit="g"
            icon={<TrendingUp className="text-purple-400" size={24} />}
            color="from-purple-500 to-pink-500"
          />
        </div>

        {/* Food Logs by Meal Type */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-400"></div>
            <p className="text-gray-400 mt-4">Loading your meals...</p>
          </div>
        ) : foodLogs.length === 0 ? (
          <div className="text-center py-20">
            <Apple className="mx-auto text-gray-600 mb-4" size={64} />
            <h3 className="text-2xl font-bold text-gray-400 mb-2">No meals logged today</h3>
            <p className="text-gray-500 mb-6">Start tracking your nutrition by logging your first meal</p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-3 rounded-lg hover:opacity-90 transition inline-flex items-center"
            >
              <Plus className="mr-2" size={20} />
              Log Your First Meal
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {mealTypes.map(mealType => {
              const meals = groupedLogs[mealType] || [];
              if (meals.length === 0) return null;

              return (
                <div key={mealType} className="bg-gray-900 rounded-2xl p-6 border border-gray-700">
                  <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                    {mealType}
                  </h2>
                  <div className="space-y-3">
                    {meals.map(log => (
                      <FoodLogItem
                        key={log._id}
                        log={log}
                        onDelete={handleDeleteFood}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <FoodUpload
          onFoodLogged={handleFoodLogged}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
};

const MacroCard = ({ title, value, unit, icon, color }) => (
  <div className="bg-gray-900 rounded-xl p-6 border border-gray-700 relative overflow-hidden">
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-10`}></div>
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-gray-300 text-sm font-medium">{title}</span>
      </div>
      <div className="text-3xl font-bold text-white">
        {value}<span className="text-lg text-gray-400 ml-1">{unit}</span>
      </div>
    </div>
  </div>
);

const FoodLogItem = ({ log, onDelete }) => (
  <div className="bg-gray-800 rounded-lg p-4 flex items-center gap-4">
    {log.imageUrl && (
      <img
        src={log.imageUrl}
        alt={log.foodName}
        className="w-16 h-16 rounded-lg object-cover"
      />
    )}
    <div className="flex-1">
      <h3 className="font-bold text-lg">{log.foodName}</h3>
      <p className="text-gray-400 text-sm">{log.portion}</p>
      {log.notes && <p className="text-gray-500 text-xs mt-1">{log.notes}</p>}
    </div>
    <div className="text-right">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-orange-400 font-bold">{Math.round(log.nutrition.calories)}</div>
          <div className="text-gray-500 text-xs">cal</div>
        </div>
        <div>
          <div className="text-blue-400 font-bold">{Math.round(log.nutrition.protein)}g</div>
          <div className="text-gray-500 text-xs">protein</div>
        </div>
        <div>
          <div className="text-yellow-400 font-bold">{Math.round(log.nutrition.carbs)}g</div>
          <div className="text-gray-500 text-xs">carbs</div>
        </div>
        <div>
          <div className="text-purple-400 font-bold">{Math.round(log.nutrition.fats)}g</div>
          <div className="text-gray-500 text-xs">fats</div>
        </div>
      </div>
    </div>
    <button
      onClick={() => onDelete(log._id)}
      className="text-red-400 hover:text-red-300 transition"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
);

export default NutritionTracker;
