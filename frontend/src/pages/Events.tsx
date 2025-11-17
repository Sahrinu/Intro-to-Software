import { useState, useEffect } from 'react';
import { eventsAPI, Event } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Events = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [clickPopupDay, setClickPopupDay] = useState<number | null>(null);
  const [showClickPopup, setShowClickPopup] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_time: '',
    end_time: '',
    category: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  // close click-popup when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clickPopupDay === null) return;
      const target = e.target as Node;
      const popup = document.querySelector('.hover-popup');
      if (popup && popup.contains(target)) return;
      const dayEl = document.querySelector(`.calendar-day[data-day="${clickPopupDay}"]`);
      if (dayEl && dayEl.contains(target)) return;
      setShowClickPopup(false);
      setClickPopupDay(null);
      setSelectedDay(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [clickPopupDay]);

  const loadEvents = async () => {
    try {
      const data = await eventsAPI.getAll();
      setEvents(data);
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
        await eventsAPI.update(editingId, formData);
        setEditingId(null);
      } else {
        await eventsAPI.create(formData);
      }
      setShowModal(false);
      setFormData({
        title: '',
        description: '',
        location: '',
        start_time: '',
        end_time: '',
        category: '',
      });
      await loadEvents();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingId(event.id);
    setFormData({
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      start_time: event.start_time,
      end_time: event.end_time,
      category: event.category || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsAPI.delete(id);
        await loadEvents();
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      location: '',
      start_time: '',
      end_time: '',
      category: '',
    });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (day: number) => {
    return events.filter((event) => {
      const startDate = new Date(event.start_time);
      const endDate = new Date(event.end_time);
      
      // Create a date object for the current day in the current month
      const currentDate = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        day
      );
      
      // Check if the current day falls within the event's start and end date
      return currentDate >= startDate && currentDate <= endDate;
    });
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
    );
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    const monthName = currentMonth.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });

    // Empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="calendar-day empty"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDate(day);
      const isSelected = selectedDay === day;
      days.push(
        <div
          key={day}
          className={`calendar-day${isSelected ? ' selected' : ''}`}
          data-day={day}
          onClick={() => {
            // toggle click-popup for this day
            if (clickPopupDay === day && showClickPopup) {
              setShowClickPopup(false);
              setClickPopupDay(null);
              setSelectedDay(null);
            } else {
              setClickPopupDay(day);
              setShowClickPopup(true);
              setSelectedDay(day);
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="calendar-day-number">{day}</div>
          <div className="calendar-day-events">
            {dayEvents.slice(0, 2).map((event) => (
              <div key={event.id} className="calendar-event">
                {event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="calendar-event more">+{dayEvents.length - 2}</div>
            )}
          </div>
          {showClickPopup && clickPopupDay === day && (
            <div className="hover-popup">
              {dayEvents.length === 0 ? (
                <div className="hover-empty">No events</div>
              ) : (
                dayEvents.map((ev) => (
                  <div key={ev.id} className="hover-item">
                    <div className="hover-title">{ev.title}</div>
                    <div className="hover-meta">{new Date(ev.start_time).toLocaleString()} - {ev.location || 'No location'}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className ="calendar-wrapper">
        <div className="calendar-container">
          <div className="calendar-header">
            <button onClick={previousMonth} className="btn btn-small">
              ←
            </button>
            <h3>{monthName}</h3>
            <button onClick={nextMonth} className="btn btn-small">
              →
            </button>
          </div>
          <div className="calendar-weekdays">
            <div className="weekday">Sun</div>
            <div className="weekday">Mon</div>
            <div className="weekday">Tue</div>
            <div className="weekday">Wed</div>
            <div className="weekday">Thu</div>
            <div className="weekday">Fri</div>
            <div className="weekday">Sat</div>
          </div>
          <div className="calendar-days">{days}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Events & Scheduling</h2>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`btn btn-small ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              📋 List
            </button>
            <button
              className={`btn btn-small ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              📅 Calendar
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            Create Event
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : viewMode === 'calendar' ? (
        renderCalendar()
      ) : events.length === 0 ? (
        <p className="loading">No events found.</p>
      ) : (
        <div className="list-container">
          {events.map((event) => (
            <div key={event.id} className="list-item">
              <div className="list-item-header">
                <div className="list-item-title">{event.title}</div>
                {user && (event.organizer_id === user.id || user.role === 'admin') && (
                  <div className="list-item-actions">
                    <button
                      className="btn btn-small"
                      onClick={() => handleEdit(event)}
                      title="Edit event"
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(event.id)}
                      title="Delete event"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="list-item-meta">
                {event.description && <>{event.description}<br /></>}
                {event.location && <>📍 {event.location}<br /></>}
                📅 {new Date(event.start_time).toLocaleString()} -{' '}
                {new Date(event.end_time).toLocaleString()}
                {event.organizer_name && (
                  <>
                    <br />Organized by: {event.organizer_name}
                  </>
                )}
                {event.category && (
                  <>
                    <br />Category: {event.category}
                  </>
                )}
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
            <h3>{editingId ? 'Edit Event' : 'Create New Event'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="eventTitle">Title</label>
                <input
                  type="text"
                  id="eventTitle"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="eventDescription">Description</label>
                <textarea
                  id="eventDescription"
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="eventLocation">Location</label>
                <input
                  type="text"
                  id="eventLocation"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label htmlFor="eventStartTime">Start Time</label>
                <input
                  type="datetime-local"
                  id="eventStartTime"
                  value={formData.start_time}
                  onChange={(e) =>
                    setFormData({ ...formData, start_time: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="eventEndTime">End Time</label>
                <input
                  type="datetime-local"
                  id="eventEndTime"
                  value={formData.end_time}
                  onChange={(e) =>
                    setFormData({ ...formData, end_time: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="eventCategory">Category</label>
                <input
                  type="text"
                  id="eventCategory"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                />
              </div>
              <button type="submit" className="btn btn-primary">
                {editingId ? 'Update Event' : 'Create Event'}
              </button>
            </form>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default Events;


