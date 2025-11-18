import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from 'leaflet'; 
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
// Asegúrate de que tienes instalado 'chartjs-plugin-annotation' (npm install chartjs-plugin-annotation) si no funciona la línea punteada.

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

// Coordenadas del sensor
const LAT = -33.4489;
const LON = -70.6693;
// Dirección física de referencia para el popup del mapa
const SENSOR_ADDRESS = "Av. Libertador Bernardo O'Higgins 3300, Santiago, Chile"; 

// Umbral de temperatura crítica
const TEMP_CRITICA = 60; 

// Icono
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
  
  // --- FUNCIONES DE GRÁFICOS ---
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

  const baseChartOptions = (titleText) => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
          title: { display: true, text: titleText, font: { size: 14, weight: 'bold' } },
          legend: { display: false } 
      },
  });
  // ------------------------------------------

  // Definiciones de Gráficos (Escalas fijas)
  const tempChartData = getChartData('field1', 'Temperatura (°C)', 'rgb(59, 130, 246)'); 
  const tempChartOptions = {
      ...baseChartOptions('Temperatura (°C)'), // Copia opciones base
      scales: { y: { beginAtZero: true, max: 100 } },
      plugins: {
          ...baseChartOptions('Temperatura (°C)').plugins,
          // LÍNEA DE REFERENCIA DE ALERTA A 60°C
          annotation: {
              annotations: {
                  tempThreshold: {
                      type: 'line',
                      yMin: TEMP_CRITICA,
                      yMax: TEMP_CRITICA,
                      borderColor: 'rgb(255, 99, 132)', // Rojo
                      borderWidth: 2,
                      borderDash: [5, 5], // Línea punteada
                      label: {
                          content: 'Umbral Crítico',
                          enabled: true,
                          position: 'start',
                          backgroundColor: 'rgba(255, 99, 132, 0.7)',
                          color: 'white',
                          font: { size: 10 }
                      }
                  }
              }
          }
      }
  };
  
  const humidityChartData = getChartData('field2', 'Humedad (%)', 'rgb(34, 197, 94)'); 
  const humidityChartOptions = baseChartOptions('Humedad (%)');
  humidityChartOptions.scales = { y: { beginAtZero: true, max: 100 } };
  
  const smokeChartData = getChartData('field3', 'Nivel de Humo', 'rgb(249, 115, 22)'); 
  const smokeChartOptions = baseChartOptions('Nivel de Humo');
  smokeChartOptions.scales = { y: { beginAtZero: true, max: 2500 } };
  
  // --- COMPONENTE DE TABLA DE REGISTROS (FILTRADA Y CON FECHA) ---
  const HistoryTable = () => {
    if (!historicalData || historicalData.length === 0) return <p className="text-sm text-gray-500">No hay registros históricos recientes.</p>;

    const alertEntries = historicalData.filter(entry => entry.field4 !== 'NORMAL');

    if (alertEntries.length === 0) return <p className="text-sm text-gray-500">No se encontraron eventos de alerta en los últimos 20 registros.</p>;

    const recentAlerts = alertEntries.slice(-5).reverse(); 

    return (
      <div className="overflow-x-auto">
        <h3 className="font-bold text-gray-700 mb-2">Últimos Registros de Alerta ({recentAlerts.length})</h3>
        <table className="min-w-full bg-white text-xs border-collapse">
          <thead>
            <tr className="bg-gray-200 text-gray-600 uppercase text-left">
              <th className="py-1 px-2 border-b">FECHA</th>
              <th className="py-1 px-2 border-b">HORA</th>
              <th className="py-1 px-2 border-b">T (°C)</th>
              <th className="py-1 px-2 border-b">H (%)</th>
              <th className="py-1 px-2 border-b">Humo</th>
              <th className="py-1 px-2 border-b">Estado</th>
            </tr>
          </thead>
          <tbody>
            {recentAlerts.map((entry, index) => (
              <tr key={index} className="border-b hover:bg-red-50"> 
                <td className="py-1 px-2">{new Date(entry.created_at).toLocaleDateString('es-CL')}</td> 
                <td className="py-1 px-2">{new Date(entry.created_at).toLocaleTimeString('es-CL', {hour: '2-digit', minute:'2-digit'})}</td>
                <td className="py-1 px-2">{entry.field1}</td>
                <td className="py-1 px-2">{entry.field2}</td>
                <td className="py-1 px-2">{entry.field3}</td>
                <td className="py-1 px-2 font-semibold text-red-700">{entry.field4}</td>
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
                Ígneo Monitor de Incendio
              </h1>
            </header>

            {/* BARRA DE MÉTRICAS SUPERIOR (AJUSTADA PARA MOBILE) */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl"> 
                {/* Temp con alerta */}
                <div className={`p-4 rounded-xl shadow-lg flex flex-col justify-center items-start sm:items-center text-left sm:text-center ${getAlertClasses(isTempAlert)}`}>
                  <span className="font-bold text-lg">Temperatura:</span> 
                  <span className="text-3xl sm:text-2xl font-bold">{lastData.field1} °C</span>
                </div>
                
                {/* Humedad (Informativa, sin alerta roja) */}
                <div className={`p-4 bg-white text-gray-800 rounded-xl shadow-lg flex flex-col justify-center items-start sm:items-center text-left sm:text-center`}>
                  <span className="font-bold text-lg">Humedad:</span> 
                  <span className="text-3xl sm:text-2xl font-bold">{lastData.field2} %</span>
                </div>

                {/* Estado (Causa Detectada) - Se vuelve rojo con alerta de Temp o Humo */}
                <div className={`p-4 rounded-xl shadow-lg flex flex-col justify-center items-start sm:items-center text-left sm:text-center ${getAlertClasses(isSmokeAlert || isTempAlert)}`}>
                  <span className="font-bold text-lg">Estado:</span> 
                  <span className="text-3xl sm:text-2xl font-bold">{cause}</span>
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

            {/* MAPA con dirección actualizada */}
            <div className="h-40 rounded-xl overflow-hidden shadow-lg">
                <MapContainer
                  center={[LAT, LON]}
                  zoom={13}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[LAT, LON]} icon={redArrowIcon}> 
                    <Popup>
                        <strong className="block mb-1">Ubicación del sensor Ígneo</strong>
                        {SENSOR_ADDRESS} {/* ¡DIRECCIÓN AGREGADA AQUÍ! */}
                    </Popup>
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