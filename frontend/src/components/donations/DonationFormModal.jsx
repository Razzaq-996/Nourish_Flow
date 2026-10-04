import { useState } from 'react';
import Modal from '../common/Modal';
import Alert from '../common/Alert';
import Spinner from '../common/Spinner';
import { FOOD_CATEGORIES, UNITS } from '../../utils/constants';
import { createDonation } from '../../services/donationService';
import { extractErrorMessage } from '../../utils/formatters';

export default function DonationFormModal({ isOpen, onClose, onSuccess }) {
  // Default dates: available from now, until tomorrow, expires tomorrow evening
  const now = new Date();
  const formatForInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [form, setForm] = useState({
    foodCategory: FOOD_CATEGORIES.PREPARED_MEAL,
    description: '',
    totalQuantity: 10,
    unit: UNITS.MEALS,
    addressText: '123 Rescue Way, Central Hub',
    latitude: 40.7128,
    longitude: -74.0060,
    availableFrom: formatForInput(now),
    availableUntil: formatForInput(tomorrow),
    preparedAt: formatForInput(now),
    expiresAt: formatForInput(dayAfter),
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
        pickupLocation: {
          type: 'Point',
          coordinates: [Number(form.longitude), Number(form.latitude)],
        },
        availableFrom: new Date(form.availableFrom).toISOString(),
        availableUntil: new Date(form.availableUntil).toISOString(),
        preparedAt: form.preparedAt ? new Date(form.preparedAt).toISOString() : undefined,
        expiresAt: new Date(form.expiresAt).toISOString(),
      };

      const res = await createDonation(payload);
      onSuccess?.(res);
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Food Donation" maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor="foodCategory">Food Category *</label>
            <select
              id="foodCategory"
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
              <label className="form-label" htmlFor="totalQuantity">Quantity *</label>
              <input
                id="totalQuantity"
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
              <label className="form-label" htmlFor="unit">Unit *</label>
              <select
                id="unit"
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
          <label className="form-label" htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            name="description"
            rows="2"
            value={form.description}
            onChange={handleChange}
            placeholder="e.g. 50 boxed vegan lunches, packaged in sterile trays"
            className="form-input"
          />
        </div>

        {/* Pickup Location */}
        <div className="p-3 bg-surface/70 border border-surface-border rounded-lg space-y-3">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Pickup Location</p>
          <div>
            <label className="form-label" htmlFor="addressText">Address / Facility Name</label>
            <input
              id="addressText"
              name="addressText"
              type="text"
              value={form.addressText}
              onChange={handleChange}
              placeholder="123 Market St, City Center"
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="form-label" htmlFor="latitude">Latitude</label>
              <input
                id="latitude"
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
              <label className="form-label" htmlFor="longitude">Longitude</label>
              <input
                id="longitude"
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

        {/* Timing Window */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label" htmlFor="availableFrom">Available From *</label>
            <input
              id="availableFrom"
              name="availableFrom"
              type="datetime-local"
              value={form.availableFrom}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="availableUntil">Available Until *</label>
            <input
              id="availableUntil"
              name="availableUntil"
              type="datetime-local"
              value={form.availableUntil}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="preparedAt">Prepared At (optional)</label>
            <input
              id="preparedAt"
              name="preparedAt"
              type="datetime-local"
              value={form.preparedAt}
              onChange={handleChange}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="expiresAt">Expires At *</label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="datetime-local"
              value={form.expiresAt}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>
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
            {loading ? <Spinner size={16} /> : 'Create Draft Donation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
