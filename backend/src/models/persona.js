const mongoose = require('mongoose');

const personaSchema = new mongoose.Schema(
  {
    nombre_completo: {
      type: String,
      required: true,
      trim: true
    },

    numero_documento: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    tipo_documento: {
      type: String,
      required: true,
      trim: true
    },

    tipo_persona: {
      type: String,
      required: true,
      enum: [
        'estudiante',
        'profesor',
        'administrativo',
        'recepcionista'
      ]
    },

    rol: {
      type: String,
      required: true,
      enum: ['usuario', 'recepcionista'],
      default: 'usuario'
    },

    estado: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo'
    },

    ultima_asistencia: {
      type: Date,
      default: null
    },

    correo: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      default: undefined
    },

    tipo_acceso: {
      type: String,
      enum: ['membresia', 'beneficio'],
      default: undefined
    },

    password: {
      type: String,
      select: false
    }
  },
  {
    timestamps: true
  }
);


personaSchema.pre('validate', function () {
  const esRecepcionista = this.tipo_persona === 'recepcionista';

  if (esRecepcionista && this.rol !== 'recepcionista') {
    this.invalidate(
      'rol',
      'El recepcionista debe tener el rol recepcionista.'
    );
  }

  if (!esRecepcionista && this.rol !== 'usuario') {
    this.invalidate(
      'rol',
      'Solo el recepcionista puede tener ese rol.'
    );
  }
});

module.exports = mongoose.model(
  'Persona',
  personaSchema,
  'personas'
);


