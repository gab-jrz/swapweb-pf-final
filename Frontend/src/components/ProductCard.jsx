import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProductImageUrl } from "../utils/getProductImageUrl.js";
import "../styles/ProductCard.css";

const ProductCard = ({ 
  id, 
  title, 
  description, 
  categoria, 
  image, 
  images, // Nuevo prop para array de imágenes
  fechaPublicacion, 
  provincia, 
  ownerName, 
  ownerId, 
  condicion, // Condición del producto
  valorEstimado, // Valor estimado
  disponible, // Disponibilidad
  onConsultar,
  hideFavoriteButton, // Oculta el botón de corazón
  showRemoveFavorite, // Muestra el botón rojo de eliminar de favoritos
  onRemoveFavorite // Handler para eliminar de favoritos
}) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  // Cargar estado de favorito desde localStorage al montar el componente
  useEffect(() => {
    const uid = (() => { try { return JSON.parse(localStorage.getItem('usuarioActual') || '{}')?.id || null; } catch { return null; } })();
    const key = uid ? `favorites:${uid}` : 'favorites';
    // migración suave global -> namespaced
    try {
      if (uid && !localStorage.getItem(key) && localStorage.getItem('favorites')) {
        localStorage.setItem(key, localStorage.getItem('favorites'));
      }
    } catch {}
    const favorites = JSON.parse(localStorage.getItem(key) || '[]');
    setIsFavorite(favorites.some(fav => fav.id === id));
  }, [id]);

  const handleOwnerClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (ownerId) {
      navigate(`/perfil-publico/${ownerId}`);
    }
  };

  const handleFavoriteToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Usar clave por usuario: favorites:<userId>
    const uid = (() => { try { return JSON.parse(localStorage.getItem('usuarioActual') || '{}')?.id || null; } catch { return null; } })();
    const key = uid ? `favorites:${uid}` : 'favorites';
    const favorites = JSON.parse(localStorage.getItem(key) || '[]');
    const productData = {
      id,
      title,
      description,
      categoria,
      image: getMainImage(),
      images,
      fechaPublicacion,
      provincia,
      ownerName,
      ownerId,
      condicion,
      valorEstimado,
      disponible
    };

    if (isFavorite) {
      // Remover de favoritos
      const updatedFavorites = favorites.filter(fav => fav.id !== id);
      localStorage.setItem(key, JSON.stringify(updatedFavorites));
      setIsFavorite(false);
    } else {
      // Agregar a favoritos
      const updatedFavorites = [...favorites, productData];
      localStorage.setItem(key, JSON.stringify(updatedFavorites));
      setIsFavorite(true);
    }
    
    // Disparar evento personalizado para notificar cambios en favoritos
    window.dispatchEvent(new CustomEvent('favoritesChanged'));
  };

  // Determinar la imagen a mostrar (portada)
  // Prioridad: 1) Primera imagen del array, 2) Imagen singular (compatibilidad), 3) Placeholder
  const getMainImage = () => {
    if (images && Array.isArray(images) && images.length > 0) {
      return images[0]; // Primera imagen como portada
    }
    if (image) {
      return image; // Fallback al sistema anterior
    }
    // No devolver una ruta hardcodeada inexistente; permitir que
    // getProductImageUrl maneje el placeholder global
    return null;
  };

  // Formatear fecha como DD/MM/YYYY
  const formatDateDMY = (input) => {
    const date = new Date(input);
    if (isNaN(date.getTime())) return '';
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Eliminado: etiqueta "Nuevo"

  return (
    <div className="product-card-premium">
      <div className="product-img-wrap">
        {getProductImageUrl(getMainImage()) ? (
          <img
            src={getProductImageUrl(getMainImage())}
            alt={title}
            className="product-img"
            onError={e => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="product-img-alt" style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'#f3f8ff',borderRadius:'12px',color:'#64748b',fontWeight:700,fontSize:'1.1rem'}}>
            {title}
          </div>
        )}
        {/* Badge "Nuevo" eliminado */}
        {/* Botón de favoritos solo si no está oculto por prop */}
        { !hideFavoriteButton && (
          <button 
            className={`favorite-btn ${isFavorite ? 'favorite-active' : ''}`}
            onClick={handleFavoriteToggle}
            title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path 
                d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                fill={isFavorite ? 'currentColor' : 'none'}
              />
            </svg>
          </button>
        )}
      </div>
      <div className="product-content">
        <div className="product-categoria-badge">
          {categoria}
        </div>
        <h3 className="product-title" onClick={onConsultar} style={{cursor: 'pointer'}}>
          {title}
        </h3>
        <p className="product-desc">{description}</p>
        <div className="product-meta-box">
          <div className="product-fecha-simple">
            Publicado el: {fechaPublicacion ? formatDateDMY(fechaPublicacion) : 'Sin fecha'}
          </div>
          <div className="product-provincia-simple">
            En: {provincia || 'Sin especificar'}
          </div>
          {/* Nombre del propietario clickeable dentro de la caja */}
          <div className="product-owner-simple" onClick={handleOwnerClick}>
            Por: <span className="product-owner-name">{ownerName || 'Usuario'}</span>
          </div>
        </div>
        <button className="product-consultar-btn" onClick={onConsultar} type="button">
          Consultar este producto
        </button>
        {showRemoveFavorite && (
          <button 
            className="product-remove-fav-btn" 
            onClick={(e) => { e.stopPropagation(); onRemoveFavorite && onRemoveFavorite(id); }} 
            type="button"
          >
            Eliminar de favoritos
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
