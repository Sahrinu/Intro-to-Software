import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type AppRole = 'admin' | 'faculty' | 'student' | 'staff' | 'maintenance';

const navLinks: Array<{ to: string; label: string; roles: AppRole[] }> = [
  { to: '/dashboard', label: 'Dashboard', roles: ['admin', 'faculty', 'student', 'staff', 'maintenance'] },
  { to: '/bookings', label: 'Bookings', roles: ['admin', 'faculty', 'student', 'staff'] },
  { to: '/events', label: 'Events', roles: ['admin', 'faculty', 'student', 'staff'] },
  { to: '/maintenance', label: 'Maintenance', roles: ['admin', 'faculty', 'student', 'staff', 'maintenance'] },
  { to: '/assistant', label: 'AI Assistant', roles: ['admin', 'faculty', 'student', 'staff', 'maintenance'] },
];

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>Smart Campus</h1>
        </div>
        {user && (
          <div className="nav-center">
            {navLinks
              .filter((link) => link.roles.includes(user.role as AppRole))
              .map((link) => (
                <Link key={link.to} to={link.to}>
                  {link.label}
                </Link>
              ))}
          </div>
        )}
        <div className="nav-right">
          {user ? (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                handleLogout();
              }}
            >
              Logout
            </a>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
