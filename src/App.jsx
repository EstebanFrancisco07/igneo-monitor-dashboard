import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

const HISTORICAL_API_URL =
  "https://api.thingspeak.com/channels/2998313/feeds.json?results=20"; 
const LAST_API_URL =
  "https://api.thingspeak.com/channels/2998313/feeds/last.json";

const LAT = -33.4489;
const LON = -70.6693;

const App = () => {
  const [lastData, setLastData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Datos para los 3 Gráficos
  const tempChartData = getChartData('field1', 'Temperatura (°C)', 'rgb(59, 130, 246)'); // Cambiado a azul para la gráfica
  const humidityChartData = getChartData('field2', 'Humedad (%)', 'rgb(34, 197, 94)'); // Verde
  const smokeChartData = getChartData('field3', 'Nivel de Humo', 'rgb(249, 115, 22)'); // Naranja

  // Opciones de Gráficos
  const baseChartOptions = (titleText) => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          title: { display: true, text: titleText, font: { size: 14, weight: 'bold' } },
          legend: { display: false } // Ocultar legendas para que el gráfico sea más limpio
      },
      scales: { y: { beginAtZero: true } }
  });

  const tempChartOptions = baseChartOptions('Temperatura (°C)');
  const humidityChartOptions = baseChartOptions('Humedad (%)');
  const smokeChartOptions = baseChartOptions('Nivel de Humo');
  smokeChartOptions.scales.y.max = 1024;


  return (
    // Fondo más limpio y padding reducido
    <div className="min-h-screen p-4 flex flex-col items-center bg-gray-100"> 
      
      {loading ? (
        <p className="text-lg">Cargando datos...</p>
      ) : error ? (
        <p className="text-red-600 font-bold">{error}</p>
      ) : (
        // CONTENEDOR PRINCIPAL: Ancho completo de la ventana (w-full)
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
                {/* Temp */}
                <div className="p-4 bg-white rounded-xl shadow-lg flex justify-between items-center text-left">
                  <span className="font-bold text-gray-700 text-lg">Temperatura: <span className="text-2xl text-red-600">{lastData.field1} °C</span></span>
                </div>
                
                {/* Humedad */}
                <div className="p-4 bg-white rounded-xl shadow-lg flex justify-between items-center text-left">
                  <span className="font-bold text-gray-700 text-lg">Humedad: <span className="text-2xl text-blue-600">{lastData.field2} %</span></span>
                </div>

                {/* Humo/Causa Detectada (Combinado en una sola métrica) */}
                <div className="p-4 bg-white rounded-xl shadow-lg flex justify-between items-center text-left">
                  <span className="font-bold text-gray-700 text-lg">Humo: <span className={`text-2xl font-bold ${lastData.field4 === 'NORMAL' ? 'text-green-600' : 'text-red-600'}`}>✔️ {lastData.field4}</span></span>
                </div>
            </div>
            
            {/* Ocultamos las tarjetas originales, ya que están arriba */}
          </div>
          
          {/* Fila 2: GRÁFICOS (3 columnas full-width) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            
            {/* GRÁFICO 1: TEMPERATURA */}
            <div className="p-4 bg-white rounded-xl shadow-lg h-96">
                <Line options={tempChartOptions} data={tempChartData} />
            </div>

            {/* GRÁFICO 2: HUMEDAD */}
            <div className="p-4 bg-white rounded-xl shadow-lg h-96">
                <Line options={humidityChartOptions} data={humidityChartData} />
            </div>

            {/* GRÁFICO 3: HUMO */}
            <div className="p-4 bg-white rounded-xl shadow-lg h-96">
                <Line options={smokeChartOptions} data={smokeChartData} />
            </div>
          </div>
          
          {/* Fila 3: DATOS EXTRA y MAPA (Horizontal, debajo de gráficos) */}
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
                  <Marker position={[LAT, LON]}>
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