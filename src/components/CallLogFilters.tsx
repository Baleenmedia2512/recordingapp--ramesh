import React from 'react';
import { useStore } from '@/store';
import { CallType } from '@/types';

const CallLogFilters: React.FC = () => {
  const { filters, setFilters } = useStore();

  const callTypes: (CallType | 'all')[] = ['all', 'incoming', 'outgoing', 'missed', 'rejected'];

  const handleCallTypeChange = (type: CallType | 'all') => {
    setFilters({ ...filters, callType: type });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, searchQuery: e.target.value });
  };

  const handleRecordingFilterChange = (hasRecording: boolean | undefined) => {
    setFilters({ ...filters, hasRecording });
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, dateFrom: e.target.value });
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, dateTo: e.target.value });
  };

  const clearFilters = () => {
    setFilters({
      callType: 'all',
      searchQuery: '',
      hasRecording: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        <button
          onClick={clearFilters}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            type="text"
            value={filters.searchQuery || ''}
            onChange={handleSearchChange}
            placeholder="Phone number or name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Call Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Call Type
          </label>
          <select
            value={filters.callType || 'all'}
            onChange={(e) => handleCallTypeChange(e.target.value as CallType | 'all')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {callTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={filters.dateFrom || ''}
            onChange={handleDateFromChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={filters.dateTo || ''}
            onChange={handleDateToChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Recording Filter */}
      <div className="mt-4 flex gap-4">
        <label className="flex items-center">
          <input
            type="radio"
            name="recording"
            checked={filters.hasRecording === undefined}
            onChange={() => handleRecordingFilterChange(undefined)}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">All</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name="recording"
            checked={filters.hasRecording === true}
            onChange={() => handleRecordingFilterChange(true)}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">With Recording</span>
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            name="recording"
            checked={filters.hasRecording === false}
            onChange={() => handleRecordingFilterChange(false)}
            className="mr-2"
          />
          <span className="text-sm text-gray-700">Without Recording</span>
        </label>
      </div>
    </div>
  );
};

export default CallLogFilters;
