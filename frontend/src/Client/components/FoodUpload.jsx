import React, { useState } from 'react';
import { Camera, Upload, X, Check, Loader } from 'lucide-react';
import axios from 'axios';
import config from '../../config/config';

const FoodUpload = ({ onFoodLogged, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [foodDescription, setFoodDescription] = useState('');
  const [mealType, setMealType] = useState('Snack');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!foodDescription) {
      setError('Please describe the food');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('foodImage', selectedFile);
      }
      formData.append('foodDescription', foodDescription);
      formData.append('mealType', mealType);
      formData.append('notes', notes);

      const accessToken = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${config.backendUrl}/food-log/upload`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        onFoodLogged(response.data.data);
        // Reset form
        setSelectedFile(null);
        setPreviewUrl(null);
        setFoodDescription('');
        setNotes('');
        setMealType('Snack');
      }
    } catch (err) {
      console.error('Error uploading food:', err);
      setError(err.response?.data?.message || 'Failed to log food');
    } finally {
      setIsLoading(false);
    }
  };

  const clearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <Camera className="mr-3 text-green-400" size={28} />
            Log Food
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-gray-300 mb-2 font-medium">
              Food Image (Optional)
            </label>
            {!previewUrl ? (
              <label className="border-2 border-dashed border-gray-600 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 transition">
                <Upload className="text-gray-400 mb-3" size={48} />
                <span className="text-gray-400 text-center">
                  Click to upload or drag and drop
                </span>
                <span className="text-gray-500 text-sm mt-1">
                  PNG, JPG up to 10MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Food preview"
                  className="w-full h-64 object-cover rounded-xl"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Food Description */}
          <div>
            <label className="block text-gray-300 mb-2 font-medium">
              Food Description *
            </label>
            <textarea
              value={foodDescription}
              onChange={(e) => setFoodDescription(e.target.value)}
              placeholder="E.g., Grilled chicken breast with rice and vegetables"
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-green-400"
              rows="3"
              required
            />
            <p className="text-gray-500 text-sm mt-1">
              Describe the food in detail for accurate nutrition analysis
            </p>
          </div>

          {/* Meal Type */}
          <div>
            <label className="block text-gray-300 mb-2 font-medium">
              Meal Type
            </label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-green-400"
            >
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch">Lunch</option>
              <option value="Dinner">Dinner</option>
              <option value="Snack">Snack</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-gray-300 mb-2 font-medium">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg p-3 focus:outline-none focus:border-green-400"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg hover:opacity-90 transition font-medium flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin mr-2" size={20} />
                  Analyzing...
                </>
              ) : (
                <>
                  <Check className="mr-2" size={20} />
                  Log Food
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FoodUpload;
