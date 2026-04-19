fetch('http://localhost:8080/api/pagos/suscripcion/1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ monto: 50, metodoPago: 'EFECTIVO' })
})
.then(r => r.text())
.then(t => console.log(t))
.catch(e => console.error(e));
