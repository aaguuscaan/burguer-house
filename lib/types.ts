export type MenuCategory = {
  id: string;
  name: string;
  icon: string;
};

export type MenuProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string | null;
  badge: string | null;
  available: boolean;
};
