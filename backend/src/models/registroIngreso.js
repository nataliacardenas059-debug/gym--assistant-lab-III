const mongoose = require('mongoose');

const registroIngresoSchema = new mongoose.Schema(
  {
    personaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Persona',
      required: true
    },

    fecha_hora: {
      type: Date,
      default: Date.now,
      required: true
    },

    // Método físico por el que se registró la entrada.
    metodo_ingreso: {
      type: String,
      trim: true,
      default: null
    },

    // Modalidad que autorizó el acceso.
    modalidad_acceso: {
      type: String,
      enum: [
        'beneficio_profesor_vinculado',
        'membresia',
        'beneficio_administrativo',
        'recepcionista'
      ],
      required: true
    },

    hora_salida: {
      type: Date,
      default: null
    },

    tiempo_total: {
      type: Number,
      min: 0,
      default: 0
    },

    estado: {
      type: String,
      enum: ['dentro', 'finalizado'],
      default: 'dentro'
    }
  },
  {
    timestamps: true
  }
);

registroIngresoSchema.pre('validate', function () {
  if (this.estado === 'dentro' && this.hora_salida !== null) {
    this.invalidate(
      'hora_salida',
      'Una visita en curso no puede tener hora de salida.'
    );
  }

  if (this.estado === 'finalizado' && !this.hora_salida) {
    this.invalidate(
      'hora_salida',
      'Una visita finalizada debe tener una hora de salida.'
    );
  }

  if (this.hora_salida && this.hora_salida < this.fecha_hora) {
    this.invalidate(
      'hora_salida',
      'La hora de salida no puede ser anterior a la entrada.'
    );
  }
});

registroIngresoSchema.index(
  { personaId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      estado: 'dentro'
    }
  }
);

module.exports = mongoose.model(
  'RegistroIngreso',
  registroIngresoSchema,
  'registros_ingreso'
);

