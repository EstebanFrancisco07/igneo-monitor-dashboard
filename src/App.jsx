import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from 'leaflet'; 
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// 1. Registro de componentes de Chart.js
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

// --- ICONO PERSONALIZADO PARA EL MAPA ---
// Requiere el archivo 'red-arrow.png' en tu carpeta 'public/'
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

  const fetchData = async () => {
    try {
      // Obtener el ÚLTIMO DATO
      const lastRes = await fetch(LAST_API_URL);
      if (!lastRes.ok) throw new Error("Error de red al obtener el último dato.");
      const lastJson = await lastRes.json();
      
      if (!lastJson || !lastJson.field1) {
          throw new Error("Canal de ThingSpeak vacío o datos no disponibles.");
      }
      setLastData(lastJson);

      // Obtener DATOS HISTÓRICOS
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
    const interval = setInterval(fetchData, 5000); // Actualización cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  // --- LÓGICA DE ALERTAS ---
  const tempValue = lastData ? parseFloat(lastData.field1) : 0;
  const humidityValue = lastData ? parseFloat(lastData.field2) : 0;
  const isTempAlert = tempValue > 40; // Temperatura crítica
  const isHumidityAlert = humidityValue < 20 || humidityValue > 80; // Humedad extrema
  const isSmokeAlert = lastData && lastData.field4 !== 'NORMAL'; // Alerta de humo

  // Clases dinámicas para las métricas superiores (cambio de color)
  const getAlertClasses = (isAlert) => 
    isAlert 
      ? 'bg-red-600 text-white shadow-xl transform scale-105 transition duration-150'
      : 'bg-white text-gray-800';
  // --------------------------


  // Función para generar la estructura de datos común para los 3 gráficos
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

  // Opciones base de Gráficos
  const baseChartOptions = (titleText) => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          title: { display: true, text: titleText, font: { size: 14, weight: 'bold' } },
          legend: { display: false } 
      },
  });

  // Datos y Opciones de TEMPERATURA
  const tempChartData = getChartData('field1', 'Temperatura (°C)', 'rgb(59, 130, 246)'); 
  const tempChartOptions = baseChartOptions('Temperatura (°C)');
  tempChartOptions.scales = { y: { beginAtZero: true, max: 100 } };
  
  // Datos y Opciones de HUMEDAD
  const humidityChartData = getChartData('field2', 'Humedad (%)', 'rgb(34, 197, 94)'); 
  const humidityChartOptions = baseChartOptions('Humedad (%)');
  humidityChartOptions.scales = { y: { beginAtZero: true, max: 100 } };
  
  // Datos y Opciones de HUMO
  const smokeChartData = getChartData('field3', 'Nivel de Humo', 'rgb(249, 115, 22)'); 
  const smokeChartOptions = baseChartOptions('Nivel de Humo');
  smokeChartOptions.scales = { y: { beginAtZero: true, max: 2500 } };


  return (
    // Contenedor principal
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

                {/* Humo/Causa Detectada con alerta */}
                <div className={`p-4 rounded-xl shadow-lg flex justify-between items-center text-left ${getAlertClasses(isSmokeAlert)}`}>
                  <span className="font-bold text-lg">Humo: <span className="text-2xl font-bold">✔️ {lastData.field4}</span></span>
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
            
            {/* INFO EXTRA */}
            <div className="p-4 bg-white rounded-xl shadow-lg">
                <p className="text-sm">
                    **Datos del sensor:**
                    <br/>Última actualización: {lastData.created_at}
                    <br/>ID de entrada: {lastData.entry_id}
                    <br/>Actualización automática cada 5 segundos
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