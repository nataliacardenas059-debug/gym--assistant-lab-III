const mongoose = require('mongoose');

const profesorSchema = new mongoose.Schema(
  {
    personaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      required: true,
      unique: true
    },

    tipo_profesor: {
      type: String,
      required: true,
      enum: ['vinculado', 'externo']
    },

    horas_semana: {
      type: Number,
      min: 0,
      default: 0
    },

    cumple_horas: {
      type: Boolean,
      default: false
    },

    minutos_acumulados: {
      type: Number,
      min: 0,
      default: 0
    },

    inicio_semana_control: {
      type: Date,
      default: null
    },

    beneficio_activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  'Profesor',
  profesorSchema,
  'profesores'
);
