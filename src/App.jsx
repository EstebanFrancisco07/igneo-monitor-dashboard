import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from 'leaflet'; 
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// Registro de componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// URLs de ThingSpeak
const HISTORICAL_API_URL =
  "https://api.thingspeak.com/channels/2998313/feeds.json?results=20"; 
const LAST_API_URL =
  "https://api.thingspeak.com/channels/2998313/feeds/last.json";

// URL del Canal Completo (Para el botón de histórico)
const THINGSPEAK_CHANNEL_URL = "https://thingspeak.mathworks.com/channels/2998313";

// Coordenadas del sensor
const LAT = -33.4489;
const LON = -70.6693;

// Umbral de temperatura crítica
const TEMP_CRITICA = 60; 

// Icono (Requiere 'red-arrow.png' en public/)
const redArrowIcon = new Icon({
  iconUrl: '/red-arrow.png', 
  iconSize: [38, 38],        
  iconAnchor: [19, 38],      
  popupAnchor: [0, -38]      
});

const App = () => {
  const [lastData, setLastData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- LÓGICA DE ALERTA ---
  const getAlertStatus = (data) => {
    if (!data) return { isTempAlert: false, isSmokeAlert: false, cause: 'NORMAL' };

    const tempValue = parseFloat(data.field1);
    const smokeStatus = data.field4; 
    
    const isTempAlert = tempValue > TEMP_CRITICA; 
    const isSmokeAlert = smokeStatus !== 'NORMAL'; 
    
    let cause = 'NORMAL';

    if (isSmokeAlert && isTempAlert) {
        cause = "ALERTA HUMO Y TEMP";
    } else if (isSmokeAlert) {
        cause = "ALERTA DE HUMO";
    } else if (isTempAlert) {
        cause = "ALERTA DE TEMPERATURA";
    } else {
        cause = "NORMAL";
    }

    return { isTempAlert, isSmokeAlert, cause };
  };


  const fetchData = async () => {
    try {
      const lastRes = await fetch(LAST_API_URL);
      if (!lastRes.ok) throw new Error("Error de red al obtener el último dato.");
      const lastJson = await lastRes.json();
      
      if (!lastJson || !lastJson.field1) {
          throw new Error("Canal de ThingSpeak vacío o datos no disponibles.");
      }
      setLastData(lastJson);

      const historyRes = await fetch(HISTORICAL_API_URL);
      if (!historyRes.ok) throw new Error("Error de red al obtener datos históricos.");
      const historyJson = await historyRes.json();
      setHistoricalData(historyJson.feeds);

      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData(); 
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, []);

  const { isTempAlert, isSmokeAlert, cause } = getAlertStatus(lastData);
  
  const getAlertClasses = (isAlert) => 
    isAlert 
      ? 'bg-red-600 text-white shadow-xl transform scale-105 transition duration-150'
      : 'bg-white text-gray-800';
  
  // --- FUNCIONES DE GRÁFICOS (manteniendo la limpieza) ---
  const getChartData = (fieldKey, label, color) => { /* ... */ return {}; };
  const baseChartOptions = (titleText) => ({ /* ... */ });
  
  // Definiciones de Gráficos (Escalas fijas)
  const tempChartData = getChartData('field1', 'Temperatura (°C)', 'rgb(59, 130, 246)'); 
  const tempChartOptions = baseChartOptions('Temperatura (°C)');
  tempChartOptions.scales = { y: { beginAtZero: true, max: 100 } };
  
  const humidityChartData = getChartData('field2', 'Humedad (%)', 'rgb(34, 197, 94)'); 
  const humidityChartOptions = baseChartOptions('Humedad (%)');
  humidityChartOptions.scales = { y: { beginAtZero: true, max: 100 } };
  
  const smokeChartData = getChartData('field3', 'Nivel de Humo', 'rgb(249, 115, 22)'); 
  const smokeChartOptions = baseChartOptions('Nivel de Humo');
  smokeChartOptions.scales = { y: { beginAtZero: true, max: 2500 } };
  
  // --- COMPONENTE DE TABLA DE REGISTROS CORREGIDO ---
  const HistoryTable = () => {
    if (!historicalData || historicalData.length === 0) return <p className="text-sm text-gray-500">No hay registros históricos recientes.</p>;

    // Tomar las últimas 5 entradas
    const recentEntries = historicalData.slice(-5).reverse(); 

    return (
      <div className="overflow-x-auto">
        <h3 className="font-bold text-gray-700 mb-2">Últimos Registros ({recentEntries.length})</h3>
        <table className="min-w-full bg-white text-xs border-collapse">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-left">
              <th className="py-1 px-2 border-b">Hora</th>
              <th className="py-1 px-2 border-b">T (°C)</th>
              <th className="py-1 px-2 border-b">H (%)</th>
              <th className="py-1 px-2 border-b">Humo</th>
              <th className="py-1 px-2 border-b">Estado</th>
            </tr>
          </thead>
          <tbody>
            {recentEntries.map((entry, index) => (
              <tr key={index} className="border-b hover:bg-gray-50">
                <td className="py-1 px-2">{new Date(entry.created_at).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}</td>
                <td className="py-1 px-2">{entry.field1}</td>
                <td className="py-1 px-2">{entry.field2}</td>
                <td className="py-1 px-2">{entry.field3}</td>
                <td className="py-1 px-2">{entry.field4}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  // -----------------------------------------------------


  return (
    <div className="min-h-screen p-4 flex flex-col items-center bg-gray-100"> 
      
      {loading ? (
        <p className="text-lg">Cargando datos...</p>
      ) : error ? (
        <p className="text-red-600 font-bold">{error}</p>
      ) : (
        <div className="w-full"> 
          
          {/* Fila 1: TÍTULO Y MÉTRICAS CLAVE (HEAD) */}
          <div className="flex flex-col items-center mb-6">
            <header className="flex items-center gap-2 mb-4">
              <img src="/logo.png" className="h-16 w-auto" alt="Ígneo Logo" /> 
              <h1 className="text-4xl font-extrabold text-red-600 drop-shadow">
                Ígnio Monitor de Incendio
              </h1>
            </header>

            {/* BARRA DE MÉTRICAS SUPERIOR (3 columnas) */}
            <div className="w-full grid grid-cols-3 gap-4 max-w-4xl"> 
                {/* Temp con alerta */}
                <div className={`p-4 rounded-xl shadow-lg flex justify-between items-center text-left ${getAlertClasses(isTempAlert)}`}>
                  <span className="font-bold text-lg">Temperatura: <span className="text-2xl">{lastData.field1} °C</span></span>
                </div>
                
                {/* Humedad (Informativa, sin alerta roja) */}
                <div className={`p-4 bg-white text-gray-800 rounded-xl shadow-lg flex justify-between items-center text-left`}>
                  <span className="font-bold text-lg">Humedad: <span className="text-2xl">{lastData.field2} %</span></span>
                </div>

                {/* Estado (Causa Detectada) - Se vuelve rojo con alerta de Temp o Humo */}
                <div className={`p-4 rounded-xl shadow-lg flex justify-between items-center text-left ${getAlertClasses(isSmokeAlert || isTempAlert)}`}>
                  <span className="font-bold text-lg">Estado: <span className="text-2xl font-bold">{cause}</span></span>
                </div>
            </div>
          </div>
          
          {/* Fila 2: GRÁFICOS (3 columnas full-width) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            
            <div className="p-4 bg-white rounded-xl shadow-lg h-96"> <Line options={tempChartOptions} data={tempChartData} /> </div>
            <div className="p-4 bg-white rounded-xl shadow-lg h-96"> <Line options={humidityChartOptions} data={humidityChartData} /> </div>
            <div className="p-4 bg-white rounded-xl shadow-lg h-96"> <Line options={smokeChartOptions} data={smokeChartData} /> </div>
          </div>
          
          {/* Fila 3: DATOS EXTRA y MAPA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 w-full">
            
            {/* TABLA DE HISTORIAL DE DATOS (Componente de tabla llamado aquí) */}
            <div className="p-4 bg-white rounded-xl shadow-lg">
                <HistoryTable />
            </div>

            {/* MAPA */}
            <div className="h-40 rounded-xl overflow-hidden shadow-lg">
                <MapContainer
                  center={[LAT, LON]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[LAT, LON]} icon={redArrowIcon}> 
                    <Popup>Ubicación del sensor Ígneo</Popup>
                  </Marker>
                </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;