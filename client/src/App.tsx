import { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Database,
  Server,
  HardDrive,
  RefreshCw,
  Play,
  Pause,
  Clock,
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

interface DbHistoryLog {
  id: number;
  timestamp: string | null;
  service_name: string;
  service_type: string;
  status: string;
  latency_ms: number | null;
  message: string | null;
}

export default function App() {
  const [healthStatus, setHealthStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [healthResult, setHealthResult] = useState<HealthResponse | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState<boolean>(false);
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(true);
  
  // Selection & History states
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null);
  const [serviceHistory, setServiceHistory] = useState<DbHistoryLog[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch health states from backend passively
  const fetchHealthDetails = async () => {
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
      
      // Auto-select first service if none selected yet
      if (data.results && data.results.length > 0 && !selectedServiceName) {
        setSelectedServiceName(data.results[0].name);
      } else if (selectedServiceName) {
        // Refresh currently selected service history
        fetchServiceHistory(selectedServiceName);
      }
    } catch (err: any) {
      setHealthStatus('error');
    } finally {
      setIsHealthLoading(false);
    }
  };

  // Fetch log history for a specific service name
  const fetchServiceHistory = async (serviceName: string) => {
    setIsHistoryLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/health/history?service_name=${encodeURIComponent(serviceName)}&limit=15`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setServiceHistory(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch service history logs", err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Fetch history when selected service changes
  useEffect(() => {
    if (selectedServiceName) {
      fetchServiceHistory(selectedServiceName);
    }
  }, [selectedServiceName]);

  // Setup auto polling for UI updates (fetching details from passive backend)
  useEffect(() => {
    if (isAutoPolling) {
      fetchHealthDetails();
      pollIntervalRef.current = setInterval(() => {
        fetchHealthDetails();
      }, 10000); // 10 seconds
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
      fetchHealthDetails();
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
              Passive dependency health status console (server-side checks)
            </p>
          </div>
        </div>
        
        {/* Actions bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={fetchHealthDetails}
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
            Refresh
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

      {/* Main split grid */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Left Side: Grid of Service Cards */}
        <main style={{ flex: '2 1 600px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {healthStatus === 'loading' && !healthResult ? (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', border: '1px dashed var(--border-color)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '13px' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1.2s linear infinite', marginBottom: '8px' }} />
              <span>Loading service status...</span>
            </div>
          ) : healthStatus === 'error' && !healthResult ? (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', border: '1px dashed var(--border-color)', borderRadius: '6px', color: 'var(--color-error)', fontSize: '13px' }}>
              <span>Failed to connect to backend server. Make sure the API is running on port 8000.</span>
              <button onClick={fetchHealthDetails} className="glass-panel" style={{ marginTop: '12px', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', background: '#ffffff', border: '1px solid var(--border-color)' }}>
                Retry Connection
              </button>
            </div>
          ) : (
            healthResult?.results.map((service, index) => {
              const IconComponent = getServiceIcon(service.type);
              const isHealthy = service.status === 'healthy';
              const isSelected = selectedServiceName === service.name;
              
              // Extract Redis metrics if present in the message
              const match = service.message ? service.message.match(/(.*?)\s*Memory Used:\s*([^,]+),\s*Total Keys:\s*([^\s,]+)/) : null;
              const displayMessage = match ? match[1].trim() : service.message;
              const memoryUsed = match && match[2] ? match[2].trim() : null;
              const totalKeys = match && match[3] ? match[3].trim() : null;
              
              return (
                <section 
                  key={index} 
                  className="glass-panel" 
                  onClick={() => setSelectedServiceName(service.name)}
                  style={{ 
                    padding: '20px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between', 
                    minHeight: '200px',
                    cursor: 'pointer',
                    border: isSelected ? '1.5px solid var(--color-primary)' : '1.5px solid var(--border-color)',
                    boxShadow: isSelected ? '0 0 0 3px var(--color-primary-glow)' : 'none',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
                    transform: isSelected ? 'scale(1.01)' : 'none'
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
                      {displayMessage}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ background: '#f6f8fa', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Latency</span>
                        <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {service.latency_ms} ms
                        </span>
                      </div>
                      {memoryUsed && (
                        <div style={{ background: '#f6f8fa', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Memory</span>
                          <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {memoryUsed}
                          </span>
                        </div>
                      )}
                      {totalKeys !== null && (
                        <div style={{ background: '#f6f8fa', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Keys</span>
                          <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-primary)' }}>
                            {totalKeys}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Last record: {new Date(healthResult.timestamp).toLocaleTimeString()}</span>
                    <span style={{ textTransform: 'uppercase' }}>{service.type}</span>
                  </div>
                </section>
              );
            })
          )}
        </main>

        {/* Right Side: Ping History Panel */}
        <aside 
          className="glass-panel" 
          style={{ 
            flex: '1 1 320px', 
            padding: '20px', 
            display: 'flex', 
            flexDirection: 'column', 
            minHeight: '300px', 
            maxHeight: '600px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <Clock size={16} color="var(--text-secondary)" />
            <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
              {selectedServiceName ? `${selectedServiceName} History` : 'Service History'}
            </h2>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isHistoryLoading && serviceHistory.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <RefreshCw size={14} style={{ animation: 'spin 1.2s linear infinite', marginRight: '6px' }} />
                <span>Loading history logs...</span>
              </div>
            ) : !selectedServiceName ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                Select a card to view history
              </div>
            ) : serviceHistory.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', color: 'var(--text-muted)', fontSize: '13px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                No check logs found for this service
              </div>
            ) : (
              serviceHistory.map((log) => {
                const isLogHealthy = log.status === 'healthy';
                
                // Parse log message metrics if it's a Redis check
                const logMatch = log.message ? log.message.match(/(.*?)\s*Memory Used:\s*([^,]+),\s*Total Keys:\s*([^\s,]+)/) : null;
                const displayLogMessage = logMatch ? logMatch[1].trim() : log.message;
                const logMemory = logMatch && logMatch[2] ? logMatch[2].trim() : null;
                const logKeys = logMatch && logMatch[3] ? logMatch[3].trim() : null;

                return (
                  <div 
                    key={log.id} 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '4px', 
                      padding: '10px 12px', 
                      borderRadius: '6px', 
                      background: '#f6f8fa', 
                      border: '1px solid var(--border-color)', 
                      fontSize: '12px' 
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ 
                        fontSize: '10px', 
                        fontWeight: 600, 
                        color: isLogHealthy ? 'var(--color-success)' : 'var(--color-error)',
                        backgroundColor: isLogHealthy ? 'var(--color-success-glow)' : 'var(--color-error-glow)',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <span className={`status-indicator ${isLogHealthy ? 'success' : 'error'}`} style={{ width: '4px', height: '4px' }}></span>
                        {log.status === 'healthy' ? 'OK' : 'FAIL'}
                      </span>
                      <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {log.timestamp ? log.timestamp.split('T')[1].replace('Z','') : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }} title={log.message || ''}>
                        {displayLogMessage}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, display: 'flex', gap: '6px' }}>
                        {logMemory && <span style={{ color: 'var(--color-primary)' }} title={`Memory Used: ${logMemory}`}>M:{logMemory}</span>}
                        {logKeys && <span style={{ color: 'var(--color-primary)' }} title={`Total Keys: ${logKeys}`}>K:{logKeys}</span>}
                        <span>{log.latency_ms ? `${log.latency_ms}ms` : '—'}</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

      </div>

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
