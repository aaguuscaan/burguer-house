export const storeConfig = {
  name: "Burger House",

  address: "Parque Sakura, Pavón, Buenos Aires, Argentina",

  phone: "11 1234-5678",

  whatsapp: "5491121833530",

  instagram: "@burgerhouse",

  schedule: "Todos los días · 19:00–01:00",

  delivery: {
    enabled: true,

    radiusKm: 5,

    baseCost: 1500,

    freeFrom: 25000,
  },

  paymentMethods: [
    "Efectivo",
    "Transferencia",
    "Tarjeta",
  ],
};