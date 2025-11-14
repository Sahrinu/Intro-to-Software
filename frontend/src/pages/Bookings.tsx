import { useState, useEffect } from 'react';
import { bookingsAPI, Booking } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    resource_type: 'room',
    resource_name: '',
    start_time: '',
    end_time: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await bookingsAPI.getAll();
      setBookings(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingId) {
        await bookingsAPI.update(editingId, formData);
        setEditingId(null);
      } else {
        await bookingsAPI.create(formData);
      }
      setShowModal(false);
      setFormData({
        resource_type: 'room',
        resource_name: '',
        start_time: '',
        end_time: '',
      });
      await loadBookings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (booking: Booking) => {
    setEditingId(booking.id);
    setFormData({
      resource_type: booking.resource_type,
      resource_name: booking.resource_name,
      start_time: booking.start_time,
      end_time: booking.end_time,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await bookingsAPI.delete(id);
        await loadBookings();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      resource_type: 'room',
      resource_name: '',
      start_time: '',
      end_time: '',
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Resource Bookings</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          New Booking
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : bookings.length === 0 ? (
        <p className="loading">No bookings found.</p>
      ) : (
        <div className="list-container">
          {bookings.map((booking) => (
            <div key={booking.id} className="list-item">
              <div className="list-item-header">
                <div className="list-item-title">
                  {booking.resource_name} ({booking.resource_type})
                </div>
                <div className="list-item-actions-group">
                  <span className={`list-item-status status-${booking.status}`}>
                    {booking.status}
                  </span>
                  {user && booking.user_id === user.id && (
                    <div className="list-item-actions">
                      <button
                        className="btn btn-small"
                        onClick={() => handleEdit(booking)}
                        title="Edit booking"
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => handleDelete(booking.id)}
                        title="Delete booking"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="list-item-meta">
                {new Date(booking.start_time).toLocaleString()} -{' '}
                {new Date(booking.end_time).toLocaleString()}
                {booking.user_name && <><br />Booked by: {booking.user_name}</>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => closeModal()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close" onClick={() => closeModal()}>
              &times;
            </span>
            <h3>{editingId ? 'Edit Booking' : 'Create New Booking'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="resourceType">Resource Type</label>
                <select
                  id="resourceType"
                  value={formData.resource_type}
                  onChange={(e) =>
                    setFormData({ ...formData, resource_type: e.target.value })
                  }
                  required
                >
                  <option value="room">Room</option>
                  <option value="equipment">Equipment</option>
                  <option value="facility">Facility</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="resourceName">Resource Name</label>
                <input
                  type="text"
                  id="resourceName"
                  value={formData.resource_name}
                  onChange={(e) =>
                    setFormData({ ...formData, resource_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="startTime">Start Time</label>
                <input
                  type="datetime-local"
                  id="startTime"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endTime">End Time</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update Booking' : 'Create Booking'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;


