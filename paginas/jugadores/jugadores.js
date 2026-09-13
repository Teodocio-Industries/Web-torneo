const entradaBuscar = document.querySelector('#buscar');
const botonesFiltro = document.querySelectorAll('.filtro');
const tarjetas = document.querySelectorAll('.tarjeta-jugador');
const mensaje = document.querySelector('.sin-resultados');

let equipoActual = 'todos';

function mostrarJugadores() {
  const texto = entradaBuscar.value.toLowerCase().trim();
  let cantidadVisible = 0;

  tarjetas.forEach((tarjeta) => {
    const coincideNombre = tarjeta.dataset.nombre.toLowerCase().includes(texto);
    const coincideEquipo = equipoActual === 'todos' || tarjeta.dataset.equipo === equipoActual;
    const mostrar = coincideNombre && coincideEquipo;
    tarjeta.hidden = !mostrar;
    if (mostrar) cantidadVisible += 1;
  });

  mensaje.hidden = cantidadVisible !== 0;
}

entradaBuscar.addEventListener('input', mostrarJugadores);

botonesFiltro.forEach((boton) => {
  boton.addEventListener('click', () => {
    botonesFiltro.forEach((filtro) => filtro.classList.remove('activo'));
    boton.classList.add('activo');
    equipoActual = boton.dataset.equipo;
    mostrarJugadores();
  });
});
