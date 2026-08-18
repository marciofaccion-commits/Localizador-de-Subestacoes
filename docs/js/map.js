// map.js
(async function(){
  const CSV_URL = 'data/substations.csv';
  const map = L.map('map').setView([-22.9, -43.2], 10); // default Rio de Janeiro area
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,
    attribution:'© OpenStreetMap'
  }).addTo(map);

  const markers = L.markerClusterGroup();
  map.addLayer(markers);

  const resultsEl = document.getElementById('results');

  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/).filter(l=>l.trim());
    const header = lines[0].split('|').map(h=>h.trim());
    const rows = lines.slice(1).map(line=>{
      const cols = line.split('|').map(c=>c.trim());
      const obj = {};
      header.forEach((h,i)=>obj[h]=cols[i]||'');
      return obj;
    });
    return rows;
  }

  function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

  async function geocodeAddress(address){
    const key = 'geocode:'+address;
    const cached = localStorage.getItem(key);
    if(cached) return JSON.parse(cached);
    // Nominatim: be gentle — add delay outside when calling many
    const q = encodeURIComponent(address + ', Rio de Janeiro, Brazil');
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`;
    try{
      const resp = await fetch(url, {headers:{'Accept-Language':'pt-BR'}});
      if(!resp.ok) return null;
      const data = await resp.json();
      if(data&&data[0]){
        const out = {lat:parseFloat(data[0].lat),lon:parseFloat(data[0].lon)};
        localStorage.setItem(key, JSON.stringify(out));
        return out;
      }
    }catch(e){console.error('geocode error',e)}
    return null;
  }

  function haversine(a,b){
    const toRad = x=>x*Math.PI/180;
    const R = 6371; // km
    const dLat = toRad(b.lat-a.lat);
    const dLon = toRad(b.lon-a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat/2), sinDLon = Math.sin(dLon/2);
    const c = 2*Math.atan2(Math.sqrt(sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon), Math.sqrt(1-(sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon)));
    return R*c;
  }

  async function loadAndShow(){
    const res = await fetch(CSV_URL);
    const text = await res.text();
    const rows = parseCSV(text);
    // sequential geocode with delay to respect rate limits
    for(let i=0;i<rows.length;i++){
      const r = rows[i];
      const address = r['ENDEREÇO'] || r['ENDERECO'] || '';
      let geo = null;
      // try parse lat/lon if present in file (not in this example)
      if(r.lat && r.lon){geo={lat:parseFloat(r.lat),lon:parseFloat(r.lon)};}
      if(!geo){
        // try cache first
        geo = await geocodeAddress(address);
        // delay 1100ms between requests when not cached
        if(!localStorage.getItem('geocode:'+address)) await sleep(1100);
      }
      if(geo){
        const marker = L.marker([geo.lat,geo.lon]);
        marker.bindPopup(`<strong>${r['SIGLA']} — ${r['SUBESTAÇÃO']}</strong><br/>${address}`);
        markers.addLayer(marker);
        r._geo = geo;
      }else{
        console.warn('Sem coords para', r['SIGLA'], address);
      }
    }
    if(markers.getLayers().length) map.fitBounds(markers.getBounds(),{maxZoom:14});
  }

  function showNearest(point,rows,n){
    const withDist = rows.filter(r=>r._geo).map(r=>({r,dist:haversine(point,r._geo)}));
    withDist.sort((a,b)=>a.dist-b.dist);
    const nearest = withDist.slice(0,n);
    resultsEl.innerHTML = '';
    nearest.forEach(item=>{
      const div = document.createElement('div');
      div.innerHTML = `<strong>${item.r.SIGLA} — ${item.r['SUBESTAÇÃO']}</strong><br/>${item.r['ENDEREÇO']||''}<br/><em>${item.dist.toFixed(2)} km</em><hr/>`;
      resultsEl.appendChild(div);
    });
  }

  await loadAndShow();

  // controls
  document.getElementById('btn-locate').addEventListener('click', ()=>{
    if(!navigator.geolocation){alert('Geolocalização não suportada');return}
    navigator.geolocation.getCurrentPosition(pos=>{
      const pt = {lat:pos.coords.latitude,lon:pos.coords.longitude};
      L.circle([pt.lat,pt.lon],{radius:50, color:'#007bff'}).addTo(map);
      // compute nearest
      fetch(CSV_URL).then(r=>r.text()).then(text=>{
        const rows = parseCSV(text);
        // attach cached geos from localStorage
        rows.forEach(rr=>{const c=localStorage.getItem('geocode:'+rr['ENDEREÇO']); if(c){rr._geo=JSON.parse(c)}});
        const n = parseInt(document.getElementById('nearest-count').value,10)||5;
        showNearest(pt,rows,n);
      });
    },err=>{alert('Erro ao obter localização: '+err.message)},{enableHighAccuracy:true});
  });

  document.getElementById('btn-geocode-all').addEventListener('click', async ()=>{
    if(!confirm('Iremos consultar o serviço de geocodificação (Nominatim). Isso pode levar alguns minutos e está sujeito a limites de uso. Deseja continuar?')) return;
    const res = await fetch(CSV_URL); const text = await res.text(); const rows = parseCSV(text);
    for(const r of rows){
      const address = r['ENDEREÇO'];
      if(!localStorage.getItem('geocode:'+address)){
        await geocodeAddress(address);
        await sleep(1100);
      }
    }
    alert('Geocodificação finalizada (resultados em cache no navegador). Recarregue a página para ver marcadores.');
    location.reload();
  });

})();
