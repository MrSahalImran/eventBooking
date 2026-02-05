import { useEffect, useMemo, useState } from "react";
import "./App.css";

function App() {
  const apiBase = useMemo(
    () => import.meta.env.VITE_API_URL || "http://localhost:8080",
    [],
  );
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [now, setNow] = useState(() => new Date());

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({ email: "", password: "" });
  const [eventForm, setEventForm] = useState({
    name: "",
    description: "",
    location: "",
    date: "",
    time: "",
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchEvents = async () => {
    setLoadingEvents(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/events`);
      if (!response.ok) {
        throw new Error("Failed to load events");
      }
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Something went wrong");
      setEvents([]); // extra safety
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }
      localStorage.setItem("token", data.token);
      setToken(data.token);
      setMessage("Logged in successfully");
      setLoginForm({ email: "", password: "" });
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Signup failed");
      }
      setMessage("Signup successful. You can log in now.");
      setSignupForm({ email: "", password: "" });
    } catch (err) {
      setError(err.message || "Signup failed");
    }
  };

  const handleCreateEvent = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const combinedDateTime =
        eventForm.date && eventForm.time
          ? `${eventForm.date}T${eventForm.time}`
          : "";
      const payload = {
        name: eventForm.name,
        description: eventForm.description,
        location: eventForm.location,
        dateTime: new Date(combinedDateTime).toISOString(),
      };
      const response = await fetch(`${apiBase}/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not create event");
      }
      setMessage("Event created");
      setEventForm({
        name: "",
        description: "",
        location: "",
        date: "",
        time: "",
      });
      fetchEvents();
    } catch (err) {
      setError(err.message || "Could not create event");
    }
  };

  const handleRegister = async (eventId) => {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/events/${eventId}/register`, {
        method: "POST",
        headers: {
          Authorization: token,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not register");
      }
      setMessage("Registered successfully");
    } catch (err) {
      setError(err.message || "Could not register");
    }
  };

  const handleCancelRegistration = async (eventId) => {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/events/${eventId}/register`, {
        method: "DELETE",
        headers: {
          Authorization: token,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not cancel");
      }
      setMessage("Registration cancelled");
    } catch (err) {
      setError(err.message || "Could not cancel");
    }
  };

  const handleDeleteEvent = async (eventId) => {
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/events/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: token,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Could not delete event");
      }
      setMessage("Event deleted");
      fetchEvents();
    } catch (err) {
      setError(err.message || "Could not delete event");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setMessage("Logged out");
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "Time not available";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }
    return parsed.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">Event Booking</p>
          <h1>Plan and join events with ease</h1>
        </div>
        <div className="header-actions">
          <div className="clock" aria-live="polite">
            <p className="clock-label">Local time</p>
            <p className="clock-time">
              {now.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
          </div>
          <span className={`status ${token ? "status--active" : ""}`}>
            {token ? "Authenticated" : "Guest"}
          </span>
          {token ? (
            <button className="button secondary" onClick={handleLogout}>
              Log out
            </button>
          ) : null}
        </div>
      </header>

      {(message || error) && (
        <div
          className={`banner ${error ? "banner--error" : "banner--success"}`}
        >
          {error || message}
        </div>
      )}

      <section className="grid">
        <div className="card">
          <h2>Log in</h2>
          <form className="form" onSubmit={handleLogin}>
            <label>
              Email
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
              />
            </label>
            <button className="button" type="submit">
              Log in
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Create account</h2>
          <form className="form" onSubmit={handleSignup}>
            <label>
              Email
              <input
                type="email"
                required
                value={signupForm.email}
                onChange={(event) =>
                  setSignupForm((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                value={signupForm.password}
                onChange={(event) =>
                  setSignupForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
              />
            </label>
            <button className="button" type="submit">
              Sign up
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Create event</h2>
          <form className="form" onSubmit={handleCreateEvent}>
            <label>
              Name
              <input
                type="text"
                required
                value={eventForm.name}
                onChange={(event) =>
                  setEventForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Description
              <textarea
                rows="3"
                required
                value={eventForm.description}
                onChange={(event) =>
                  setEventForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Location
              <input
                type="text"
                required
                value={eventForm.location}
                onChange={(event) =>
                  setEventForm((prev) => ({
                    ...prev,
                    location: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Date & time
              <div className="date-time-fields">
                <input
                  type="date"
                  required
                  value={eventForm.date}
                  onChange={(event) =>
                    setEventForm((prev) => ({
                      ...prev,
                      date: event.target.value,
                    }))
                  }
                />
                <input
                  type="time"
                  required
                  value={eventForm.time}
                  onChange={(event) =>
                    setEventForm((prev) => ({
                      ...prev,
                      time: event.target.value,
                    }))
                  }
                />
              </div>
            </label>
            <button className="button" type="submit" disabled={!token}>
              Create event
            </button>
            {!token && <p className="hint">Log in to create events.</p>}
          </form>
        </div>
      </section>

      <section className="card events">
        <div className="events-header">
          <h2>Upcoming events</h2>
          <button className="button secondary" onClick={fetchEvents}>
            Refresh
          </button>
        </div>
        {loadingEvents ? (
          <p>Loading events…</p>
        ) : events.length === 0 ? (
          <p>No events yet. Create one!</p>
        ) : (
          <div className="events-grid">
            {events.map((eventItem) => (
              <article className="event-card" key={eventItem.ID}>
                <div>
                  <h3>{eventItem.Name}</h3>
                  <p className="event-meta">{eventItem.Description}</p>
                </div>
                <div className="event-details">
                  <span>{eventItem.Location}</span>
                  <span>{formatDateTime(eventItem.DateTime)}</span>
                </div>
                <div className="event-actions">
                  <button
                    className="button small"
                    onClick={() => handleRegister(eventItem.ID)}
                    disabled={!token}
                  >
                    Register
                  </button>
                  <button
                    className="button small secondary"
                    onClick={() => handleCancelRegistration(eventItem.ID)}
                    disabled={!token}
                  >
                    Cancel
                  </button>
                  <button
                    className="button small ghost"
                    onClick={() => handleDeleteEvent(eventItem.ID)}
                    disabled={!token}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
