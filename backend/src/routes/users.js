import express from 'express';
import User from '../models/User.js';
import Donation from '../models/Donation.js';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';
import { deleteUserCascade } from '../services/userDeletionService.js';

const router = express.Router();

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Get all users (protected route)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get one user
router.get('/:id', async (req, res) => {
  try {
    // Intentar buscar por el campo personalizado 'id'
    let user = await User.findOne({ id: req.params.id }).select('-password');
    // Si no se encuentra, intentar como Mongo _id
    if (!user) {
      try {
        user = await User.findById(req.params.id).select('-password');
      } catch (_) {
        // Ignorar error de formato de ObjectId y continuar
      }
    }
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    // Filtrar transacciones eliminadas
    if (Array.isArray(user.transacciones)) {
      user.transacciones = user.transacciones.filter(t => !t.deleted);
    }
    // Calcular cantidad real de donaciones ENTREGADAS (status: 'delivered')
    const donacionesCount = await Donation.countDocuments({ donor: user._id, status: 'delivered' });
    const userObj = user.toObject();
    userObj.donacionesCount = donacionesCount;
    res.json(userObj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Register user
router.post('/register', async (req, res) => {
  try {
    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    const user = new User({
      id: req.body.id,
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      imagen: req.body.imagen,
      // Mapear provincia del frontend hacia los campos existentes del modelo
      zona: req.body.provincia || req.body.zona,
      ubicacion: req.body.provincia || req.body.ubicacion
    });

    const newUser = await user.save();
    const userResponse = newUser.toObject();
    delete userResponse.password;

    // Generar token JWT
    const token = jwt.sign(
      { id: userResponse.id, email: userResponse.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      user: userResponse,
      token
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    // Generar token JWT
    const token = jwt.sign(
      { id: userResponse.id, email: userResponse.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      user: userResponse,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const updateFields = [
      'nombre', 'apellido', 'username', 'email', 'password',
      'imagen', 'zona', 'telefono', 'mostrarContacto', 'transacciones'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        console.log(`[Backend] Actualizando campo ${field}:`, req.body[field]);
        if (field === 'mostrarContacto') {
          // Asegurar booleano real (maneja "false" string)
          user[field] = req.body[field] === true || req.body[field] === 'true';
        } else {
          user[field] = req.body[field];
          if (field === 'transacciones') {
            user.markModified('transacciones');
          }
        }
      }
    });
    
    console.log('[Backend] Usuario antes de guardar:', {
      zona: user.zona,
      telefono: user.telefono,
      email: user.email
    });

    const updatedUser = await user.save();
    const userResponse = updatedUser.toObject();
    delete userResponse.password;
    res.json(userResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    const summary = await deleteUserCascade(String(req.params.id));
    res.json({ message: 'Usuario eliminado en cascada', summary });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get('/:id/favoritos', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Buscando favoritos para usuario:', req.params.id);
    console.log('🔑 Usuario autenticado:', req.user.id);
    
    const user = await User.findOne({ id: req.params.id }).populate('favoritos');
    
    console.log('👤 Usuario encontrado:', !!user);
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log('💝 Favoritos sin filtrar:', user.favoritos?.length || 0);
    
    // Filtrar productos que aún existen y están disponibles
    const favoritosValidos = (user.favoritos || []).filter(producto => {
      if (!producto) {
        console.log('⚠️ Producto null/undefined encontrado');
        return false;
      }
      
      // Verificar que el producto no esté intercambiado
      if (producto.intercambiado) {
        console.log('🔄 Producto intercambiado filtrado:', producto.id);
        return false;
      }
      
      return true;
    });
    
    console.log('✅ Favoritos válidos:', favoritosValidos.length);
    
    // Mapear los productos para incluir información del owner
    const favoritosConOwner = await Promise.all(
      favoritosValidos.map(async (producto) => {
        try {
          // Buscar información del propietario
          const owner = await User.findOne({ id: producto.ownerId }).select('id nombre apellido username');
          
          return {
            ...producto.toObject(),
            owner: owner ? {
              id: owner.id,
              nombre: owner.nombre,
              apellido: owner.apellido,
              username: owner.username
            } : null,
            ownerName: owner ? `${owner.nombre} ${owner.apellido}`.trim() : null
          };
        } catch (error) {
          console.error('Error obteniendo owner para producto:', producto.id, error);
          return {
            ...producto.toObject(),
            owner: null,
            ownerName: null
          };
        }
      })
    );
    
    console.log('📦 Favoritos con owner:', favoritosConOwner.length);
    
    res.json(favoritosConOwner);
  } catch (error) {
    console.error('❌ Error al obtener favoritos:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al obtener favoritos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Agregar producto a favoritos
router.post('/:id/favoritos/:productId', authenticateToken, async (req, res) => {
  try {
    const { id: userId, productId } = req.params;
    
    console.log('➕ Agregando producto a favoritos:', { userId, productId });
    
    // Verificar que el usuario autenticado coincida con el ID del parámetro
    if (req.user.id !== userId) {
      console.log('❌ Usuario no autorizado:', req.user.id, 'vs', userId);
      return res.status(403).json({ message: 'No autorizado para modificar favoritos de otro usuario' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      console.log('❌ Usuario no encontrado:', userId);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que el producto existe
    const Product = (await import('../models/Product.js')).default;
    const producto = await Product.findOne({ id: Number(productId) });
    if (!producto) {
      console.log('❌ Producto no encontrado:', productId);
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Verificar que el usuario no esté agregando su propio producto
    if (producto.ownerId === Number(userId)) {
      console.log('❌ Intento de agregar producto propio:', { ownerId: producto.ownerId, userId });
      return res.status(400).json({ message: 'No puedes agregar tu propio producto a favoritos' });
    }

    // Verificar si ya está en favoritos
    const yaEsFavorito = user.favoritos.some(fav => fav.toString() === producto._id.toString());
    if (yaEsFavorito) {
      console.log('⚠️ Producto ya está en favoritos:', productId);
      return res.status(400).json({ message: 'El producto ya está en favoritos' });
    }

    // Agregar a favoritos
    user.favoritos.push(producto._id);
    await user.save();

    console.log('✅ Producto agregado a favoritos exitosamente');
    res.json({ 
      message: 'Producto agregado a favoritos', 
      favoritos: user.favoritos.length,
      productId: producto.id
    });
  } catch (error) {
    console.error('❌ Error al agregar a favoritos:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al agregar a favoritos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Quitar producto de favoritos
router.delete('/:id/favoritos/:productId', authenticateToken, async (req, res) => {
  try {
    const { id: userId, productId } = req.params;
    
    // Verificar que el usuario autenticado coincida con el ID del parámetro
    if (req.user.id !== userId) {
      return res.status(403).json({ message: 'No autorizado para modificar favoritos de otro usuario' });
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que el producto existe
    const Product = (await import('../models/Product.js')).default;
    const producto = await Product.findOne({ id: Number(productId) });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Verificar si el producto está en favoritos
    if (!user.favoritos.includes(producto._id)) {
      return res.status(400).json({ message: 'El producto no está en favoritos' });
    }

    // Quitar de favoritos
    user.favoritos = user.favoritos.filter(fav => fav.toString() !== producto._id.toString());
    await user.save();

    res.json({ message: 'Producto quitado de favoritos', favoritos: user.favoritos });
  } catch (error) {
    console.error('Error al quitar de favoritos:', error);
    res.status(500).json({ message: error.message });
  }
});

// Verificar si un producto está en favoritos
router.get('/:id/favoritos/check/:productId', authenticateToken, async (req, res) => {
  try {
    const { id: userId, productId } = req.params;
    
    console.log('🔍 Verificando si producto está en favoritos:', { userId, productId });
    
    const user = await User.findOne({ id: userId });
    if (!user) {
      console.log('❌ Usuario no encontrado:', userId);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar que el producto existe
    const Product = (await import('../models/Product.js')).default;
    const producto = await Product.findOne({ id: Number(productId) });
    if (!producto) {
      console.log('❌ Producto no encontrado:', productId);
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Verificar si está en favoritos
    const isFavorite = user.favoritos.some(fav => fav.toString() === producto._id.toString());
    
    console.log('💝 Es favorito:', isFavorite);
    
    res.json({ isFavorite });
  } catch (error) {
    console.error('❌ Error al verificar favorito:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor al verificar favorito',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router; 