import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import "./MovieApp.css";

type Tab = "home" | "browse" | "search" | "watchlist" | "login" | "register";

const movies = [
  { id: 1, title: "The Dark Knight", year: 2008, genre: "Action", director: "Christopher Nolan", actors: "Christian Bale, Heath Ledger, Aaron Eckhart", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911BTUgMe1nNaD3.jpg" },
  { id: 2, title: "Inception", year: 2010, genre: "Sci-Fi", director: "Christopher Nolan", actors: "Leonardo DiCaprio, Joseph Gordon-Levitt", poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
  { id: 3, title: "Interstellar", year: 2014, genre: "Sci-Fi", director: "Christopher Nolan", actors: "Matthew McConaughey, Anne Hathaway", poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg" },
  { id: 4, title: "Parasite", year: 2019, genre: "Thriller", director: "Bong Joon-ho", actors: "Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong", poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
  { id: 5, title: "Spider-Man: No Way Home", year: 2021, genre: "Action", director: "Jon Watts", actors: "Tom Holland, Zendaya, Benedict Cumberbatch", poster: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg" },
  { id: 6, title: "The Shawshank Redemption", year: 1994, genre: "Drama", director: "Frank Darabont", actors: "Tim Robbins, Morgan Freeman", poster: "https://image.tmdb.org/t/p/w500/9cjIGRQL0ElAgwIlnfVtbvBCEfB.jpg" },
  { id: 7, title: "Pulp Fiction", year: 1994, genre: "Crime", director: "Quentin Tarantino", actors: "John Travolta, Uma Thurman, Samuel L. Jackson", poster: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg" },
  { id: 8, title: "The Matrix", year: 1999, genre: "Sci-Fi", director: "The Wachowskis", actors: "Keanu Reeves, Laurence Fishburne", poster: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg" },
  { id: 9, title: "Avengers: Endgame", year: 2019, genre: "Action", director: "Russo Brothers", actors: "Robert Downey Jr., Chris Evans, Scarlett Johansson", poster: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg" },
  { id: 10, title: "Joker", year: 2019, genre: "Drama", director: "Todd Phillips", actors: "Joaquin Phoenix, Robert De Niro", poster: "https://image.tmdb.org/t/p/w500/udDclJoHjfjb8Ekgsd4FDteOkCU.jpg" },
  { id: 11, title: "Dune", year: 2021, genre: "Sci-Fi", director: "Denis Villeneuve", actors: "Timothée Chalamet, Zendaya, Oscar Isaac", poster: "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg" },
  { id: 12, title: "Everything Everywhere All at Once", year: 2022, genre: "Comedy", director: "Daniel Kwan, Daniel Scheinert", actors: "Michelle Yeoh, Ke Huy Quan, Jamie Lee Curtis", poster: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg" },
];

const watchlistMovies = movies.slice(0, 4);

function MovieCard({ movie, onPlay }: { movie: typeof movies[0]; onPlay: () => void }) {
  return (
    <div className="mf-card">
      <img src={movie.poster} alt={movie.title} className="mf-card-poster" loading="lazy" />
      <div className="mf-card-body">
        <div className="mf-card-title">{movie.title} ({movie.year})</div>
        <span className="mf-card-genre">{movie.genre}</span>
        <div className="mf-card-actors">Starring: {movie.actors}</div>
        <div className="mf-card-actions">
          <button className="mf-btn mf-btn-play" onClick={onPlay}>Play</button>
          <button className="mf-btn mf-btn-watchlist">+ Watchlist</button>
        </div>
      </div>
    </div>
  );
}

function HomePage({ setTab }: { setTab: (t: Tab) => void }) {
  return (
    <>
      <div className="mf-hero">
        <div className="mf-hero-content">
          <h1>Welcome to MovieFlix</h1>
          <p>Stream thousands of movies and TV shows</p>
          <div className="mf-search-box">
            <input type="text" placeholder="Search movies, actors, genres..." readOnly />
            <button onClick={() => setTab("search")}>Search</button>
          </div>
        </div>
      </div>
      <div className="mf-section">
        <h2>Featured Movies</h2>
        <div className="mf-grid">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} onPlay={() => {}} />
          ))}
        </div>
      </div>
    </>
  );
}

function BrowsePage() {
  return (
    <div className="mf-section">
      <h2>All Movies</h2>
      <table className="mf-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Genre</th>
            <th>Year</th>
            <th>Director</th>
            <th>Actors</th>
            <th>Options</th>
          </tr>
        </thead>
        <tbody>
          {movies.map((m) => (
            <tr key={m.id}>
              <td>{m.title}</td>
              <td>{m.genre}</td>
              <td>{m.year}</td>
              <td>{m.director}</td>
              <td>{m.actors}</td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <button className="mf-btn mf-btn-play" style={{ padding: "6px 14px" }}>Play</button>
                  <button className="mf-btn mf-btn-watchlist" style={{ padding: "6px 14px" }}>+ Watchlist</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const results = query.length > 0
    ? movies.filter((m) =>
        m.title.toLowerCase().includes(query.toLowerCase()) ||
        m.genre.toLowerCase().includes(query.toLowerCase()) ||
        m.director.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="mf-section">
      <h2>Search Movies</h2>
      <div className="mf-search-box" style={{ maxWidth: 600, marginBottom: 32 }}>
        <input
          type="text"
          placeholder="Search by title, genre, or director..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button>Search</button>
      </div>
      {query && results.length > 0 && (
        <table className="mf-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Genre</th>
              <th>Year</th>
              <th>Director</th>
              <th>Actors</th>
            </tr>
          </thead>
          <tbody>
            {results.map((m) => (
              <tr key={m.id}>
                <td>{m.title}</td>
                <td>{m.genre}</td>
                <td>{m.year}</td>
                <td>{m.director}</td>
                <td>{m.actors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {query && results.length === 0 && (
        <p style={{ color: "#71717a" }}>No movies found matching "{query}".</p>
      )}
    </div>
  );
}

function WatchlistPage() {
  return (
    <div className="mf-section">
      <h2>My Watchlist</h2>
      <div className="mf-grid">
        {watchlistMovies.map((m) => (
          <MovieCard key={m.id} movie={m} onPlay={() => {}} />
        ))}
      </div>
    </div>
  );
}

function LoginPage({ setTab }: { setTab: (t: Tab) => void }) {
  return (
    <div className="mf-section">
      <div className="mf-login">
        <h2>Login to MovieFlix</h2>
        <p>Please fill in your credentials to login.</p>
        <div className="mf-form-group">
          <label>Username</label>
          <input type="text" placeholder="Enter username" />
        </div>
        <div className="mf-form-group">
          <label>Password</label>
          <input type="password" placeholder="Enter password" />
        </div>
        <button className="mf-login-btn">Login</button>
        <div className="mf-login-link">
          Don't have an account? <span onClick={() => setTab("register")}>Register Now</span>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ setTab }: { setTab: (t: Tab) => void }) {
  return (
    <div className="mf-section">
      <div className="mf-login">
        <h2>Register for MovieFlix</h2>
        <p>Please fill this form to create an account.</p>
        <div className="mf-form-group">
          <label>Username</label>
          <input type="text" placeholder="Choose a username" />
        </div>
        <div className="mf-form-group">
          <label>Password</label>
          <input type="password" placeholder="Create a password" />
        </div>
        <div className="mf-form-group">
          <label>Confirm Password</label>
          <input type="password" placeholder="Confirm password" />
        </div>
        <button className="mf-login-btn">Register</button>
        <div className="mf-login-link">
          Already have an account? <span onClick={() => setTab("login")}>Login here</span>
        </div>
      </div>
    </div>
  );
}

export default function MovieApp() {
  const [tab, setTab] = useState<Tab>("home");

  const tabs: { key: Tab; label: string }[] = [
    { key: "home", label: "Home" },
    { key: "browse", label: "Browse All" },
    { key: "search", label: "Search" },
    { key: "watchlist", label: "My Watchlist" },
    { key: "login", label: "Login" },
    { key: "register", label: "Register" },
  ];

  return (
    <div className="movieflix">
      <div className="mf-info-banner" style={{ maxWidth: 1200, margin: "0 auto 0", padding: "16px 24px" }}>
        <Info size={18} style={{ flexShrink: 0, color: "#00bcd4" }} />
        <span>
          <strong>Interactive Demo</strong> — This is a static recreation of the MovieFlix app originally built with PHP &amp; MySQL. The full-stack version features user authentication, database-driven movie catalog, reviews, watchlists, and YouTube streaming integration.
          <Link to="/projects" style={{ color: "#00bcd4", marginLeft: 8 }}>
            <ArrowLeft size={14} style={{ verticalAlign: "middle" }} /> Back to Projects
          </Link>
        </span>
      </div>

      <div className="mf-nav">
        <div className="mf-nav-logo">MovieFlix</div>
        <ul className="mf-nav-links">
          {tabs.map((t) => (
            <li key={t.key}>
              <button
                className={tab === t.key ? "active" : ""}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="mf-nav-right">
          <span className="mf-nav-user">Welcome, <strong>DemoUser</strong></span>
        </div>
      </div>

      <div className="mf-tab-content">
        {tab === "home" && <HomePage setTab={setTab} />}
        {tab === "browse" && <BrowsePage />}
        {tab === "search" && <SearchPage />}
        {tab === "watchlist" && <WatchlistPage />}
        {tab === "login" && <LoginPage setTab={setTab} />}
        {tab === "register" && <RegisterPage setTab={setTab} />}
      </div>
    </div>
  );
}
