import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

// 1. Registrar los componentes necesarios para Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// URL para obtener DATOS HISTÓRICOS (últimos 20 resultados)
const HISTORICAL_API_URL =
  "https://api.thingspeak.com/channels/2998313/feeds.json?results=20"; 
  
// URL para obtener el ÚLTIMO DATO (para las tarjetas)
const LAST_API_URL =
  "https://api.thingspeak.com/channels/2998313/feeds/last.json";

const LAT = -33.4489;
const LON = -70.6693;

const App = () => {
  const [lastData, setLastData] = useState(null);
  const [historicalData, setHistoricalData = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      // 1. Obtener el ÚLTIMO DATO
      const lastRes = await fetch(LAST_API_URL);
      if (!lastRes.ok) throw new Error("Error de red al obtener el último dato.");
      const lastJson = await lastRes.json();
      
      if (!lastJson || !lastJson.field1) {
          throw new Error("Canal de ThingSpeak vacío o datos no disponibles.");
      }
      setLastData(lastJson);

      // 2. Obtener DATOS HISTÓRICOS
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

  // 1. Datos para Temperatura (Field 1)
  const tempChartData = getChartData('field1', 'Temperatura (°C)', 'rgb(239, 68, 68)');
  const tempChartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Permitir que el gráfico llene el contenedor
    plugins: { title: { display: true, text: 'Histórico de Temperatura' } },
    scales: { y: { beginAtZero: true } }
  };

  // 2. Datos para Humedad (Field 2)
  const humidityChartData = getChartData('field2', 'Humedad (%)', 'rgb(59, 130, 246)');
  const humidityChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { title: { display: true, text: 'Histórico de Humedad' } },
    scales: { y: { beginAtZero: true } }
  };
  
  // 3. Datos para Humo (Field 3)
  const smokeChartData = getChartData('field3', 'Humo', 'rgb(249, 115, 22)');
  const smokeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { title: { display: true, text: 'Histórico de Humo' } },
    scales: { y: { beginAtZero: true, max: 1024 } }
  };


  return (
    // Contenedor principal con padding lateral y ancho máximo ajustado
    <div className="min-h-screen p-6 flex flex-col items-center bg-gray-100"> 
      
      {/* HEADER (Centrado y en el tope) */}
      <header className="flex items-center gap-4 mb-6">
        <img src="/logo.png" className="h-16 w-auto" alt="Ígneo Logo" /> 
        <h1 className="text-5xl font-extrabold text-red-600 drop-shadow">
          Ígneo Monitor
        </h1>
      </header>

      {loading ? (
        <p className="text-lg">Cargando datos...</p>
      ) : error ? (
        <p className="text-red-600 font-bold">{error}</p>
      ) : (
        // CONTENEDOR PRINCIPAL DE DATOS: 100% de ancho del viewport (p-10)
        // Usamos un div principal para los gráficos y el mapa
        <div className="w-full grid lg:grid-cols-3 xl:grid-cols-4 gap-4"> 
          
          {/* COLUMNA 1: TARJETAS Y DATOS EXTRA (COLSPAN 1) */}
          <div className="flex flex-col space-y-4">
            
            {/* Tarjetas */}
            <div className="grid grid-cols-2 gap-4"> 
              <div className="p-4 bg-white rounded-xl shadow-lg text-center">
                <p className="font-bold text-gray-700">Temperatura (°C)</p>
                <p className="text-4xl text-red-500 font-bold">
                  {lastData.field1}
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-lg text-center">
                <p className="font-bold text-gray-700">Humedad (%)</p>
                <p className="text-4xl text-blue-500 font-bold">
                  {lastData.field2}
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-lg text-center">
                <p className="font-bold text-gray-700">Humo</p>
                <p className="text-4xl text-orange-500 font-bold">
                  {lastData.field3}
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl shadow-lg text-center">
                <p className="font-bold text-gray-700">Causa Detectada</p>
                <p className="text-2xl text-purple-600 font-bold">
                  {lastData.field4}
                </p>
              </div>
            </div>
            
            {/* Info Extra (Separado de las tarjetas) */}
            <div className="p-4 bg-white rounded-xl shadow-lg">
              <p><strong>Última actualización:</strong> {lastData.created_at}</p>
              <p><strong>ID de entrada:</strong> {lastData.entry_id}</p>
              <p className="text-gray-500 text-sm mt-2">
                Actualización automática cada <strong>5 segundos</strong>
              </p>
            </div>

            {/* Mapa (Ahora debajo de las tarjetas, usando el espacio libre) */}
            <div className="w-full h-80 rounded-xl overflow-hidden shadow-lg">
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
          
          {/* COLUMNA 2-4: GRÁFICOS (COLSPAN 2 ó 3 en pantallas grandes) */}
          <div className="lg:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-fr">
            
            {/* GRÁFICO 1: TEMPERATURA */}
            <div className="p-4 bg-white rounded-xl shadow-lg h-full min-h-60">
                <Line options={tempChartOptions} data={tempChartData} />
            </div>

            {/* GRÁFICO 2: HUMEDAD */}
            <div className="p-4 bg-white rounded-xl shadow-lg h-full min-h-60">
                <Line options={humidityChartOptions} data={humidityChartData} />
            </div>

            {/* GRÁFICO 3: HUMO */}
            <div className="p-4 bg-white rounded-xl shadow-lg h-full min-h-60">
                <Line options={smokeChartOptions} data={smokeChartData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;