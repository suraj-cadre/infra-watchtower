import { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Cpu, 
  HardDrive, 
  ArrowDownUp, 
  RefreshCw, 
  Play, 
  Pause, 
  Terminal, 
  Server, 
  Clock,
  Sparkles
} from 'lucide-react';

interface PingHistoryItem {
  id: string;
  time: string;
  latency: number | null;
  status: 'success' | 'error';
  message: string;
}

interface ServerMetrics {
  cpu_usage_pct: number;
  memory_usage_pct: number;
  network_in_mbps: number;
  network_out_mbps: number;
  active_tasks: number;
}

interface PingResponse {
  status: string;
  message: string;
  timestamp: string;
  server_epoch: number;
  environment: string;
  metrics: ServerMetrics;
}

export default function App() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pingResult, setPingResult] = useState<PingResponse | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAutoPolling, setIsAutoPolling] = useState<boolean>(true);
  const [history, setHistory] = useState<PingHistoryItem[]>([]);
  
  // Default metrics state
  const [metrics, setMetrics] = useState<ServerMetrics>({
    cpu_usage_pct: 0,
    memory_usage_pct: 0,
    network_in_mbps: 0.00,
    network_out_mbps: 0.00,
    active_tasks: 0
  });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPing = async () => {
    setStatus('loading');
    setErrorMsg(null);
    const startTime = performance.now();
    
    try {
      const response = await fetch('http://localhost:8000/ping');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: PingResponse = await response.json();
      const endTime = performance.now();
      const calculatedLatency = Math.round(endTime - startTime);
      
      setStatus('success');
      setLatency(calculatedLatency);
      setPingResult(data);
      setMetrics(data.metrics);
      
      const newHistoryItem: PingHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        latency: calculatedLatency,
        status: 'success',
        message: data.message
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 4)]);
      
    } catch (err: any) {
      const endTime = performance.now();
      const calculatedLatency = Math.round(endTime - startTime);
      
      setStatus('error');
      setLatency(calculatedLatency);
      setErrorMsg(err.message || 'Failed to connect to FastAPI service.');
      
      const newHistoryItem: PingHistoryItem = {
        id: Math.random().toString(36).substring(2, 9),
        time: new Date().toLocaleTimeString(),
        latency: null,
        status: 'error',
        message: err.message || 'Connection refused'
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 4)]);
    }
  };

  useEffect(() => {
    if (isAutoPolling) {
      triggerPing();
      pollIntervalRef.current = setInterval(() => {
        triggerPing();
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      {/* Header section (GitHub Style) */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: 'var(--color-accent)', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.2px', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Infra Watchtower
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Diagnostic monitoring console for APIs and telemetry</p>
          </div>
        </div>
        
        {/* Actions bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', backgroundColor: '#f6f8fa' }}>
            <span className={`status-indicator ${status}`}></span>
            <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>
              {status === 'loading' ? 'pinging...' : status}
            </span>
          </div>

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

      {/* Grid Dashboard */}
      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', flex: 1 }}>
        
        {/* Card 1: Diagnostic Panel */}
        <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Wifi size={16} color="var(--color-primary)" /> Ping Diagnostics
              </h2>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5, marginBottom: '16px' }}>
              Validate backend routing, endpoints status, and packet latency to the FastAPI service. Running on <code>http://localhost:8000/ping</code>.
            </p>

            {/* Diagnostic stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: '#f6f8fa', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Latency</span>
                <div style={{ fontSize: '20px', fontWeight: 600, color: status === 'error' ? 'var(--color-error)' : 'var(--text-primary)', marginTop: '2px' }}>
                  {status === 'error' ? '—' : latency !== null ? `${latency} ms` : '—'}
                </div>
              </div>
              <div style={{ background: '#f6f8fa', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Environment</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px', textTransform: 'uppercase' }}>
                  {pingResult?.environment || '—'}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div style={{ background: '#ffebe9', border: '1px solid rgba(255, 129, 130, 0.4)', padding: '10px 12px', borderRadius: '6px', color: '#cf222e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <WifiOff size={14} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button 
            onClick={triggerPing}
            disabled={status === 'loading'}
            style={{ 
              width: '100%', 
              background: '#2188ff', 
              color: '#ffffff', 
              border: '1px solid rgba(27, 31, 36, 0.15)', 
              padding: '10px', 
              borderRadius: '6px', 
              fontSize: '13px', 
              fontWeight: 500, 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px',
              opacity: status === 'loading' ? 0.75 : 1,
              boxShadow: '0 1px 0 rgba(27, 31, 35, 0.1)'
            }}
            onMouseOver={(e) => {
              if (status !== 'loading') e.currentTarget.style.background = '#0969da';
            }}
            onMouseOut={(e) => {
              if (status !== 'loading') e.currentTarget.style.background = '#2188ff';
            }}
          >
            <RefreshCw size={14} className={status === 'loading' ? 'animate-spin' : ''} style={{ animation: status === 'loading' ? 'spin 1s linear infinite' : 'none' }} />
            {status === 'loading' ? 'Checking connection...' : 'Ping Server'}
          </button>
        </section>

        {/* Card 2: Server Metrics */}
        <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Server size={16} color="var(--text-primary)" /> Backend Telemetry
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            Simulated system metrics parsed dynamically from the FastAPI response payload.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, justifyContent: 'center' }}>
            {/* CPU Metric */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}><Cpu size={12} /> CPU Usage</span>
                <span style={{ fontWeight: 600 }}>{metrics.cpu_usage_pct}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#eaeef2', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${metrics.cpu_usage_pct}%`, height: '100%', background: '#0969da', borderRadius: '6px', transition: 'width 0.4s ease-out' }}></div>
              </div>
            </div>

            {/* RAM Metric */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}><HardDrive size={12} /> Memory Usage</span>
                <span style={{ fontWeight: 600 }}>{metrics.memory_usage_pct}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: '#eaeef2', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${metrics.memory_usage_pct}%`, height: '100%', background: '#1f883d', borderRadius: '6px', transition: 'width 0.4s ease-out' }}></div>
              </div>
            </div>

            {/* Network Metric */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}><ArrowDownUp size={12} /> Network Bandwidth</span>
                <span style={{ fontWeight: 600 }}>{metrics.network_in_mbps} Mbps in / {metrics.network_out_mbps} Mbps out</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                <div style={{ padding: '6px', background: '#f6f8fa', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Ingress:</span> <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>{metrics.network_in_mbps} MB/s</span>
                </div>
                <div style={{ padding: '6px', background: '#f6f8fa', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Egress:</span> <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{metrics.network_out_mbps} MB/s</span>
                </div>
              </div>
            </div>

            {/* Active Workers badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#ddf4ff', borderRadius: '6px', border: '1px solid rgba(9, 105, 218, 0.2)', color: '#0969da' }}>
              <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}><Sparkles size={12} /> Active Threads</span>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>{metrics.active_tasks} Tasks</span>
            </div>
          </div>
        </section>

        {/* Card 3: Ping History Timeline */}
        <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock size={16} color="var(--color-success)" /> Ping History
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
            Tracks the latency and status of the last 5 cycles.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, justifyContent: 'flex-start' }}>
            {history.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: '12px' }}>
                <Clock size={24} style={{ marginBottom: '6px', opacity: 0.5 }} />
                <span>No ping cycles captured yet.</span>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '6px', background: '#f6f8fa', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-indicator ${item.status}`}></span>
                    <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.time}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: item.status === 'success' ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {item.status === 'success' ? 'OK' : 'FAIL'}
                    </span>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                      {item.latency !== null ? `${item.latency}ms` : '—'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Footer / Console diagnostics */}
      <footer style={{ marginTop: '24px' }}>
        <div className="glass-panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--text-primary)' }}>
            <Terminal size={14} />
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Response Payload (JSON)</span>
          </div>
          
          <pre style={{ maxHeight: '180px', overflowY: 'auto' }}>
            {pingResult ? JSON.stringify(pingResult, null, 2) : '// Waiting for API query...'}
          </pre>
        </div>
        
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', marginTop: '16px' }}>
          Infra Watchtower v1.0.0 • React 19 • FastAPI • Uvicorn
        </p>
      </footer>
    </div>
  );
}
