import { useState, useEffect } from 'react'

interface Stats {
  totalGames: number
  activePromotions: number
  totalUsers: number
  subscribedUsers: number
  totalNotifications: number
}

interface FreeGame {
  id: number
  title: string
  original_price: number
  discount_percent: number
  window_discount_url: string
  header_image: string
  timestamp_detected: number
}

interface HealthStatus {
  status: string
  uptime: number
  timestamp: string
}

function App() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [freeGames, setFreeGames] = useState<FreeGame[]>([])
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, gamesRes, healthRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/free-games'),
        fetch('/health')
      ])

      const statsData = await statsRes.json()
      const gamesData = await gamesRes.json()
      const healthData = await healthRes.json()

      if (statsData.success) {
        setStats(statsData.data)
      }
      if (gamesData.success) {
        setFreeGames(gamesData.data)
      }
      setHealth(healthData)
      setError(null)
    } catch (err) {
      setError('Failed to fetch data. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🎁 Steam Drop Hunter</h1>
        <p className="subtitle">Monitor Steam for temporarily free paid games</p>
        {health && (
          <div className={`status-badge ${health.status === 'ok' ? 'status-ok' : 'status-error'}`}>
            {health.status === 'ok' ? '✅ Online' : '❌ Offline'}
          </div>
        )}
      </header>

      {error && <div className="error-message">{error}</div>}

      {health && (
        <div className="uptime-bar">
          <span>Uptime: {formatUptime(health.uptime)}</span>
          <span>Last update: {new Date(health.timestamp).toLocaleTimeString()}</span>
        </div>
      )}

      {stats && (
        <section className="stats-section">
          <h2>📊 Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.totalGames}</div>
              <div className="stat-label">Games Tracked</div>
            </div>
            <div className="stat-card highlight">
              <div className="stat-value">{stats.activePromotions}</div>
              <div className="stat-label">Active Promotions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.subscribedUsers}</div>
              <div className="stat-label">Subscribed Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.totalNotifications}</div>
              <div className="stat-label">Notifications Sent</div>
            </div>
          </div>
        </section>
      )}

      <section className="games-section">
        <h2>🎮 Current Free Games ({freeGames.length})</h2>
        {freeGames.length === 0 ? (
          <div className="no-games">
            <p>No free games currently available</p>
            <p className="hint">Subscribe to the Telegram bot to get notified when new promotions are detected!</p>
          </div>
        ) : (
          <div className="games-grid">
            {freeGames.map((game) => (
              <div key={game.id} className="game-card">
                {game.header_image && (
                  <img src={game.header_image} alt={game.title} className="game-image" />
                )}
                <div className="game-info">
                  <h3 className="game-title">{game.title}</h3>
                  <div className="game-price">
                    <span className="original-price">{formatPrice(game.original_price)}</span>
                    <span className="discount-badge">-100%</span>
                  </div>
                  <a
                    href={game.window_discount_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="steam-link"
                  >
                    Get on Steam →
                  </a>
                  <div className="game-time">
                    Detected: {new Date(game.timestamp_detected * 1000).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        <p>
          <a href="https://t.me/your_bot" target="_blank" rel="noopener noreferrer">
            Open Telegram Bot
          </a>
        </p>
        <p className="copyright">Steam Drop Hunter © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

export default App
