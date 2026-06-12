import { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Database,
  Server,
  HardDrive,
  RefreshCw,
  Play,
  Pause,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface HealthCheckResult {
  name: string;
  type: string;
  status: 'healthy' | 'unhealthy';
  latency_ms: number;
  message: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  results: HealthCheckResult[];
}

export default function App() {
  const [healthStatus, setHealthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [healthResult, setHealthResult] = useState<HealthResponse | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState<boolean>(false);
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(true);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger full active health checks from backend config
  const triggerHealthChecks = async () => {
    setIsHealthLoading(true);
    if (!healthResult) {
      setHealthStatus('loading');
    }
    try {
      const response = await fetch('http://localhost:8000/health');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: HealthResponse = await response.json();
      setHealthResult(data);
      setHealthStatus('success');
    } catch (err: any) {
      setHealthStatus('error');
    } finally {
      setIsHealthLoading(false);
    }
  };

  // Setup auto polling
  useEffect(() => {
    if (isAutoPolling) {
      triggerHealthChecks();
      pollIntervalRef.current = setInterval(() => {
        triggerHealthChecks();
      }, 5000);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isAutoPolling]);

  // Initial trigger if auto-poll is off
  useEffect(() => {
    if (!isAutoPolling) {
      triggerHealthChecks();
    }
  }, []);

  const getServiceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'mysql':
      case 'postgres':
      case 'database':
        return Database;
      case 'redis':
        return Server;
      default:
        return HardDrive;
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header section (GitHub Style) */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: 'var(--color-accent)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.2px', margin: 0 }}>
              Infra Watchtower Console
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Active dependency monitoring and latency status cards
            </p>
          </div>
        </div>
        
        {/* Actions bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={triggerHealthChecks}
            disabled={isHealthLoading}
            className="glass-panel"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px', 
              borderRadius: '6px', 
              fontSize: '13px', 
              cursor: 'pointer',
              border: '1px solid var(--border-color)',
              fontWeight: 500,
              background: '#ffffff'
            }}
          >
            <RefreshCw size={12} style={{ animation: isHealthLoading ? 'spin 1s linear infinite' : 'none' }} />
            Trigger Checks
          </button>

          <button 
            onClick={() => setIsAutoPolling(!isAutoPolling)}
            className="glass-panel" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '6px 12px', 
              borderRadius: '6px', 
              fontSize: '13px', 
              cursor: 'pointer',
              color: isAutoPolling ? 'var(--color-success)' : 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontWeight: 500,
              background: isAutoPolling ? '#f6f8fa' : '#ffffff'
            }}
          >
            {isAutoPolling ? <Pause size={12} /> : <Play size={12} />}
            {isAutoPolling ? 'Auto-poll: On' : 'Auto-poll: Off'}
          </button>
        </div>
      </header>

      {/* Grid Dashboard (Exactly one card per service) */}
      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', flex: 1 }}>
        {healthStatus === 'loading' && !healthResult ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', border: '1px dashed var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1.2s linear infinite', marginBottom: '8px' }} />
            <span>Loading active service status...</span>
          </div>
        ) : healthStatus === 'error' && !healthResult ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', border: '1px dashed var(--border-color)', borderRadius: '6px', color: 'var(--color-error)', fontSize: '13px' }}>
            <span>Failed to connect to backend server. Make sure the API is running on port 8000.</span>
            <button onClick={triggerHealthChecks} className="glass-panel" style={{ marginTop: '12px', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', background: '#ffffff', border: '1px solid var(--border-color)' }}>
              Retry Connection
            </button>
          </div>
        ) : (
          healthResult?.results.map((service, index) => {
            const IconComponent = getServiceIcon(service.type);
            const isHealthy = service.status === 'healthy';
            return (
              <section 
                key={index} 
                className="glass-panel" 
                style={{ 
                  padding: '20px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between', 
                  minHeight: '200px' 
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ backgroundColor: '#f6f8fa', border: '1px solid var(--border-color)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <IconComponent size={18} color="var(--text-primary)" />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{service.name}</h2>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{service.type}</span>
                      </div>
                    </div>
                    
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      color: isHealthy ? 'var(--color-success)' : 'var(--color-error)',
                      backgroundColor: isHealthy ? 'var(--color-success-glow)' : 'var(--color-error-glow)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span className={`status-indicator ${isHealthy ? 'success' : 'error'}`} style={{ width: '6px', height: '6px' }}></span>
                      {service.status}
                    </span>
                  </div>
                  
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.4, marginBottom: '16px' }}>
                    {service.message}
                  </p>

                  <div style={{ background: '#f6f8fa', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Latency</span>
                    <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {service.latency_ms} ms
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Last check: {new Date(healthResult.timestamp).toLocaleTimeString()}</span>
                  <span>UTC</span>
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* CSS Keyframes definition */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Footer */}
      <footer style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
        Infra Watchtower • Configured Monitor Panel
      </footer>
    </div>
  );
}
