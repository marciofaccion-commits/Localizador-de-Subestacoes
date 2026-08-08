# Localizador de Subestações

Este PR adiciona uma versão mínima do site do localizador em /docs usando Leaflet + OpenStreetMap.

O fluxo de geocodificação usa Nominatim (OpenStreetMap) e armazena resultados em cache no localStorage do navegador. Para ver marcadores rapidamente, clique em "Geocodificar endereços" e aguarde; o processo respeita atrasos para evitar estourar limites.

Para publicar o site via GitHub Pages:
1. Faça merge desta branch na branch padrão (ex.: main).
2. Vá em Settings > Pages e selecione "Branch: main" e a pasta "/docs".

Notas:
- Se tiver um arquivo GeoJSON/CSV com lat/lon, substitua docs/data/substations.csv pelo arquivo com campos lat e lon para evitar consultas a geocoding.
- Se preferir, posso adaptar o código para usar uma chave do Mapbox/Google (requererá configurar variáveis de ambiente).
