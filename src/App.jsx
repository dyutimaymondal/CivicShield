import "./App.css";

function App() {
  return (
    <div className="app">

      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">
          <span className="logo-icon">🛡️</span>
          <span>CivicShield</span>
        </div>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="/login" className="login-btn">
  Login
</a>
        </div>
      </nav>


      {/* Hero Section */}
      <main id="home" className="hero">

        <div className="hero-content">

          <div className="badge">
            🤖 AI-POWERED CIVIC INTELLIGENCE
          </div>

          <h1>
            Turn Civic Problems
            <br />
            Into <span>Real Action.</span>
          </h1>

          <p>
            Report civic issues, connect similar complaints,
            and transform public concerns into actionable
            incidents for authorities.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn">
              🚨 Report a Problem
            </button>

            <button className="secondary-btn">
              Explore Incidents →
            </button>
          </div>


          {/* Statistics */}
          <div className="stats">

            <div>
              <strong>1,240+</strong>
              <span>Reports</span>
            </div>

            <div>
              <strong>186</strong>
              <span>Incidents</span>
            </div>

            <div>
              <strong>94%</strong>
              <span>Verified</span>
            </div>

          </div>

        </div>


        {/* Live Intelligence Card */}
        <div className="hero-card">

          <div className="card-header">
            <span>LIVE CIVIC INTELLIGENCE</span>
            <span className="live">● LIVE</span>
          </div>


          {/* Incident 1 */}
          <div className="incident">

            <div className="incident-icon">
              🛣️
            </div>

            <div className="incident-info">

              <h3>Major Road Damage</h3>

              <p>
                Multiple reports detected
              </p>

              <div className="tags">
                <span>HIGH PRIORITY</span>
                <span>18 REPORTS</span>
              </div>

            </div>

          </div>


          {/* Incident 2 */}
          <div className="incident">

            <div className="incident-icon">
              🗑️
            </div>

            <div className="incident-info">

              <h3>Garbage Overflow</h3>

              <p>
                Incident cluster identified
              </p>

              <div className="tags">
                <span>MEDIUM</span>
                <span>11 REPORTS</span>
              </div>

            </div>

          </div>


          <div className="ai-status">
            ✦ AI Engine Active
          </div>

        </div>

      </main>


      {/* Features Section */}
      <section id="features" className="features">

        <h2>
          One Platform. Complete Civic Intelligence.
        </h2>

        <p className="section-subtitle">
          From citizen reports to authority action.
        </p>


        <div className="feature-grid">

          <div className="feature-card">

            <div className="feature-icon">
              📢
            </div>

            <h3>
              Smart Complaints
            </h3>

            <p>
              Submit complaints with photos,
              descriptions and precise location.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              🤖
            </div>

            <h3>
              AI Analysis
            </h3>

            <p>
              Automatically classify issues,
              calculate severity and generate summaries.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              🔗
            </div>

            <h3>
              Duplicate Detection
            </h3>

            <p>
              Find similar complaints and combine
              them into meaningful incidents.
            </p>

          </div>


          <div className="feature-card">

            <div className="feature-icon">
              🗺️
            </div>

            <h3>
              Authority Dashboard
            </h3>

            <p>
              Visualize incidents, verify reports
              and manage civic responses.
            </p>

          </div>

        </div>

      </section>


      {/* Footer */}
      <footer>

        <div className="logo">
          <span className="logo-icon">🛡️</span>
          CivicShield
        </div>

        <p>
          AI-powered civic intelligence for a better society.
        </p>

      </footer>

    </div>
  );
}

export default App;