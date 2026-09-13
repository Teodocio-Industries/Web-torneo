const claveDatos = 'caribeSportsAdmin';
const jugadoresIniciales = [
  {
    nombre: 'Alex Mena',
    equipo: 'Tigres',
    posicion: 'Escolta',
    pin: '1027',
    puntos: 28.6,
    rebotes: 6.2,
    asistencias: 4.8,
    robos: 2.1,
    tapones: 0.4,
  },
  {
    nombre: 'Diego Morales',
    equipo: 'Titanes',
    posicion: 'Alero',
    pin: '2098',
    puntos: 24.1,
    rebotes: 7.5,
    asistencias: 3.6,
    robos: 1.5,
    tapones: 0.8,
  },
  {
    nombre: 'Samuel Ríos',
    equipo: 'Caribe Hoopers',
    posicion: 'Base',
    pin: '1134',
    puntos: 18.9,
    rebotes: 4.1,
    asistencias: 9.1,
    robos: 2.7,
    tapones: 0.2,
  },
  {
    nombre: 'Juan Pérez',
    equipo: 'Fénix B.C.',
    posicion: 'Pívot',
    pin: '3536',
    puntos: 16.7,
    rebotes: 12.4,
    asistencias: 2,
    robos: 1.1,
    tapones: 2.9,
  },
];

const datos = JSON.parse(localStorage.getItem(claveDatos)) || {
  jugadores: jugadoresIniciales,
  torneos: [],
};
const ventana = document.querySelector('#ventana-formulario');
const formulario = document.querySelector('#formulario');
const campos = document.querySelector('#campos-formulario');
const mensaje = document.querySelector('.mensaje-flotante');
let tipoActual = '';

const plantillas = {
  jugador: [
    ['Nombre completo', 'nombre', 'text', 'Ej. Laura Martínez'],
    ['Equipo', 'equipo', 'select', 'Tigres|Titanes|Caribe Hoopers|Fénix B.C.'],
    ['Posición', 'posicion', 'select', 'Base|Escolta|Alero|Ala-pívot|Pívot'],
    ['PIN de acceso', 'pin', 'text', '4 dígitos'],
  ],
  torneo: [
    ['Nombre del torneo', 'nombre', 'text', 'Ej. Copa del Caribe'],
    ['Categoría', 'categoria', 'select', 'Élite|Junior U16|Junior U14'],
    ['Fecha de inicio', 'inicio', 'date', ''],
    ['Fecha de finalización', 'fin', 'date', ''],
    ['Cantidad de equipos', 'equipos', 'number', '8'],
  ],
  equipo: [
    ['Nombre del equipo', 'nombre', 'text', 'Ej. Atlantic Stars'],
    ['Torneo', 'torneo', 'select', 'Liga de Otoño|Copa Junior|Torneo de Alto Nivel'],
    ['Nombre del responsable', 'responsable', 'text', 'Ej. María López'],
  ],
  partido: [
    ['Equipo local', 'local', 'select', 'Tigres|Titanes|Caribe Hoopers|Fénix B.C.'],
    ['Equipo visitante', 'visitante', 'select', 'Tigres|Titanes|Caribe Hoopers|Fénix B.C.'],
    ['Fecha y hora', 'fecha', 'datetime-local', ''],
    ['Cancha', 'cancha', 'text', 'Ej. Cancha 1'],
  ],
  resultado: [
    ['Puntos Tigres', 'local', 'number', '0'],
    ['Puntos Titanes', 'visitante', 'number', '0'],
  ],
  estadistica: [
    ['Jugador', 'nombre', 'select', jugadoresIniciales.map((jugador) => jugador.nombre).join('|')],
    ['Puntos', 'puntos', 'number', '0'],
    ['Rebotes', 'rebotes', 'number', '0'],
    ['Asistencias', 'asistencias', 'number', '0'],
    ['Robos', 'robos', 'number', '0'],
    ['Tapones', 'tapones', 'number', '0'],
  ],
};

function guardarDatos() {
  localStorage.setItem(claveDatos, JSON.stringify(datos));
}

function mostrarMensaje(texto) {
  mensaje.textContent = texto;
  mensaje.classList.add('visible');
  setTimeout(() => mensaje.classList.remove('visible'), 3000);
}

function agregarActividad(texto) {
  const lista = document.querySelector('#lista-actividad');
  const item = document.createElement('li');
  item.innerHTML = `<span class="punto verde"></span><p>${texto}<small>Ahora mismo</small></p>`;
  lista.prepend(item);
}

function pintarJugadores() {
  const tabla = document.querySelector('#tabla-jugadores');
  const tablaEstadisticas = document.querySelector('#tabla-estadisticas');
  const busqueda = document.querySelector('#buscar-jugador').value.toLowerCase();
  const equipo = document.querySelector('#filtro-equipo').value;
  const visibles = datos.jugadores.filter(
    (jugador) =>
      jugador.nombre.toLowerCase().includes(busqueda) &&
      (equipo === 'todos' || jugador.equipo === equipo),
  );

  tabla.innerHTML = visibles
    .map(
      (jugador) =>
        `<tr><td><b>${jugador.nombre}</b><small>Perfil activo</small></td><td>${jugador.equipo}</td><td>${jugador.posicion}</td><td>••••</td><td><button class="boton-icono" title="Editar">⋮</button></td></tr>`,
    )
    .join('');
  tablaEstadisticas.innerHTML = datos.jugadores
    .map(
      (jugador) =>
        `<tr><td><b>${jugador.nombre}</b><small>${jugador.equipo}</small></td><td>${jugador.puntos}</td><td>${jugador.rebotes}</td><td>${jugador.asistencias}</td><td>${jugador.robos}</td><td>${jugador.tapones}</td><td><button class="boton-icono" data-abrir="estadistica" title="Editar estadísticas">✎</button></td></tr>`,
    )
    .join('');
  document.querySelector('#total-jugadores').textContent = datos.jugadores.length;
}

function pintarTorneos() {
  const tabla = document.querySelector('#tabla-torneos');
  const nuevos = datos.torneos
    .map(
      (torneo) =>
        `<tr><td><b>${torneo.nombre}</b><small>${torneo.categoria}</small></td><td>${torneo.inicio || 'Por definir'} — ${torneo.fin || 'Por definir'}</td><td>${torneo.equipos}</td><td><span class="etiqueta naranja">PRÓXIMO</span></td><td><button class="boton-icono">⋮</button></td></tr>`,
    )
    .join('');
  tabla.querySelectorAll('.agregado').forEach((fila) => fila.remove());
  if (nuevos)
    tabla.insertAdjacentHTML('beforeend', nuevos.replaceAll('<tr>', '<tr class="agregado">'));
  document.querySelector('#total-torneos').textContent = 2 + datos.torneos.length;
}

function abrirFormulario(tipo) {
  tipoActual = tipo;
  const nombres = {
    jugador: 'Agregar jugador',
    torneo: 'Crear torneo',
    equipo: 'Agregar equipo',
    partido: 'Programar partido',
    resultado: 'Registrar resultado',
    estadistica: 'Registrar estadísticas',
  };
  document.querySelector('#titulo-formulario').textContent = nombres[tipo];
  document.querySelector('#tipo-formulario').textContent =
    tipo === 'estadistica' ? 'ACTUALIZAR RENDIMIENTO' : 'NUEVO REGISTRO';
  campos.innerHTML = plantillas[tipo]
    .map(([etiqueta, nombre, tipoCampo, opciones]) => {
      const contenido =
        tipoCampo === 'select'
          ? `<select name="${nombre}" required>${opciones
              .split('|')
              .map((opcion) => `<option>${opcion}</option>`)
              .join('')}</select>`
          : `<input name="${nombre}" type="${tipoCampo}" placeholder="${opciones}" ${tipoCampo === 'number' ? 'min="0"' : ''} required />`;
      return `<div class="campo ${nombre === 'nombre' && tipo === 'torneo' ? 'completo' : ''}"><label>${etiqueta}</label>${contenido}</div>`;
    })
    .join('');
  ventana.showModal();
}

function guardarFormulario(evento) {
  if (evento.submitter?.value === 'cancel') return;
  evento.preventDefault();
  const valores = Object.fromEntries(new FormData(formulario));

  if (tipoActual === 'jugador') {
    datos.jugadores.push({
      ...valores,
      puntos: 0,
      rebotes: 0,
      asistencias: 0,
      robos: 0,
      tapones: 0,
    });
    agregarActividad(`Se agregó el jugador <b>${valores.nombre}</b> al equipo ${valores.equipo}.`);
    pintarJugadores();
  }
  if (tipoActual === 'torneo') {
    datos.torneos.push(valores);
    agregarActividad(`Se creó el torneo <b>${valores.nombre}</b>.`);
    pintarTorneos();
  }
  if (tipoActual === 'equipo')
    agregarActividad(`Se agregó el equipo <b>${valores.nombre}</b> a ${valores.torneo}.`);
  if (tipoActual === 'partido')
    agregarActividad(`Se programó ${valores.local} vs. ${valores.visitante}.`);
  if (tipoActual === 'resultado')
    agregarActividad(
      `Se registró el resultado Tigres ${valores.local} — ${valores.visitante} Titanes.`,
    );
  if (tipoActual === 'estadistica') {
    const jugador = datos.jugadores.find((item) => item.nombre === valores.nombre);
    if (jugador)
      Object.assign(
        jugador,
        Object.fromEntries(Object.entries(valores).filter(([clave]) => clave !== 'nombre')),
      );
    pintarJugadores();
    agregarActividad(`Se actualizaron las estadísticas de <b>${valores.nombre}</b>.`);
  }

  guardarDatos();
  ventana.close();
  mostrarMensaje('Los cambios se guardaron correctamente.');
}

function cambiarVista(nombre) {
  document
    .querySelectorAll('.vista')
    .forEach((vista) => vista.classList.toggle('activa', vista.id === nombre));
  document
    .querySelectorAll('.opcion-menu')
    .forEach((boton) => boton.classList.toggle('activa', boton.dataset.vista === nombre));
  document.querySelector('#nombre-vista').textContent = nombre.toUpperCase();
  document.querySelector('#titulo-vista').textContent =
    nombre === 'resumen' ? 'Buenos días, Jeronimo' : nombre[0].toUpperCase() + nombre.slice(1);
}

document
  .querySelectorAll('.opcion-menu')
  .forEach((boton) => boton.addEventListener('click', () => cambiarVista(boton.dataset.vista)));
document
  .querySelectorAll('[data-ir]')
  .forEach((boton) => boton.addEventListener('click', () => cambiarVista(boton.dataset.ir)));
document
  .querySelectorAll('[data-abrir]')
  .forEach((boton) => boton.addEventListener('click', () => abrirFormulario(boton.dataset.abrir)));
document.querySelector('#buscar-jugador').addEventListener('input', pintarJugadores);
document.querySelector('#filtro-equipo').addEventListener('change', pintarJugadores);
document
  .querySelector('.cerrar-aviso')
  .addEventListener('click', (evento) => evento.currentTarget.parentElement.remove());
formulario.addEventListener('submit', guardarFormulario);
document.querySelector('#exportar').addEventListener('click', () => {
  const archivo = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(archivo);
  enlace.download = 'caribe-sports-datos.json';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
  mostrarMensaje('Se descargó una copia de los datos.');
});

pintarJugadores();
pintarTorneos();
