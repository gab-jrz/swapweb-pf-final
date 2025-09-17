import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TransactionCard from '../components/TransactionCard';
import ProductCard from '../components/ProductCard';
import useProducts from '../hooks/useProducts';
import '../styles/PerfilUsuario-Remodelado.css';
import '../styles/PerfilPublico.css';
import PerfilDetallesBox from '../components/PerfilDetallesBox.jsx';
import { API_URL } from '../config';

const PerfilPublico = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState(null);

  // Sincronización en caliente si el usuario visualizado es el mismo que el logueado
  useEffect(() => {
    const handleProfileUpdated = (event) => {
      const updatedUser = event.detail;
      if (updatedUser.id === id) {
        setUsuario(updatedUser);
      }
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdated);
    return () => window.removeEventListener('userProfileUpdated', handleProfileUpdated);
  }, [id]);

  // Usar hook personalizado para productos con sincronización automática
  const { productos, loading: productosLoading, error: productosError, fetchProducts } = useProducts([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Función para consultar por un artículo
  const handleConsultarArticulo = (producto) => {
    // Navegar al detalle del producto
    navigate(`/producto/${producto.id}`);
  };

  useEffect(() => {
    const cargarDatosUsuario = async () => {
      try {
        setLoading(true);
        console.log('🔍 Cargando datos para usuario ID:', id);
        console.log('🌐 API_URL:', API_URL);
        
        // Obtener datos del usuario
        console.log('📡 Fetching usuario:', `${API_URL}/users/${id}`);
        const resUsuario = await fetch(`${API_URL}/users/${id}`);
        console.log('📊 Respuesta usuario status:', resUsuario.status);
        
        if (!resUsuario.ok) {
          const errorText = await resUsuario.text();
          console.error('❌ Error respuesta usuario:', errorText);
          throw new Error(`No se pudo cargar el perfil del usuario: ${resUsuario.status}`);
        }
        
        const dataUsuario = await resUsuario.json();
        console.log('✅ Datos usuario cargados:', dataUsuario);
        setUsuario(dataUsuario);

        // Obtener productos del usuario usando el hook con sincronización automática
        await fetchProducts({ ownerId: dataUsuario.id });
        
        console.log('🎉 Carga de datos completada exitosamente');
      } catch (err) {
        console.error('💥 Error al cargar datos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      cargarDatosUsuario();
    } else {
      console.error('❌ No se proporcionó ID de usuario');
    }

    // Refrescar automáticamente cuando se emita una nueva calificación para este usuario
    const onNewRating = (e) => {
      const target = e?.detail?.userId;
      if (target && String(target) === String(id)) {
        cargarDatosUsuario();
      }
    };
    window.addEventListener('calificacion:nueva', onNewRating);
    return () => window.removeEventListener('calificacion:nueva', onNewRating);
  }, [id]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!usuario) {
    return (
      <div className="not-found">
        <h2>Usuario no encontrado</h2>
      </div>
    );
  }

  // Estadísticas derivadas
  const intercambiosTotal = Array.isArray(usuario?.transacciones) ? usuario.transacciones.length : 0;
  const productosActivos = Array.isArray(productos) ? productos.filter(p => !p.intercambiado).length : 0;
  const productosPublicados = Array.isArray(productos) ? productos.length : 0;
  const donacionesCount = usuario?.donacionesCount || 0;
  


  return (
    <div className="perfil-publico perfil-publico--replica">
      <Header isHome={false} />
      
      {/* Botón de regreso si se accede desde el chat */}
      {location.state?.fromChat && (
        <div className="regresar-container-premium" style={{ padding: '1rem 2rem' }}>
          <button 
            className="btn-regresar" 
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            Volver al chat
          </button>
        </div>
      )}
      
      <main className="perfil-publico-container">
        <section className="perfil-header-premium">
  <div className="perfil-card-premium">
    {/* Avatar Premium */}
    <div className="avatar-container-premium">
      <div className="avatar-wrapper-premium">
        <img
          src={usuario.imagen || '/images/fotoperfil.jpg'}
          alt="Foto de perfil"
          className="avatar-image-premium"
          onError={e => { e.target.onerror = null; e.target.src = '/images/fotoperfil.jpg'; }}
        />
        <div className="avatar-ring-premium"></div>
      </div>
    </div>

    {/* Información Principal */}
    <div className="perfil-main-info-premium">
      <h1 className="perfil-nombre-premium">
        {`${(usuario.nombre || '').trim()} ${(usuario.apellido || '').trim()}`.trim()}
      </h1>

      {/* Stats Premium - Estructura mejorada */}
      <div className="perfil-stats-premium">
        {/* Tarjeta de Calificación (simple y consistente) */}
        <div className="stat-card-premium" style={{ '--delay': '0s' }} onClick={() => navigate(`/calificaciones/${id}`)} aria-label="Ver calificaciones" role="button">
          <div className="stat-svg-icon stat-svg-star">
            <svg width="28" height="28" viewBox="0 0 24 24">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#FACC15" stroke="none"/>
            </svg>
          </div>
          <div className="stat-number-premium stat-number-rating">
            {Number.isFinite(Number(usuario?.promedioCalificaciones))
              ? Number(usuario.promedioCalificaciones).toFixed(1)
              : Number(usuario?.calificacion || 0).toFixed(1)}
          </div>
          <span className="stat-label-premium">Calificación</span>
        </div>
        
        {/* Tarjeta de Intercambios */}
        <div className="stat-card-premium" style={{ '--delay': '0.08s' }}>
          <div className="stat-number-premium">{intercambiosTotal}</div>
          <span className="stat-label-premium">Intercambios</span>
        </div>
        
        {/* Tarjeta de Productos Activos */}
        <div className="stat-card-premium" style={{ '--delay': '0.16s' }}>
          <div className="stat-number-premium">{productosActivos}</div>
          <span className="stat-label-premium">Productos activos</span>
        </div>
        
        {/* Tarjeta de Donaciones */}
        <div className="stat-card-premium" style={{ '--delay': '0.24s' }}>
          <div className="stat-number-premium">{donacionesCount}</div>
          <span className="stat-label-premium">Donaciones</span>
        </div>

      </div>


      <PerfilDetallesBox
        provincia={usuario.zona}
        email={usuario.email}
        mostrarContacto={!!usuario.mostrarContacto}
      />
    </div>
  </div>
</section>
        
        <section className="perfil-productos">
          <h2 className="seccion-titulo-premium">Productos Disponibles</h2>

          {/* Filtrar productos activos (no intercambiados) */}
          {productos.filter(p => !p.intercambiado).length > 0 ? (
            <div className="productos-grid">
              {productos.filter(p => !p.intercambiado).map((producto, idx) => (
                <ProductCard
                  key={producto.id}
                  id={producto.id}
                  title={producto.title}
                  description={producto.description}
                  categoria={producto.categoria}
                  image={producto.image}
                  images={producto.images}
                  fechaPublicacion={producto.fechaPublicacion || producto.createdAt}
                                     provincia={producto.zona || producto.provincia || producto.ubicacion}
                  ownerName={usuario.nombre}
                  ownerId={usuario.id}
                  condicion={producto.condicion}
                  valorEstimado={producto.valorEstimado}
                  disponible={producto.disponible}
                  hideFavoriteButton={true}
                  onConsultar={() => handleConsultarArticulo(producto)}
                />
              ))}
            </div>
          ) : (
            <p style={{ color: '#888', marginTop: '2rem' }}>Este usuario no tiene productos activos publicados.</p>
          )}
        </section>

        {/* Estadísticas adicionales premium */}
        <section className="perfil-estadisticas-premium">
          <h3 className="estadisticas-titulo-premium">Estadísticas del Perfil</h3>
          <div className="perfil-stats-premium">
            {/* Calificaciones recibidas (primero) */}
            <div className="stat-card-premium stat-card-rating" style={{ '--delay': '0s' }}>
              <div className="stat-svg-icon stat-svg-star">
                <svg width="28" height="28" viewBox="0 0 24 24">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#FACC15" stroke="none"/>
                </svg>
              </div>
              <div className="stat-number-premium">{Array.isArray(usuario.calificaciones) ? usuario.calificaciones.length : 0}</div>
              <span className="stat-label-premium">Calificaciones recibidas</span>
            </div>

            {/* Intercambios completados */}
            <div className="stat-card-premium" style={{ '--delay': '0.05s' }}>
              <div className="stat-svg-icon stat-svg-exchange">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 17v-2a4 4 0 0 0-4-4H5"/>
                  <polyline points="7 15 5 17 7 19"/>
                  <path d="M3 7v2a4 4 0 0 0 4 4h12"/>
                  <polyline points="17 9 19 7 17 5"/>
                </svg>
              </div>
              <div className="stat-number-premium">{intercambiosTotal}</div>
              <span className="stat-label-premium">Intercambios completados</span>
            </div>

            {/* Productos activos */}
            <div className="stat-card-premium" style={{ '--delay': '0.1s' }}>
              <div className="stat-svg-icon stat-svg-active">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="4" fill="#e0f7fa"/>
                  <circle cx="12" cy="12" r="5" fill="#06b6d4"/>
                </svg>
              </div>
              <div className="stat-number-premium">{productosActivos}</div>
              <span className="stat-label-premium">Productos activos</span>
            </div>

            {/* Productos publicados */}
            <div className="stat-card-premium" style={{ '--delay': '0.15s' }}>
              <div className="stat-svg-icon stat-svg-published">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7b2ff2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="16" rx="4" fill="#ede9fe"/>
                  <path d="M8 8h8v8H8z" fill="#7b2ff2"/>
                </svg>
              </div>
              <div className="stat-number-premium">{productosPublicados}</div>
              <span className="stat-label-premium">Productos publicados</span>
            </div>
          </div>
        </section>

        {/* Reseñas recientes */}
        <section className="perfil-resenas-recientes" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 className="estadisticas-titulo-premium" style={{ margin: 0 }}>Reseñas recientes</h3>
            <button
              onClick={() => navigate(`/calificaciones/${id}`)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
              }}
            >
              Ver todas
            </button>
          </div>
          {Array.isArray(usuario.calificaciones) && usuario.calificaciones.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {[...usuario.calificaciones].slice(-3).reverse().map((c, i) => (
                <div key={`rev-${i}`} style={{
                  background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12,
                  padding: '10px 12px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, color: '#0f172a' }}>{c.deNombre || 'Usuario'}</span>
                      <span aria-label={`${c.rating} estrellas`} style={{ color: '#f59e0b', fontWeight: 700 }}>
                        {'★'.repeat(Math.max(0, Math.min(5, Number(c.rating)||0)))}
                        <span style={{ color: '#cbd5e1' }}>
                          {'★'.repeat(Math.max(0, 5 - Math.max(0, Math.min(5, Number(c.rating)||0))))}
                        </span>
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{c.fecha ? (()=>{ const d=new Date(c.fecha); if(isNaN(d.getTime())) return '-'; const dd=String(d.getDate()).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const yyyy=d.getFullYear(); return `${dd}/${mm}/${yyyy}`; })() : '-'}</span>
                  </div>
                  {(c.productoOfrecido || c.productoSolicitado) && (
                    <div style={{ marginTop: 6, fontSize: 13, color: '#334155' }}>
                      {(c.productoOfrecido || '').trim()} {c.productoOfrecido && c.productoSolicitado ? '↔' : ''} {(c.productoSolicitado || '').trim()}
                    </div>
                  )}
                  {(c.comentario || '').trim() ? (
                    <div style={{ marginTop: 6, fontSize: 14, color: '#0f172a', whiteSpace: 'pre-line' }}>
                      {String(c.comentario).length > 160 ? `${String(c.comentario).slice(0,160)}...` : c.comentario}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#64748b', marginTop: 10 }}>Este usuario aún no tiene reseñas.</p>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default PerfilPublico;
