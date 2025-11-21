import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { maintenanceAPI, MaintenanceRequest, usersAPI, User } from '../services/api';

const Maintenance = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'admin' || user?.role === 'maintenance';
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
  const [staff, setStaff] = useState<User[]>([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<number | null>(null);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    if (isManager) {
      loadStaff();
    }
  }, [isManager]);

  const loadRequests = async () => {
    setLoading(true);
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

  const loadStaff = async () => {
    try {
      const data = await usersAPI.getMaintenanceStaff();
      setStaff(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (id: number, status: MaintenanceRequest['status']) => {
    setError('');
    setStatusUpdatingId(id);
    try {
      await maintenanceAPI.updateStatus(id, status);
      await loadRequests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleAssignChange = async (id: number, assignedTo: string) => {
    if (!assignedTo) return;
    setError('');
    setAssigningId(id);
    try {
      await maintenanceAPI.assign(id, Number(assignedTo));
      await loadRequests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigningId(null);
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
                {isManager && request.assigned_name == null && (
                  <>
                    <br />Assigned to: Unassigned
                  </>
                )}
              </div>
              {isManager && (
                <div className="list-item-actions">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={request.status}
                      onChange={(e) =>
                        handleStatusChange(request.id, e.target.value as MaintenanceRequest['status'])
                      }
                      disabled={statusUpdatingId === request.id}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assign</label>
                    <select
                      value={request.assigned_to ?? ''}
                      onChange={(e) => handleAssignChange(request.id, e.target.value)}
                      disabled={assigningId === request.id}
                    >
                      <option value="">Select staff</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
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
