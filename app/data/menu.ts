export type ProductOption = {
  id: string;
  name: string;
  type: "radio" | "checkbox";
  required?: boolean;
  options: {
    id: string;
    name: string;
    price: number;
  }[];
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  badge?: string;

  options?: ProductOption[];

  removableIngredients?: {
    id: string;
    name: string;
  }[];
};

export const categories = [
  { id: "burgers", name: "Burgers", icon: "🍔" },
  { id: "pizza", name: "Pizza", icon: "🍕" },
  { id: "milanesas", name: "Milanesas", icon: "🥩" },
  { id: "empanadas", name: "Empanadas", icon: "🥟" },
  { id: "pollo", name: "Pollo", icon: "🍗" },
  { id: "sandwiches", name: "Sándwiches", icon: "🥪" },
  { id: "combos", name: "Combos", icon: "🍟" },
  { id: "postres", name: "Postres", icon: "🍰" },
];

export const products: Product[] = [
  {
    id: "doble-bacon",
    name: "Doble Bacon",
    description:
      "Doble carne smash, cheddar, bacon crocante y salsa de la casa.",
    price: 12500,
    image: "/images/products/doble-bacon.webp",
    category: "burgers",
    badge: "MÁS VENDIDO",

    removableIngredients: [
      { id: "cheddar", name: "Cheddar" },
      { id: "bacon", name: "Bacon" },
      { id: "salsa", name: "Salsa de la casa" },
    ],

    options: [
      {
        id: "combo",
        name: "Elegí tu combo",
        type: "radio",
        required: true,
        options: [
          { id: "solo", name: "Solo burger", price: 0 },
          { id: "papas", name: "Burger + papas", price: 2500 },
          {
            id: "completo",
            name: "Burger + papas + bebida",
            price: 4000,
          },
        ],
      },
      {
        id: "extras",
        name: "Agregá extras",
        type: "checkbox",
        options: [
          { id: "cheddar", name: "Extra cheddar", price: 1000 },
          { id: "bacon", name: "Extra bacon", price: 1500 },
          { id: "huevo", name: "Huevo", price: 1000 },
          {
            id: "papas-cheddar-bacon",
            name: "Papas con cheddar y bacon",
            price: 3000,
          },
        ],
      },
    ],
  },

  {
    id: "classic-burger",
    name: "Classic Burger",
    description:
      "Carne smash, cheddar, lechuga, tomate y salsa especial.",
    price: 10500,
    image: "/images/products/classic-burguer.jpg",
    category: "burgers",

    removableIngredients: [
      { id: "cheddar", name: "Cheddar" },
      { id: "lechuga", name: "Lechuga" },
      { id: "tomate", name: "Tomate" },
      { id: "salsa", name: "Salsa especial" },
    ],

    options: [
      {
        id: "combo",
        name: "Elegí tu combo",
        type: "radio",
        required: true,
        options: [
          { id: "solo", name: "Solo burger", price: 0 },
          { id: "papas", name: "Burger + papas", price: 2500 },
          {
            id: "completo",
            name: "Burger + papas + bebida",
            price: 4000,
          },
        ],
      },
      {
        id: "extras",
        name: "Agregá extras",
        type: "checkbox",
        options: [
          { id: "cheddar", name: "Extra cheddar", price: 1000 },
          { id: "bacon", name: "Extra bacon", price: 1500 },
          { id: "huevo", name: "Huevo", price: 1000 },
          {
            id: "papas-cheddar-bacon",
            name: "Papas con cheddar y bacon",
            price: 3000,
          },
        ],
      },
    ],
  },

  {
    id: "bbq-burger",
    name: "BBQ Burger",
    description:
      "Carne smash, cheddar, cebolla crispy y salsa BBQ.",
    price: 11800,
    image: "/images/products/bbq-burguer.jpg",
    category: "burgers",
    badge: "NUEVO",

    removableIngredients: [
      { id: "cheddar", name: "Cheddar" },
      { id: "cebolla", name: "Cebolla crispy" },
      { id: "salsa-bbq", name: "Salsa BBQ" },
    ],

    options: [
      {
        id: "combo",
        name: "Elegí tu combo",
        type: "radio",
        required: true,
        options: [
          { id: "solo", name: "Solo burger", price: 0 },
          { id: "papas", name: "Burger + papas", price: 2500 },
          {
            id: "completo",
            name: "Burger + papas + bebida",
            price: 4000,
          },
        ],
      },
      {
        id: "extras",
        name: "Agregá extras",
        type: "checkbox",
        options: [
          { id: "cheddar", name: "Extra cheddar", price: 1000 },
          { id: "bacon", name: "Extra bacon", price: 1500 },
          {
            id: "papas-cheddar-bacon",
            name: "Papas con cheddar y bacon",
            price: 3000,
          },
        ],
      },
    ],
  },

  {
    id: "pizza-especial",
    name: "Pizza Especial",
    description:
      "Muzzarella, jamón, morrones, aceitunas y huevo.",
    price: 15000,
    image: "/images/products/pizza-especial.jpg",
    category: "pizza",
    badge: "MÁS VENDIDA",

    removableIngredients: [
      { id: "muzzarella", name: "Muzzarella" },
      { id: "jamon", name: "Jamón" },
      { id: "morrones", name: "Morrones" },
      { id: "aceitunas", name: "Aceitunas" },
      { id: "huevo", name: "Huevo" },
    ],

    options: [
      {
        id: "size",
        name: "Elegí el tamaño",
        type: "radio",
        required: true,
        options: [
          { id: "small", name: "Chica", price: 0 },
          { id: "medium", name: "Mediana", price: 3000 },
          { id: "large", name: "Grande", price: 5000 },
        ],
      },
      {
        id: "extras",
        name: "Agregá extras",
        type: "checkbox",
        options: [
          { id: "mozzarella", name: "Extra muzzarella", price: 1500 },
          { id: "ham", name: "Extra jamón", price: 1200 },
          { id: "peppers", name: "Morrones", price: 800 },
          { id: "arugula", name: "Rúcula", price: 1000 },
        ],
      },
    ],
  },

  {
    id: "pizza-napolitana",
    name: "Pizza Napolitana",
    description:
      "Muzzarella, tomate fresco, ajo, orégano y aceite de oliva.",
    price: 13500,
    image: "/images/products/napolitana.avif",
    category: "pizza",

    removableIngredients: [
      { id: "muzzarella", name: "Muzzarella" },
      { id: "tomate", name: "Tomate" },
      { id: "ajo", name: "Ajo" },
      { id: "oregano", name: "Orégano" },
      { id: "aceite", name: "Aceite de oliva" },
    ],

    options: [
      {
        id: "size",
        name: "Elegí el tamaño",
        type: "radio",
        required: true,
        options: [
          { id: "small", name: "Chica", price: 0 },
          { id: "medium", name: "Mediana", price: 3000 },
          { id: "large", name: "Grande", price: 5000 },
        ],
      },
      {
        id: "extras",
        name: "Agregá extras",
        type: "checkbox",
        options: [
          { id: "mozzarella", name: "Extra muzzarella", price: 1500 },
          { id: "ham", name: "Extra jamón", price: 1200 },
          { id: "arugula", name: "Rúcula", price: 1000 },
        ],
      },
    ],
  },

  {
    id: "milanesa-napolitana",
    name: "Milanesa Napolitana",
    description:
      "Milanesa de carne, salsa de tomate, jamón y mozzarella.",
    price: 14000,
    image: "/images/products/milanesa-napolitana.jpg",
    category: "milanesas",

    removableIngredients: [
      { id: "salsa", name: "Salsa de tomate" },
      { id: "jamon", name: "Jamón" },
      { id: "mozzarella", name: "Mozzarella" },
    ],

    options: [
      {
        id: "side",
        name: "Elegí tu guarnición",
        type: "radio",
        required: true,
        options: [
          { id: "fries", name: "Papas fritas", price: 0 },
          { id: "mashed", name: "Puré de papas", price: 0 },
          { id: "salad", name: "Ensalada", price: 0 },
        ],
      },
      {
        id: "extras",
        name: "Agregá extras",
        type: "checkbox",
        options: [
          { id: "egg", name: "Huevo", price: 1000 },
          { id: "cheddar", name: "Extra cheddar", price: 1000 },
          { id: "bacon", name: "Extra bacon", price: 1500 },
          {
            id: "papas-cheddar-bacon",
            name: "Papas con cheddar y bacon",
            price: 3000,
          },
        ],
      },
    ],
  },

  {
    id: "empanada-carne",
    name: "Empanada de Carne",
    description:
      "Carne cortada a cuchillo, cebolla y especias.",
    price: 2200,
    image: "/images/products/empanadas-carne.webp",
    category: "empanadas",

    removableIngredients: [
      { id: "cebolla", name: "Cebolla" },
    ],

    options: [
      {
        id: "quantity",
        name: "Elegí la cantidad",
        type: "radio",
        required: true,
        options: [
          { id: "1", name: "1 unidad", price: 0 },
          { id: "6", name: "6 unidades", price: 10000 },
          { id: "12", name: "12 unidades", price: 19000 },
        ],
      },
    ],
  },

  {
    id: "chicken-tenders",
    name: "Chicken Tenders",
    description:
      "Tiras de pollo crispy acompañadas de salsa de la casa.",
    price: 8500,
    image: "/images/products/tenders.jpg",
    category: "pollo",

    removableIngredients: [
      { id: "salsa", name: "Salsa de la casa" },
    ],

    options: [
      {
        id: "sauce",
        name: "Elegí tu salsa",
        type: "radio",
        required: true,
        options: [
          { id: "house", name: "Salsa de la casa", price: 0 },
          { id: "bbq", name: "Salsa BBQ", price: 0 },
          { id: "cheese", name: "Salsa cheddar", price: 800 },
        ],
      },
    ],
  },

  {
    id: "lomito-house",
    name: "Lomito House",
    description:
      "Lomo, jamón, queso, huevo, lechuga, tomate y papas.",
    price: 13500,
    image: "/images/products/sanguche-lomito.jpg",
    category: "sandwiches",

    removableIngredients: [
      { id: "jamon", name: "Jamón" },
      { id: "queso", name: "Queso" },
      { id: "huevo", name: "Huevo" },
      { id: "lechuga", name: "Lechuga" },
      { id: "tomate", name: "Tomate" },
    ],

    options: [
      {
        id: "extras",
        name: "Agregá extras",
        type: "checkbox",
        options: [
          { id: "egg", name: "Huevo extra", price: 1000 },
          { id: "cheddar", name: "Extra cheddar", price: 1000 },
          { id: "bacon", name: "Extra bacon", price: 1500 },
          {
            id: "papas-cheddar-bacon",
            name: "Papas con cheddar y bacon",
            price: 3000,
          },
        ],
      },
    ],
  },

  {
    id: "combo-house",
    name: "Combo House",
    description:
      "Burger a elección, papas y bebida.",
    price: 15500,
    image: "/images/products/promo.avif",
    category: "combos",
    badge: "COMBO",

    options: [
      {
        id: "burger",
        name: "Elegí tu burger",
        type: "radio",
        required: true,
        options: [
          { id: "classic", name: "Classic Burger", price: 0 },
          { id: "bbq", name: "BBQ Burger", price: 1000 },
          { id: "bacon", name: "Doble Bacon", price: 1500 },
        ],
      },
      {
        id: "drink",
        name: "Elegí tu bebida",
        type: "radio",
        required: true,
        options: [
          { id: "coke", name: "Coca-Cola", price: 0 },
          { id: "sprite", name: "Sprite", price: 0 },
          { id: "fanta", name: "Fanta", price: 0 },
        ],
      },
      {
        id: "extras",
        name: "Agregá extras",
        type: "checkbox",
        options: [
          { id: "cheddar", name: "Extra cheddar", price: 1000 },
          { id: "bacon", name: "Extra bacon", price: 1500 },
          {
            id: "papas-cheddar-bacon",
            name: "Papas con cheddar y bacon",
            price: 3000,
          },
        ],
      },
    ],
  },

  {
    id: "brownie-helado",
    name: "Brownie con Helado",
    description:
      "Brownie de chocolate tibio con helado de crema.",
    price: 6500,
    image: "/images/products/brownie.jpg",
    category: "postres",

    options: [
      {
        id: "ice-cream",
        name: "Elegí tu helado",
        type: "radio",
        required: true,
        options: [
          { id: "cream", name: "Crema", price: 0 },
          { id: "chocolate", name: "Chocolate", price: 0 },
          { id: "dulce", name: "Dulce de leche", price: 500 },
        ],
      },
    ],
  },
];

export function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}