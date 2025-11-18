import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

const API_URL =
  "https://api.thingspeak.com/channels/2998313/feeds/last.json";

const LAT = -33.4489;
const LON = -70.6693;

const App = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error("Error al obtener datos de ThingSpeak");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen p-4 flex flex-col items-center">
      
      {/* HEADER CON LOGO Y TÍTULO */}
      <header className="flex items-center gap-4 mb-6">
        <img src="/logo.png" className="h-16" alt="Ígneo Logo" />
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
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-white rounded-xl shadow text-center">
              <p className="font-bold text-gray-700">Temperatura (°C)</p>
              <p className="text-4xl text-red-500 font-bold">
                {data.field1}
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl shadow text-center">
              <p className="font-bold text-gray-700">Humedad (%)</p>
              <p className="text-4xl text-blue-500 font-bold">
                {data.field2}
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl shadow text-center">
              <p className="font-bold text-gray-700">Humo</p>
              <p className="text-4xl text-orange-500 font-bold">
                {data.field3}
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl shadow text-center">
              <p className="font-bold text-gray-700">Causa Detectada</p>
              <p className="text-2xl text-purple-600 font-bold">
                {data.field4}
              </p>
            </div>
          </div>

          {/* INFO EXTRA */}
          <div className="w-full p-4 bg-white rounded-xl shadow mb-6">
            <p><strong>Última actualización:</strong> {data.created_at}</p>
            <p><strong>ID de entrada:</strong> {data.entry_id}</p>
          </div>

          {/* MAPA */}
          <div className="w-full h-64 mb-6 rounded-xl overflow-hidden shadow">
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
