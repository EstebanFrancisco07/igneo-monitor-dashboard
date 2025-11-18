import { useEffect, useState, useRef } from "react"; // Importar useRef
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from 'leaflet'; 
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

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

// Coordenadas del sensor
const LAT = -33.4489;
const LON = -70.6693;

// --- DEFINICIÓN DE UMBRALES DE ALERTA ---
const TEMP_CRITICA = 40;
const HUMEDAD_MAX = 80;
const HUMEDAD_MIN = 20;

// Icono (Requiere 'red-arrow.png' en public/)
const redArrowIcon = new Icon({
  iconUrl: '/red-arrow.png', 
  iconSize: [38, 38],        
  iconAnchor: [19, 38],      
  popupAnchor: [0, -38]      
});
// --------------------------------------------------------

const App = () => {
  const [lastData, setLastData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const audioRef = useRef(null); // Referencia para el audio

  // Función para determinar el estado de alerta
  const checkAlertStatus = (data) => {
    if (!data) return { isAlert: false, cause: 'NORMAL' };

    const tempValue = parseFloat(data.field1);
    const smokeStatus = data.field4; // 'NORMAL' o cualquier otra cosa

    const isTempAlert = tempValue > TEMP_CRITICA;
    const isSmokeAlert = smokeStatus !== 'NORMAL';
    
    let cause = 'NORMAL';
    let isAlert = false;

    if (isSmokeAlert && isTempAlert) {
        cause = "ALERTA DE HUMO Y TEMPERATURA";
        isAlert = true;
    } else if (isSmokeAlert) {
        cause = "ALERTA DE HUMO";
        isAlert = true;
    } else if (isTempAlert) {
        cause = "ALERTA DE TEMPERATURA";
        isAlert = true;
    }

    return { isAlert, cause };
  };

  // Función de Fetch
  const fetchData = async () => {
    try {
      const lastRes = await fetch(LAST_API_URL);
      if (!lastRes.ok) throw new Error("Error de red al obtener el último dato.");
      const lastJson = await lastRes.json();
      
      if (!lastJson || !lastJson.field1) {
          throw new Error("Canal de ThingSpeak vacío o datos no disponibles.");
      }
      setLastData(lastJson);

      // Obtener Datos Históricos (requerido para gráficos)
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

  // --- EFECTO: ALERTA AUDITIVA Y FETCH DE DATOS ---
  useEffect(() => {
    fetchData(); // Primer fetch
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!lastData) return;
    
    const { isAlert } = checkAlertStatus(lastData);
    
    // Reproducir sonido solo si hay alerta y el audio está cargado
    if (isAlert) {
        if (audioRef.current) {
            audioRef.current.loop = true; // Bucle
            audioRef.current.play().catch(e => console.error("Error al reproducir audio:", e));
        }
    } else {
        // Pausar y reiniciar si la alerta se detiene
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }
  }, [lastData]);


  // --- CLASES Y DATOS DE GRÁFICO (sin cambios en la estructura) ---
  const { isAlert, cause } = checkAlertStatus(lastData);
  
  const getAlertClasses = (isAlert) => 
    isAlert 
      ? 'bg-red-600 text-white shadow-xl transform scale-105 transition duration-150'
      : 'bg-white text-gray-800';

  const getChartData = (fieldKey, label, color) => {
    return {
        labels: historicalData ? historicalData.map(feed => new Date(feed.created_at).toLocaleTimeString('es-CL')) : [],
        datasets: [
            {
                label: label,
                data: historicalData ? historicalData.map(feed => parseFloat(feed[fieldKey])) : [],
                borderColor: color, 
                backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.5)'),
                tension: 0.1,
            },
        ],
    };
  };

  // Definiciones de Gráficos (igual que antes)
  const baseChartOptions = (titleText) => ({ /* ... */ });
  const tempChartData = getChartData('field1', 'Temperatura (°C)', 'rgb(59, 130, 246)'); 
  const tempChartOptions = { ...baseChartOptions('Temperatura (°C)'), scales: { y: { beginAtZero: true, max: 100 } } };
  const humidityChartData = getChartData('field2', 'Humedad (%)', 'rgb(34, 197, 94)'); 
  const humidityChartOptions = { ...baseChartOptions('Humedad (%)'), scales: { y: { beginAtZero: true, max: 100 } } };
  const smokeChartData = getChartData('field3', 'Nivel de Humo', 'rgb(249, 115, 22)'); 
  const smokeChartOptions = { ...baseChartOptions('Nivel de Humo'), scales: { y: { beginAtZero: true, max: 2500 } } };


  return (
    <div className="min-h-screen p-4 flex flex-col items-center bg-gray-100"> 
        {/* COMPONENTE DE AUDIO: Requiere un archivo 'alarm.mp3' o 'alarm.wav' en public/ */}
        <audio ref={audioRef} src="/alarm.mp3" preload="auto"></audio> 

      
      {loading ? (
        <p className="text-lg">Cargando datos...</p>
      ) : error ? (
        <p className="text-red-600 font-bold">{error}</p>
      ) : (
        <div className="w-full"> 
          
          {/* Fila 1: TÍTULO Y MÉTRICAS CLAVE (HEAD) */}
          <div className="flex flex-col items-center mb-6">
            <header className="flex items-center gap-2 mb-4">
              <img src="/logo.png" className="h-12 w-auto" alt="Ígneo Logo" /> 
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
                
                {/* Humedad con alerta */}
                <div className={`p-4 rounded-xl shadow-lg flex justify-between items-center text-left ${getAlertClasses(isHumidityAlert)}`}>
                  <span className="font-bold text-lg">Humedad: <span className="text-2xl">{lastData.field2} %</span></span>
                </div>

                {/* Humo/Causa Detectada (Muestra la causa calculada) */}
                <div className={`p-4 rounded-xl shadow-lg flex justify-between items-center text-left ${getAlertClasses(isSmokeAlert || isTempAlert)}`}>
                  <span className="font-bold text-lg">Alerta: <span className="text-2xl font-bold">{cause}</span></span>
                </div>
            </div>
          </div>
          
          {/* Fila 2: GRÁFICOS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            
            <div className="p-4 bg-white rounded-xl shadow-lg h-96"> <Line options={tempChartOptions} data={tempChartData} /> </div>
            <div className="p-4 bg-white rounded-xl shadow-lg h-96"> <Line options={humidityChartOptions} data={humidityChartData} /> </div>
            <div className="p-4 bg-white rounded-xl shadow-lg h-96"> <Line options={smokeChartOptions} data={smokeChartData} /> </div>
          </div>
          
          {/* Fila 3: DATOS EXTRA y MAPA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 w-full">
            
            {/* INFO EXTRA */}
            <div className="p-4 bg-white rounded-xl shadow-lg">
                <p className="text-sm">
                    **Datos del sensor:**
                    <br/>Última actualización: {lastData.created_at}
                    <br/>ID de entrada: {lastData.entry_id}
                    <br/>Alerta de Humedad: La humedad extrema (menor a {HUMEDAD_MIN}% o mayor a {HUMEDAD_MAX}%) dispara una alerta visual.
                    <br/>Temperatura Crítica: Mayor a {TEMP_CRITICA}°C.
                </p>
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