import { useState } from 'react';
import Modal from '../common/Modal';
import Alert from '../common/Alert';
import Spinner from '../common/Spinner';
import { FOOD_CATEGORIES, UNITS } from '../../utils/constants';
import { createFoodRequest } from '../../services/foodRequestService';
import { extractErrorMessage } from '../../utils/formatters';

export default function FoodRequestFormModal({ isOpen, onClose, onSuccess }) {
  const now = new Date();
  const formatForInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const neededDefault = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    foodCategory: FOOD_CATEGORIES.PREPARED_MEAL,
    description: '',
    totalQuantity: 25,
    unit: UNITS.MEALS,
    addressText: 'Community Kitchen Shelter, 456 Hope Blvd',
    latitude: 40.7306,
    longitude: -73.9352,
    neededBy: formatForInput(neededDefault),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        foodCategory: form.foodCategory,
        description: form.description.trim() || undefined,
        totalQuantity: Number(form.totalQuantity),
        unit: form.unit,
        deliveryLocation: {
          type: 'Point',
          coordinates: [Number(form.longitude), Number(form.latitude)],
        },
        neededBy: new Date(form.neededBy).toISOString(),
      };

      const res = await createFoodRequest(payload);
      onSuccess?.(res);
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Food Request" maxWidth="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor="reqFoodCategory">Food Category *</label>
            <select
              id="reqFoodCategory"
              name="foodCategory"
              value={form.foodCategory}
              onChange={handleChange}
              className="form-input"
              required
            >
              {Object.values(FOOD_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="form-label" htmlFor="reqTotalQuantity">Quantity Needed *</label>
              <input
                id="reqTotalQuantity"
                name="totalQuantity"
                type="number"
                min="0.1"
                step="any"
                value={form.totalQuantity}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="reqUnit">Unit *</label>
              <select
                id="reqUnit"
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className="form-input"
                required
              >
                {Object.values(UNITS).map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="reqDescription">Description (optional)</label>
          <textarea
            id="reqDescription"
            name="description"
            rows="2"
            value={form.description}
            onChange={handleChange}
            placeholder="e.g. Urgent evening dinner service for 25 shelter residents"
            className="form-input"
          />
        </div>

        {/* Delivery Location */}
        <div className="p-3 bg-surface/70 border border-surface-border rounded-lg space-y-3">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Delivery Destination</p>
          <div>
            <label className="form-label" htmlFor="reqAddressText">Delivery Address</label>
            <input
              id="reqAddressText"
              name="addressText"
              type="text"
              value={form.addressText}
              onChange={handleChange}
              placeholder="e.g. Community Kitchen, 456 Hope Blvd"
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="form-label" htmlFor="reqLatitude">Latitude</label>
              <input
                id="reqLatitude"
                name="latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="form-label" htmlFor="reqLongitude">Longitude</label>
              <input
                id="reqLongitude"
                name="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="reqNeededBy">Needed By Date & Time *</label>
          <input
            id="reqNeededBy"
            name="neededBy"
            type="datetime-local"
            value={form.neededBy}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>

        <div className="pt-3 flex justify-end gap-3 border-t border-surface-border">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? <Spinner size={16} /> : 'Save Draft Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
