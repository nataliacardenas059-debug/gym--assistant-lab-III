const mongoose = require('mongoose');

const membresiaSchema = new mongoose.Schema(
  {
    personaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      required: true
    },

    fecha_inicio: {
      type: Date,
      required: true
    },

    fecha_fin: {
      type: Date,
      default: null,
      required: function () {
        return this.tipo !== 'chequera';
      },
      validate: {
        validator: function (fechaFin) {
          return this.tipo === 'chequera' || (fechaFin && fechaFin >= this.fecha_inicio);
        },
        message: 'La fecha de finalización no puede ser anterior a la fecha de inicio.'
      }
    },

    tipo: {
      type: String,
      required: true,
      enum: ['mensual', 'chequera', 'beneficio']
    },

    dias_restantes: {
      type: Number,
      min: 0,
      default: null,
      required: function () {
        return this.tipo === 'chequera';
      }
    },

    estado: {
      type: String,
      enum: ['activa', 'inactiva'],
      default: 'activa'
    },

    comprobante: {
      type: String,
      default: null
    },

    tipo_beneficio: {
      type: String,
      enum: ['ninguno', 'administrativo', 'profesor'],
      default: 'ninguno'
    }
  },
  {
    timestamps: true
  }
);


membresiaSchema.pre('validate', function () {
  if (this.tipo === 'beneficio' && this.tipo_beneficio === 'ninguno') {
    this.invalidate(
      'tipo_beneficio',
      'Una membresía de tipo beneficio debe especificar el tipo de beneficio.'
    );
  }

  if (this.tipo !== 'beneficio' && this.tipo_beneficio !== 'ninguno') {
    this.invalidate(
      'tipo_beneficio',
      'Solo las membresías de tipo beneficio pueden tener un tipo de beneficio.'
    );
  }

  if (this.tipo !== 'chequera' && this.dias_restantes !== null) {
    this.invalidate(
      'dias_restantes',
      'Los días restantes solo aplican para las membresías de tipo chequera.'
    );
  }
});

module.exports = mongoose.model(
  'Membresia',
  membresiaSchema,
  'membresias'
);
