function peso(n){ return '₱' + Number(n).toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2}); }

function renderReceipt(){
  const raw = localStorage.getItem('farmville_booking');
  const box = document.getElementById('receipt-section');

  if(!raw){
    box.innerHTML = `<div class="confirm-box">
      <h2>No Booking Found</h2>
      <p style="color:var(--muted);margin-bottom:20px;">We couldn't find a recent booking to show a receipt for.</p>
      <a href="booking.html" class="btn btn-primary">Go to Booking Page</a>
    </div>`;
    return;
  }

  const b = JSON.parse(raw);
  document.getElementById('r-ref').textContent = b.ref;
  document.getElementById('receipt-details').innerHTML = `
    <h4 style="color:var(--navy);margin:18px 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.5px;">Guest Information</h4>
    <div class="summary-line"><span>Name</span><span>${b.name}</span></div>
    <div class="summary-line"><span>Email</span><span>${b.email}</span></div>
    <div class="summary-line"><span>Phone</span><span>${b.phone}</span></div>

    <h4 style="color:var(--navy);margin:18px 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.5px;">Booking Details</h4>
    <div class="summary-line"><span>Room</span><span>${b.roomName}</span></div>
    <div class="summary-line"><span>Check-in</span><span>${b.ci}</span></div>
    <div class="summary-line"><span>Check-out</span><span>${b.co}</span></div>
    <div class="summary-line"><span>Nights</span><span>${b.nights}</span></div>
    <div class="summary-line"><span>Guests</span><span>${b.guests}</span></div>

    <h4 style="color:var(--navy);margin:18px 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.5px;">Payment Details</h4>
    <div class="summary-line"><span>Room subtotal</span><span>${peso(b.subtotal)}</span></div>
    <div class="summary-line"><span>Eco/resort fee (5%)</span><span>${peso(b.fee)}</span></div>
    <div class="summary-line total"><span>Total Stay Cost</span><span>${peso(b.total)}</span></div>
    <div class="summary-line down"><span>Down Payment Paid Today</span><span>${peso(b.deposit)}</span></div>
    <div class="summary-line"><span>Balance Due at Check-in</span><span>${peso(b.balance)}</span></div>
    <div class="summary-line"><span>Payment Method</span><span>${b.methodDetail}</span></div>
    <div class="summary-line"><span>Date Booked</span><span>${b.dateBooked}</span></div>`;
}

function goBookAgain(){
  localStorage.removeItem('farmville_booking');
  window.location.href = 'booking.html';
}

document.addEventListener('DOMContentLoaded', renderReceipt);
