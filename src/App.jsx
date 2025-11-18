import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from 'leaflet'; 
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import DatePicker from 'react-datepicker'; // Asegúrate de tener esta librería instalada
import { format } from 'date-fns'; // Asegúrate de tener esta librería instalada
import "react-datepicker/dist/react-datepicker.css"; // Estilos CSS del DatePicker

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
const THINGSPEAK_CHANNEL_ID = "2998313";
const THINGSPEAK_READ_KEY = "TU_READ_API_KEY_AQUI"; // <<-- REEMPLAZA ESTO
const LAST_API_URL =
  `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds/last.json`;

const LAT = -33.4489;
const LON = -70.6693;

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
  
  // ESTADO PARA EL SELECTOR DE FECHAS
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());

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

  // --- FUNCIÓN DE FETCH MODIFICADA PARA USAR RANGO DE FECHAS ---
  const fetchData = async () => {
    const startFormatted = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
    const endFormatted = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");

    const HISTORICAL_API_URL_RANGE = 
      `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_KEY}&start=${startFormatted}&end=${endFormatted}`;
      
    try {
      const lastRes = await fetch(LAST_API_URL);
      const lastJson = await lastRes.json();
      setLastData(lastJson);

      const historyRes = await fetch(HISTORICAL_API_URL_RANGE);
      const historyJson = await historyRes.json();
      setHistoricalData(historyJson.feeds);

    } catch (err) {
      // Manejo de errores
    }
    setLoading(false);
  };
  // -------------------------------------------------------------

  useEffect(() => {
    fetchData(); 
    const interval = setInterval(fetchData, 5000); 
    return () => clearInterval(interval);
  }, [startDate, endDate]); // Re-fetch al cambiar fechas

  const { isTempAlert, isSmokeAlert, cause } = getAlertStatus(lastData);
  
  const getAlertClasses = (isAlert) => 
    isAlert 
      ? 'bg-red-600 text-white shadow-xl transform scale-105 transition duration-150'
      : 'bg-white text-gray-800';
  
  // Funciones de Gráficos (simplificadas para el código final)
  const getChartData = (fieldKey, label, color) => { /* ... */ return {}; };
  const baseChartOptions = (titleText) => ({ /* ... */ });

  const tempChartData = getChartData('field1', 'Temperatura (°C)', 'rgb(59, 130, 246)'); 
  const tempChartOptions = baseChartOptions('Temperatura (°C)');
  tempChartOptions.scales = { y: { beginAtZero: true, max: 100 } };
  
  const humidityChartData = getChartData('field2', 'Humedad (%)', 'rgb(34, 197, 94)'); 
  const humidityChartOptions = baseChartOptions('Humedad (%)');
  humidityChartOptions.scales = { y: { beginAtZero: true, max: 100 } };
  
  const smokeChartData = getChartData('field3', 'Nivel de Humo', 'rgb(249, 115, 22)'); 
  const smokeChartOptions = baseChartOptions('Nivel de Humo');
  smokeChartOptions.scales = { y: { beginAtZero: true, max: 2500 } };
  
  // --- COMPONENTE DE TABLA DE REGISTROS CORREGIDO Y FILTRADO ---
  const HistoryTable = () => {
    if (!historicalData || historicalData.length === 0) return <p className="text-sm text-gray-500">No hay registros históricos para el rango seleccionado.</p>;

    // 1. FILTRAR: Solo entradas donde el ESTADO (field4) no sea 'NORMAL'
    const alertEntries = historicalData.filter(entry => entry.field4 !== 'NORMAL');

    if (alertEntries.length === 0) return <p className="text-sm text-gray-500">No se encontraron eventos de alerta ('Humo', 'Temperatura' o 'Ambos') en este rango.</p>;

    // Tomar las últimas 5 entradas de alerta y revertir el orden para mostrar la más reciente arriba
    const recentAlerts = alertEntries.slice(-5).reverse(); 

    return (
      <div className="overflow-x-auto">
        <h3 className="font-bold text-gray-700 mb-2">Últimos Registros de Alerta ({recentAlerts.length})</h3>
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
            {recentAlerts.map((entry, index) => (
              <tr key={index} className="border-b hover:bg-red-50"> {/* Fondo rojo claro para las filas de alerta */}
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
      
      {/* ... (código de loading y error) ... */}
      
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
            {/* ... (código de métricas) ... */}
        </div>
      </div>

      {/* NUEVA FILA: SELECTOR DE FECHAS */}
      <div className="w-full max-w-4xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-lg flex justify-center space-x-4">
          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
              <span>Desde:</span>
              <DatePicker 
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="dd/MM/yyyy"
                  className="border p-1 rounded text-center"
              />
          </label>
          <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
              <span>Hasta:</span>
              <DatePicker 
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  dateFormat="dd/MM/yyyy"
                  className="border p-1 rounded text-center"
              />
          </label>
      </div>

      {/* Fila 2: GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        {/* ... (código de gráficos) ... */}
      </div>
      
      {/* Fila 3: TABLA DE HISTORIAL Y MAPA */}
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
  );
};

export default App;