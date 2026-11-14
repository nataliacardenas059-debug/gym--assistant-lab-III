const mongoose = require('mongoose');

const horarioAdministrativoSchema = new mongoose.Schema(
  {
    hora_inicio: {
      type: String,
      required: true,
      validate: {
        validator: function (hora) {
          return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
        },
        message: 'La hora de inicio debe tener el formato HH:mm.'
      }
    },

    hora_fin: {
      type: String,
      required: true,
      validate: {
        validator: function (hora) {
          return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
        },
        message: 'La hora de finalización debe tener el formato HH:mm.'
      }
    },

    activo: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);


horarioAdministrativoSchema.pre('validate', function () {
  if (
    this.hora_inicio &&
    this.hora_fin &&
    this.hora_fin <= this.hora_inicio
  ) {
    this.invalidate(
      'hora_fin',
      'La hora de finalización debe ser posterior a la hora de inicio.'
    );
  }
});

module.exports = mongoose.model(
  'HorarioAdministrativo',
  horarioAdministrativoSchema,
  'horarios_administrativos'
);
