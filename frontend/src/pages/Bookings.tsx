import { useState, useEffect } from 'react';
import { bookingsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type Booking = {
  id: number;
  user_id: number;
  user_name?: string;
  resource_type: string;
  resource_name: string;
  start_time: string;
  end_time: string;
  status: 'pending'|'approved'|'rejected'|'completed';
};

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<{id:number;start:string;end:string;status:string}[]>([]);
  const [checkingAvail, setCheckingAvail] = useState(false);

  const [formData, setFormData] = useState({
    resource_type: 'room',
    resource_name: '',
    start_time: '',
    end_time: '',
  });

  useEffect(() => { loadBookings(); }, []);

  const loadBookings = async () => {
    try {
      const data = await bookingsAPI.getAll();
      setBookings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const s = new Date(formData.start_time);
    const e = new Date(formData.end_time);
    if (Number.isNaN(+s) || Number.isNaN(+e)) return 'Please pick valid start/end times.';
    if (s >= e) return 'Start time must be before end time.';
    if (!formData.resource_name.trim()) return 'Resource name is required.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy([]);
    const v = validateForm();
    if (v) { setError(v); return; }
    try {
      if (editingId) {
        await bookingsAPI.update(editingId, formData);
        setEditingId(null);
      } else {
        await bookingsAPI.create(formData);
      }
      setShowModal(false);
      setFormData({ resource_type: 'room', resource_name: '', start_time: '', end_time: '' });
      await loadBookings();
    } catch (err: any) {
      if (err?.status === 409) setError('That time overlaps an existing booking.');
      else setError(err?.message || 'Could not save booking.');
    }
  };

  const handleEdit = (b: Booking) => {
    setEditingId(b.id);
    setFormData({
      resource_type: b.resource_type,
      resource_name: b.resource_name,
      start_time: b.start_time.slice(0, 16), // for datetime-local
      end_time: b.end_time.slice(0, 16),
    });
    setShowModal(true);
    setBusy([]);
  };

  const handleDelete = async (id: number, status: Booking['status']) => {
    if (status === 'approved' && user?.role !== 'admin' && user?.role !== 'staff') {
      setError('Approved bookings cannot be deleted by requester.');
      return;
    }
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        await bookingsAPI.delete(id);
        await loadBookings();
      } catch (err: any) {
        setError(err.message || 'Delete failed.');
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ resource_type: 'room', resource_name: '', start_time: '', end_time: '' });
    setBusy([]);
  };

  const filteredBookings = bookings.filter((b) =>
    b.resource_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const checkAvailability = async () => {
    setError('');
    setBusy([]);
    const v = validateForm();
    if (v) { setError(v); return; }
    try {
      setCheckingAvail(true);
      const res = await bookingsAPI.getAvailability(formData.resource_name, formData.start_time, formData.end_time);
      setBusy(res.busy);
    } catch (e: any) {
      setError(e.message || 'Failed to check availability.');
    } finally {
      setCheckingAvail(false);
    }
  };

  // Admin actions
  const approve = async (id: number) => {
    try { await bookingsAPI.setStatus(id, 'approved'); await loadBookings(); }
    catch (e: any) { setError(e.message || 'Approve failed.'); }
  };
  const reject = async (id: number) => {
    try { await bookingsAPI.setStatus(id, 'rejected'); await loadBookings(); }
    catch (e: any) { setError(e.message || 'Reject failed.'); }
  };


  

  return (
    <div className="page">
      <div className="page-header">
        <h2>Resource Bookings</h2>
        <div className="header-actions">
          <input
            type="text"
            className="search-input"
            placeholder="Search by resource name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>New Booking</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : filteredBookings.length === 0 ? (
        <p className="loading">No bookings found.</p>
      ) : (
        <div className="list-container">
          {filteredBookings.map((booking) => (
            <div key={booking.id} className="list-item">
              <div className="list-item-header">
                <div className="list-item-title">
                  {booking.resource_name} ({booking.resource_type})
                </div>
                <div className="list-item-actions-group">
                  <span className={`list-item-status status-${booking.status}`}>
                    {booking.status}
                  </span>

                  {/* owner controls, but restrict for approved unless admin/staff */}
                  {user && booking.user_id === user.id && (
                    (booking.status !== 'approved' || (user.role === 'admin' || user.role === 'staff')) && (
                      <div className="list-item-actions">
                        <button className="btn btn-small" onClick={() => handleEdit(booking)} title="Edit booking">Edit</button>
                        <button className="btn btn-small btn-danger" onClick={() => handleDelete(booking.id, booking.status)} title="Delete booking">Delete</button>
                      </div>
                    )
                  )}

                  {/* Admin controls */}
                  {(user?.role === 'admin' || user?.role === 'staff') && booking.status === 'pending' && (
                    <div className="list-item-actions">
                      <button className="btn btn-small" onClick={() => approve(booking.id)}>Approve</button>
                      <button className="btn btn-small btn-danger" onClick={() => reject(booking.id)}>Reject</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="list-item-meta">
                {new Date(booking.start_time).toLocaleString()} - {new Date(booking.end_time).toLocaleString()}
                {booking.user_name && (<><br/>Booked by: {booking.user_name}</>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close" onClick={closeModal}>&times;</span>
            <h3>{editingId ? 'Edit Booking' : 'Create New Booking'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="resourceType">Resource Type</label>
                <select
                  id="resourceType"
                  value={formData.resource_type}
                  onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="startTime">Start Time</label>
                <input
                  type="datetime-local"
                  id="startTime"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endTime">End Time</label>
                <input
                  type="datetime-local"
                  id="endTime"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  required
                />
              </div>

              {/* Availability check */}
              <div className="form-group">
                <button type="button" className="btn" onClick={checkAvailability} disabled={checkingAvail}>
                  {checkingAvail ? 'Checking…' : 'Check availability'}
                </button>
                {busy.length === 0 && formData.resource_name && formData.start_time && formData.end_time && !checkingAvail && (
                  <span className="hint" style={{ marginLeft: 8 }}>Looks free in that window.</span>
                )}
              </div>
              {busy.length > 0 && (
                <div className="notice">
                  <strong>Busy in this window:</strong>
                  <ul>
                    {busy.map((b) => (
                      <li key={b.id}>
                        {new Date(b.start).toLocaleString()} – {new Date(b.end).toLocaleString()} ({b.status})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
