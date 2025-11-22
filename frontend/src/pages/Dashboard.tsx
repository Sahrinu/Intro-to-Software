import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { bookingsAPI, eventsAPI, maintenanceAPI } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const [bookingCount, setBookingCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [maintenanceCount, setMaintenanceCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [bookings, events, maintenance] = await Promise.all([
          bookingsAPI.getAll().catch(() => []),
          eventsAPI.getAll().catch(() => []),
          maintenanceAPI.getAll().catch(() => []),
        ]);
        setBookingCount(bookings.length);
        setEventCount(events.length);
        const activeMaintenance = maintenance.filter(
          (request) => request.status === 'pending' || request.status === 'in_progress'
        );
        setMaintenanceCount(activeMaintenance.length);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Welcome, {user?.name}!</p>
      </div>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>My Bookings</h3>
            <p>{bookingCount}</p>
          </div>
          <div className="dashboard-card">
            <h3>Upcoming Events</h3>
            <p>{eventCount}</p>
          </div>
          <div className="dashboard-card">
            <h3>Maintenance Requests</h3>
            <p>{maintenanceCount}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;


