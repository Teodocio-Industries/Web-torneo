const equipoSeleccionado = document.querySelector('#nombre-equipo');

document.querySelectorAll('.equipo').forEach((equipo) => {
  equipo.addEventListener('click', () => {
    document.querySelector('.equipo.seleccionado')?.classList.remove('seleccionado');
    equipo.classList.add('seleccionado');
    equipoSeleccionado.value = equipo.querySelector('span').textContent;
  });
});

document.querySelector('#formulario-jugador').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const pin = document.querySelector('#pin').value;
  document.querySelector('.mensaje-formulario').textContent =
    pin.length === 4
      ? 'Acceso validado. Cargando estadísticas…'
      : 'Ingresa un PIN válido de 4 dígitos.';
});
