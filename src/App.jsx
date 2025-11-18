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
  const [historicalData, setHistoricalData] = useState(null);
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

  // Preparar datos para la gráfica de Temperatura
  const chartData = {
    labels: historicalData ? historicalData.map(feed => new Date(feed.created_at).toLocaleTimeString('es-CL')) : [],
    datasets: [
      {
        label: 'Temperatura (°C)',
        data: historicalData ? historicalData.map(feed => parseFloat(feed.field1)) : [],
        borderColor: 'rgb(239, 68, 68)', // Rojo de Tailwind (red-500)
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Histórico de Temperatura (Últimas 20 Entradas)',
      },
    },
    scales: {
        y: {
            beginAtZero: true
        }
    }
  };


  return (
    <div className="min-h-screen p-4 flex flex-col items-center bg-gray-100"> 
      
      {/* HEADER CON LOGO Y TÍTULO */}
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
        <>
          {/* TARJETAS */}
          <div className="grid grid-cols-2 gap-4 mb-6 w-full max-w-lg"> 
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
          
          {/* GRÁFICO DE TEMPERATURA */}
          {historicalData && (
             <div className="w-full max-w-lg p-4 bg-white rounded-xl shadow-lg mb-6">
                <Line options={chartOptions} data={chartData} />
             </div>
          )}


          {/* INFO EXTRA */}
          <div className="w-full max-w-lg p-4 bg-white rounded-xl shadow-lg mb-6">
            <p><strong>Última actualización:</strong> {lastData.created_at}</p>
            <p><strong>ID de entrada:</strong> {lastData.entry_id}</p>
          </div>

          {/* MAPA */}
          <div className="w-full max-w-lg h-64 mb-6 rounded-xl overflow-hidden shadow-lg">
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

          <p className="text-gray-500 text-sm">
            Actualización automática cada <strong>5 segundos</strong>
          </p>
        </>
      )}
    </div>
  );
};

export default App;