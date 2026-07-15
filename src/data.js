/* ============================================================
   BALI BEST MOTORCYCLE — data: fleet + i18n
   Plain JS, attaches to window.BBM
   ============================================================ */
(function () {
  // ---- Fleet ----------------------------------------------------------
  // price = IDR per day (thousands). 200 = 200.000 IDR/day.
  const FLEET = [
    {
      id: "motorbike", brand: "BH Custom", model: "BH-G3", cat: "trail",
      price: 200, cc: 125, seats: 1, trans: "Automatic", fuel: "Petrol",
      tagEn: "Custom adventure scooter", tagEs: "Scooter de aventura custom",
      blurbEn: "Hand-built aluminium scooter. Tuned Yamaha Gear engine, spoke wheels, surf rack, kick starter, LED lights. Nothing like it on the island.",
      blurbEs: "Scooter de aluminio hecha a mano. Motor Yamaha Gear afinado, ruedas de radios, portatabla, arranque de patada, LEDs. No hay otra igual en la isla.",
      specs: { range: "250 km", weight: "80 kg", top: "95 km/h" },
      photo:  "assets/images/bike4.webp",
      photo2: "assets/images/bike3.webp",
    },
    {
      id: "cb150x", brand: "Honda", model: "CB150X", cat: "trail",
      price: 300, cc: 150, seats: 2, trans: "Manual", fuel: "Petrol",
      tagEn: "Adventure crossover", tagEs: "Crossover de aventura",
      blurbEn: "Honda's adventure-tourer, built for long days on Sumba's mixed roads. Upright riding position, long-travel suspension and a big tank for the island's distances.",
      blurbEs: "La adventure-tourer de Honda, pensada para días largos en las carreteras mixtas de Sumba. Posición de conducción erguida, suspensión de largo recorrido y depósito grande para las distancias de la isla.",
      specs: { range: "300 km", weight: "128 kg", top: "110 km/h" },
      photo: "assets/images/cb150x.webp",
      photo2: null,
    },
    {
      id: "buggy", brand: "Custom", model: "Beach Buggy", cat: "buggy",
      price: 0, cc: 200, seats: 2, trans: "Manual", fuel: "Petrol",
      tagEn: "Beach activity · Sandalwood Resort exclusive", tagEs: "Actividad de playa · exclusivo Sandalwood Resort",
      blurbEn: "Open-air buggy built for Sumba's coastal tracks and beach sand. Available as a guided beach activity at Sandalwood Resort only. Launching 2026.",
      blurbEs: "Buggy descapotable construido para las pistas costeras y la arena de Sumba. Actividad guiada exclusiva en Sandalwood Resort. Disponible en 2026.",
      specs: { range: "—", weight: "—", top: "—" },
      photo: "assets/images/buggy-removebg.png", photo2: null,
      comingSoon: true,
      locationOnly: "Sandalwood Resort",
    },
  ];

  const CATS = [
    { id: "all",   en: "All bikes", es: "Todas" },
    { id: "trail", en: "Trail",     es: "Trail" },
    { id: "buggy", en: "Buggy",     es: "Buggy" },
  ];

  const LOCATIONS = [
    { id: "airport", en: "Bandar Udara Lede Kalumbang", es: "Bandar Udara Lede Kalumbang" },
  ];

  // ---- One-way drop-off (extra fee, return only — pick-up is always airport) ----
  const DROPOFF_OPTIONS = [
    { id: "waingapu", en: "Waingapu", es: "Waingapu", fee: 1000 }, // +Rp 1,000,000 flat, one-way
  ];

  const EXTRAS = [];  // paid on-site

  // ---- Protection (mandatory choice at checkout) ----------------------
  // priceDay/priceFlat in IDR thousands, same convention as FLEET.price
  const PROTECTION = {
    insurance: { id: "insurance", priceDay: 100 },   // 100k IDR/day per bike, non-refundable
    deposit:   { id: "deposit",   priceFlat: 3000 }, // Rp 3,000,000 fixed per bike, refundable after return
  };

  // ---- Reviews (real — Bali Best Motorcycle, sister brand) -----------
  const REVIEWS = [
    {
      name: "Maxim K.", flag: "🇬🇧", country: "London, UK", rating: 5,
      textEn: "Booking took me 20 minutes from finding them on Google to confirming delivery. Huge selection — scooters, custom bikes, enduro. Prices are great and bike quality is 10/10. Had a small mishap and the team organised help in one hour. 5 stars for customer service!",
      textEs: "La reserva me llevó 20 minutos desde que los encontré en Google. Enorme selección: scooters, motos custom, enduro. Precios geniales y calidad 10/10. Tuve un contratiempo y el equipo me organizó ayuda en una hora. ¡5 estrellas por el servicio!",
      date: "May 2025",
    },
    {
      name: "Geimy M.", flag: "", country: "", rating: 5,
      textEn: "The best — would highly recommend. Very fair prices. Well maintained new bikes and excellent customer service. Definitely my number 1 go-to. Will be using again soon.",
      textEs: "Los mejores, lo recomiendo totalmente. Precios muy justos. Motos nuevas en perfecto estado y excelente servicio. Sin duda mi primera opción. Repetiré pronto.",
      date: "March 2026",
    },
    {
      name: "Alex E.", flag: "", country: "", rating: 5,
      textEn: "Great bikes and very good customer service. We had an amazing time. Picked up 2 bikes in one location and returned them in another. Full flexibility!",
      textEs: "Motos estupendas y muy buen servicio. Lo pasamos genial. Recogimos 2 motos en un punto y las devolvimos en otro diferente. ¡Total flexibilidad!",
      date: "September 2025",
    },
    {
      name: "David H.", flag: "🇪🇸", country: "Spain", rating: 5,
      textEn: "Good variety of modern bikes in great condition. Easy to book. Option for hotel pickup for a small fee. Would absolutely repeat!",
      textEs: "Buena variedad de motos modernas en buen estado. Fácil de reservar. Opción de recogida en hotel por una pequeña tarifa. ¡Repetiría sin duda!",
      date: "March 2026",
    },
    {
      name: "clauser h.", flag: "", country: "", rating: 5,
      textEn: "3 weeks, over 1,350 km — everything went perfectly. Good bikes, great price with insurance included. Best place for renting.",
      textEs: "3 semanas, más de 1.350 km — todo fue a la perfección. Buenas motos, gran precio con seguro incluido. El mejor sitio para alquilar.",
      date: "February 2026",
    },
    {
      name: "Roger G.", flag: "", country: "", rating: 5,
      textEn: "Very happy with my experience. Great selection and well maintained motorcycle. No hassle at return. Best selection I've seen.",
      textEs: "Muy contento con mi experiencia. Gran selección y moto muy bien mantenida. Sin problemas en la devolución. La mejor selección que he visto.",
      date: "September 2025",
    },
  ];

  // ---- i18n -----------------------------------------------------------
  const I18N = {
    en: {
      navFleet: "Our vehicles", navRoutes: "Routes", navHow: "How it works", navHelp: "Help",
      book: "Book now", bookYours: "Book your ride",
      heroKicker: "Ride Sumba",
      heroTitle1: "Discover Sumba", heroTitle2: "your own way",
      heroSub: "Hand-maintained trail bike, delivered to the airport. Savannah roads, hidden beaches, traditional villages — the island is yours.",
      searchFrom: "Pick-up", searchTo: "Return", searchWhere: "Location", searchGo: "Find my bike",
      from: "from", perDay: "/ day", day: "day", days: "days",
      trusted: "Trusted by 600+ riders", rating: "4.9 average rating",
      fleetTitle: "Our vehicles", fleetSub: "Every bike serviced before it reaches you. Free helmets, always.",
      whyTitle: "Why ride with us", 
      step1t: "Pick your dates", step1d: "Choose pick-up and return — we hold the bike instantly.",
      step2t: "Book your bike", step2d: "One trail bike, one adventure. The perfect machine for Sumba's tracks and beaches.",
      step3t: "Airport pick-up", step3d: "Pick up at Lede Kalumbang Airport — ready when you land.",
      step4t: "Ride & explore", step4d: "24/7 roadside support across the whole island.",
      reserve: "Reserve", details: "Details",
      // booking
      stepDates: "Dates & place", stepBike: "Your bike", stepExtras: "Add-ons", stepReview: "Review & pay",
      bkPickup: "Pick-up date", bkReturn: "Return date", bkPickLoc: "Pick-up location", bkRetLoc: "Return location",
      bkSame: "Return to same location", bkQty: "How many bikes?", bkContinue: "Continue",
      bkBack: "Back", bkChoose: "Choose this bike", bkSelected: "Selected", bkExtrasSub: "Make it yours — skip anything you don't need.",
      bkAdd: "Add", bkAdded: "Added", bkReviewTitle: "Your adventure", bkPay: "Pay with Stripe",
      bkSecure: "Secure checkout · powered by Stripe", bkSummary: "Summary",
      bkRental: "Rental", bkExtrasL: "Add-ons", bkTotal: "Total", bkDeposit: "Pay in full now",
      bkRest: "Paid online — nothing due on pick-up", bkNights: "rental days", bkFree: "Included free",
      confTitle: "You're going on an adventure!", 
      confSub: "Your booking is confirmed. We've sent the details and a map pin to your email.",
      confRef: "Booking reference", confNew: "Book another bike", confBack: "Back to home",
      free: "Free", helmet2: "2 helmets included", processing: "Connecting to Stripe…",
      reviewsTitle: "What our riders say",
      reviewsSource: "★ Reviews from our sister brand · Bali Best Motorcycle",
      reviewsAll: "See all reviews on Google",
      protTitle: "Protection", protSub: "Choose how your bike is covered — required for every booking.",
      protInsuranceT: "Insurance Fee", protInsuranceD: "100,000 IDR per bike, per day · Non-refundable",
      protDepositT: "Refundable Deposit", protDepositD: "Rp 3,000,000 per bike, fixed · Refunded after the rental ends",
    },
    es: {
      navFleet: "Nuestros vehículos", navRoutes: "Rutas", navHow: "Cómo funciona", navHelp: "Ayuda",
      book: "Reservar", bookYours: "Reserva tu moto",
      heroKicker: "Ride Sumba",
      heroTitle1: "Descubre Sumba", heroTitle2: "a tu manera",
      heroSub: "Moto trail cuidada a mano, entregada en el aeropuerto. Caminos de sabana, playas escondidas, pueblos tradicionales — la isla es tuya.",
      searchFrom: "Recogida", searchTo: "Devolución", searchWhere: "Lugar", searchGo: "Buscar mi moto",
      from: "desde", perDay: "/ día", day: "día", days: "días",
      trusted: "Más de 28.000 viajeros", rating: "4,9 de valoración media",
      fleetTitle: "Nuestros vehículos", fleetSub: "Cada moto revisada antes de llegar a ti. Cascos gratis, siempre.",
      whyTitle: "Por qué con nosotros",
      step1t: "Elige fechas", step1d: "Recogida y devolución — reservamos la moto al instante.",
      step2t: "Reserva tu moto", step2d: "Una moto trail, una aventura. La máquina perfecta para los caminos y playas de Sumba.",
      step3t: "Recogida en aeropuerto", step3d: "Recógela en el aeropuerto Lede Kalumbang — lista cuando aterrizas.",
      step4t: "Conduce y explora", step4d: "Asistencia en carretera 24/7 por toda la isla.",
      reserve: "Reservar", details: "Detalles",
      stepDates: "Fechas y lugar", stepBike: "Tu moto", stepExtras: "Extras", stepReview: "Revisar y pagar",
      bkPickup: "Fecha de recogida", bkReturn: "Fecha de devolución", bkPickLoc: "Lugar de recogida", bkRetLoc: "Lugar de devolución",
      bkSame: "Devolver en el mismo lugar", bkQty: "¿Cuántas motos?", bkContinue: "Continuar",
      bkBack: "Atrás", bkChoose: "Elegir esta moto", bkSelected: "Seleccionada", bkExtrasSub: "Hazla tuya — salta lo que no necesites.",
      bkAdd: "Añadir", bkAdded: "Añadido", bkReviewTitle: "Tu aventura", bkPay: "Pagar con Stripe",
      bkSecure: "Pago seguro · con tecnología de Stripe", bkSummary: "Resumen",
      bkRental: "Alquiler", bkExtrasL: "Extras", bkTotal: "Total", bkDeposit: "Pagar el total ahora",
      bkRest: "Pagado online — nada en la recogida", bkNights: "días de alquiler", bkFree: "Incluido gratis",
      confTitle: "¡Te vas de aventura!",
      confSub: "Tu reserva está confirmada. Hemos enviado los detalles y un punto en el mapa a tu email.",
      confRef: "Referencia de reserva", confNew: "Reservar otra moto", confBack: "Volver al inicio",
      free: "Gratis", helmet2: "2 cascos incluidos", processing: "Conectando con Stripe…",
      reviewsTitle: "Lo que dicen nuestros clientes",
      reviewsSource: "★ Reseñas de nuestra empresa hermana · Bali Best Motorcycle",
      reviewsAll: "Ver todas las reseñas en Google",
      protTitle: "Protección", protSub: "Elige cómo se cubre tu moto — obligatorio en cada reserva.",
      protInsuranceT: "Tarifa de seguro", protInsuranceD: "100.000 IDR por moto, por día · No reembolsable",
      protDepositT: "Depósito reembolsable", protDepositD: "Rp 3.000.000 por moto, fijo · Se devuelve al terminar el alquiler",
    },
  };

  // ---- Features carousel ----------------------------------------
  const FEATURES = [
    {
      id: "aluminum", icon: "shield",
      titleEn: "Full aluminium body", titleEs: "Carrocería de aluminio",
      descEn: "No plastic anywhere. Dents are fixed with a hammer and chisel. Built to survive Sumba's roads for years.",
      descEs: "Sin plásticos. Los golpes se arreglan con martillo y cincel. Hecha para durar años en las carreteras de Sumba.",
    },
    {
      id: "weight", icon: "weight",
      titleEn: "Ultra-light 80 kg", titleEs: "Ultra-ligera, 80 kg",
      descEn: "Lighter than any standard scooter. Easy to handle on any trail, easy to pick up if you go down.",
      descEs: "Más ligera que cualquier scooter estándar. Fácil de manejar en cualquier pista, fácil de levantar si caes.",
    },
    {
      id: "wheels", icon: "wheel",
      titleEn: "Spoke wheels — one of a kind", titleEs: "Ruedas de radios — única en el mercado",
      descEn: "The only scooter in the world with spoke wheels. Tube tires, not tubeless — because there are no compressors to remount in Sumba.",
      descEs: "La única scooter del mundo con ruedas de radios. Cámaras, no tubeless — porque en Sumba no hay compresores para remontar.",
    },
    {
      id: "tires", icon: "road",
      titleEn: "Mixed knob tires", titleEs: "Neumáticos mixtos con tacos",
      descEn: "Deep-tread mixed tires for tarmac, dirt tracks and beach sand. Made for Sumba's roads.",
      descEs: "Neumáticos mixtos de taco profundo para asfalto, tierra y arena de playa. Hechos para las carreteras de Sumba.",
    },
    {
      id: "kickstart", icon: "bolt",
      titleEn: "Kick starter backup", titleEs: "Arranque de patada",
      descEn: "Never get stranded. If the battery fails, the kick starter gets you going in seconds.",
      descEs: "Sin quedarte tirado. Si falla la batería, el arranque de patada te saca del apuro en segundos.",
    },
    {
      id: "leds", icon: "sun",
      titleEn: "Extra-long LED lights", titleEs: "LEDs de largo alcance",
      descEn: "Sumba has no street lights. Our high-power LEDs illuminate the road far ahead in complete darkness.",
      descEs: "Sumba no tiene farolas. Nuestros LEDs de alta potencia iluminan la carretera muy por delante en plena oscuridad.",
    },
    {
      id: "surf", icon: "surf",
      titleEn: "Built-in surf rack", titleEs: "Portatabla integrado",
      descEn: "Surf rack fitted as standard. Your board goes wherever you go — no extra charge.",
      descEs: "Portatabla instalado de serie. Tu tabla va donde tú vayas — sin coste extra.",
    },
    {
      id: "backrack", icon: "box",
      titleEn: "Back rack", titleEs: "Parrilla trasera",
      descEn: "Carry your backpack or luggage strapped securely to the rear. No bungee needed.",
      descEs: "Lleva tu mochila o equipaje sujeto de forma segura en la trasera. Sin gomas.",
    },
    {
      id: "frontrack", icon: "shop",
      titleEn: "Front rack", titleEs: "Parrilla delantera",
      descEn: "Front basket for bags and supplies. Perfect for a market run or full-day trip.",
      descEs: "Cesta delantera para bolsas y víveres. Perfecta para ir al mercado o una excursión de todo el día.",
    },
    {
      id: "phone", icon: "phone",
      titleEn: "Phone holder", titleEs: "Soporte de móvil",
      descEn: "Secure phone mount included as standard. Navigate hands-free on any road.",
      descEs: "Soporte de móvil incluido de serie. Navega con manos libres en cualquier carretera.",
    },
  ];

  window.BBM = { FLEET, CATS, LOCATIONS, DROPOFF_OPTIONS, EXTRAS, PROTECTION, REVIEWS, FEATURES, I18N };
})();
