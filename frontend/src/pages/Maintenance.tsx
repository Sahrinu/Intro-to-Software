import { useState, useEffect } from 'react';
import { maintenanceAPI, MaintenanceRequest } from '../services/api';

const Maintenance = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    priority: 'medium',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await maintenanceAPI.getAll();
      setRequests(data);
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
      await maintenanceAPI.create(formData);
      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        location: '',
        priority: 'medium',
      });
      await loadRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Maintenance Requests</h2>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          New Request
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : requests.length === 0 ? (
        <p className="loading">No maintenance requests found.</p>
      ) : (
        <div className="list-container">
          {requests.map((request) => (
            <div key={request.id} className="list-item">
              <div className="list-item-header">
                <div className="list-item-title">{request.title}</div>
                <span className={`list-item-status status-${request.status}`}>
                  {request.status}
                </span>
              </div>
              <div className="list-item-meta">
                {request.description}
                <br />📍 {request.location}
                <br />Priority: {request.priority}
                {request.assigned_name && (
                  <>
                    <br />Assigned to: {request.assigned_name}
                  </>
                )}
                <br />Created: {new Date(request.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <span className="close" onClick={() => setShowModal(false)}>
              &times;
            </span>
            <h3>Submit Maintenance Request</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="maintenanceTitle">Title</label>
                <input
                  type="text"
                  id="maintenanceTitle"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="maintenanceDescription">Description</label>
                <textarea
                  id="maintenanceDescription"
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="maintenanceLocation">Location</label>
                <input
                  type="text"
                  id="maintenanceLocation"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="maintenancePriority">Priority</label>
                <select
                  id="maintenancePriority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary">
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;


