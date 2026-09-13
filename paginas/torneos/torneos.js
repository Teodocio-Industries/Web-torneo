const entradaBuscar = document.querySelector('#buscar');
const botonesFiltro = document.querySelectorAll('.filtro');
const tarjetas = document.querySelectorAll('.tarjeta-torneo');
const mensaje = document.querySelector('.sin-resultados');

let filtroActual = 'todos';

function mostrarTorneos() {
  const texto = entradaBuscar.value.toLowerCase().trim();
  let cantidadVisible = 0;

  tarjetas.forEach((tarjeta) => {
    const coincideBusqueda = tarjeta.dataset.nombre.toLowerCase().includes(texto);
    const coincideFiltro = filtroActual === 'todos' || tarjeta.dataset.estado === filtroActual;
    const mostrar = coincideBusqueda && coincideFiltro;
    tarjeta.hidden = !mostrar;
    if (mostrar) cantidadVisible += 1;
  });

  mensaje.hidden = cantidadVisible !== 0;
}

entradaBuscar.addEventListener('input', mostrarTorneos);

botonesFiltro.forEach((boton) => {
  boton.addEventListener('click', () => {
    botonesFiltro.forEach((filtro) => filtro.classList.remove('activo'));
    boton.classList.add('activo');
    filtroActual = boton.dataset.filtro;
    mostrarTorneos();
  });
});
