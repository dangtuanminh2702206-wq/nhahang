export type TableVisualState =
  | "neutral"
  | "available"
  | "unavailable"
  | "selected"
  | "occupied"
  | "cleaning"
  | "out-of-service";

export type RestaurantTable = {
  code: string;
  capacity: number;
  position: string;
  note?: string;
  planX: number;
  planY: number;
  nearbyLandmarks: readonly string[];
};

export type RestaurantFloor = {
  slug: "floor-1" | "floor-2" | "floor-3";
  areaCode: "floor-1" | "floor-2" | "floor-3";
  level: number;
  name: string;
  subtitle: string;
  description: string;
  features: readonly string[];
  planLandmarks: readonly { label: string; className: string }[];
  tables: readonly RestaurantTable[];
};

export type MenuCategoryId =
  | "starters"
  | "specialties"
  | "mains"
  | "hotpots"
  | "desserts"
  | "drinks";

export type MenuItem = {
  code: string;
  category: MenuCategoryId;
  name: string;
  description: string;
  price: number;
  fromPrice?: boolean;
  featured?: boolean;
  available: boolean;
};

export type MenuCombo = {
  code: string;
  name: string;
  guestCount: number;
  price: number;
  items: readonly string[];
  description: string;
};

export const menuCategories = [
  { id: "starters", label: "Khai vị" },
  { id: "specialties", label: "Món Việt đặc sắc" },
  { id: "mains", label: "Món chính" },
  { id: "hotpots", label: "Lẩu & dùng chung" },
  { id: "desserts", label: "Tráng miệng" },
  { id: "drinks", label: "Đồ uống" },
] as const;

export const restaurantFloors: readonly RestaurantFloor[] = [
  {
    slug: "floor-1",
    areaCode: "floor-1",
    level: 1,
    name: "Mộc Gia",
    subtitle: "Tầng 1 · đón khách và sum vầy",
    description:
      "Không gian sáng, gần cửa kính và cây xanh; được mô phỏng cho những bữa ăn gia đình, cặp đôi và nhóm nhỏ.",
    features: ["Khu đón khách", "Cửa kính & cây xanh", "Phù hợp gia đình"],
    planLandmarks: [
      { label: "Cửa kính", className: "landmark-window" },
      { label: "Quầy đón khách", className: "landmark-reception" },
      { label: "Lối vào", className: "landmark-entrance" },
      { label: "Cầu thang lên T2", className: "landmark-stairs" },
      { label: "Cụm cây / Vách xanh", className: "landmark-green" },
    ],
    tables: [
      { code: "T1-B01", capacity: 2, position: "Gần cửa kính", note: "Phù hợp cặp đôi", planX: 18, planY: 22, nearbyLandmarks: ["Cửa kính"] },
      { code: "T1-B02", capacity: 2, position: "Khu trung tâm gần kính", planX: 43, planY: 27, nearbyLandmarks: ["Cửa kính"] },
      { code: "T1-B03", capacity: 4, position: "Khu gia đình", planX: 69, planY: 22, nearbyLandmarks: ["Cửa kính"] },
      { code: "T1-B04", capacity: 4, position: "Gần cây xanh", planX: 21, planY: 50, nearbyLandmarks: ["Cụm cây / Vách xanh"] },
      { code: "T1-B05", capacity: 4, position: "Giữa sảnh", planX: 49, planY: 47, nearbyLandmarks: [] },
      { code: "T1-B06", capacity: 4, position: "Gần cầu thang", note: "Không gian thoáng", planX: 75, planY: 48, nearbyLandmarks: ["Cầu thang lên T2"] },
      { code: "T1-B07", capacity: 6, position: "Khu gia đình lớn", planX: 30, planY: 73, nearbyLandmarks: ["Quầy đón khách"] },
      { code: "T1-B08", capacity: 6, position: "Gần cầu thang", planX: 71, planY: 73, nearbyLandmarks: ["Cầu thang lên T2"] },
    ],
  },
  {
    slug: "floor-2",
    areaCode: "floor-2",
    level: 2,
    name: "Mộc Tĩnh",
    subtitle: "Tầng 2 · chậm rãi và kết nối",
    description:
      "Khoảng cách bàn rộng hơn, vừa đủ riêng tư cho nhóm bạn, gia đình và những buổi gặp gỡ công ty quy mô nhỏ.",
    features: ["Khoảng cách bàn rộng", "Góc yên tĩnh", "Phù hợp họp mặt"],
    planLandmarks: [
      { label: "Cửa kính", className: "landmark-window" },
      { label: "Góc tĩnh", className: "landmark-reception" },
      { label: "Lõi cầu thang T1 ↕ T3", className: "landmark-stairs" },
      { label: "Vách / Khu bán riêng tư", className: "landmark-private" },
    ],
    tables: [
      { code: "T2-B01", capacity: 2, position: "Góc yên tĩnh", planX: 20, planY: 75, nearbyLandmarks: ["Góc tĩnh"] },
      { code: "T2-B02", capacity: 2, position: "Gần cửa kính", planX: 36, planY: 22, nearbyLandmarks: ["Cửa kính"] },
      { code: "T2-B03", capacity: 4, position: "Khu nhóm bạn", planX: 72, planY: 23, nearbyLandmarks: ["Cửa kính"] },
      { code: "T2-B04", capacity: 4, position: "Khu nhóm bạn", planX: 23, planY: 48, nearbyLandmarks: [] },
      { code: "T2-B05", capacity: 4, position: "Giữa tầng", planX: 49, planY: 47, nearbyLandmarks: [] },
      { code: "T2-B06", capacity: 4, position: "Bán riêng tư", note: "Gần lõi thang", planX: 74, planY: 48, nearbyLandmarks: ["Vách / Khu bán riêng tư", "Lõi cầu thang T1 ↕ T3"] },
      { code: "T2-B07", capacity: 6, position: "Khu họp mặt nhỏ", planX: 40, planY: 73, nearbyLandmarks: [] },
      { code: "T2-B08", capacity: 8, position: "Khu nhóm lớn / công ty", planX: 69, planY: 75, nearbyLandmarks: ["Lõi cầu thang T1 ↕ T3"] },
    ],
  },
  {
    slug: "floor-3",
    areaCode: "floor-3",
    level: 3,
    name: "Mộc Thượng",
    subtitle: "Tầng 3 · rooftop và khoảng thở",
    description:
      "Tầng rooftop mô phỏng với ban công, khoảng nhìn thoáng và một khu VIP nhỏ cho nhóm muốn có không gian riêng hơn.",
    features: ["Rooftop & ban công", "Không gian ngoài trời", "Khu VIP riêng tư"],
    planLandmarks: [
      { label: "Ban công", className: "landmark-window" },
      { label: "Vườn rooftop", className: "landmark-reception" },
      { label: "Khu VIP", className: "landmark-vip" },
      { label: "Lõi cầu thang", className: "landmark-rooftop-stairs" },
    ],
    tables: [
      { code: "T3-B01", capacity: 2, position: "Ban công", note: "Phù hợp cặp đôi", planX: 18, planY: 22, nearbyLandmarks: ["Ban công"] },
      { code: "T3-B02", capacity: 2, position: "Khu rooftop", planX: 47, planY: 22, nearbyLandmarks: ["Ban công"] },
      { code: "T3-B03", capacity: 4, position: "View thoáng", planX: 76, planY: 23, nearbyLandmarks: ["Ban công"] },
      { code: "T3-B04", capacity: 4, position: "Khu ngoài trời", note: "Gần vườn", planX: 27, planY: 53, nearbyLandmarks: ["Vườn rooftop"] },
      { code: "T3-B05", capacity: 6, position: "Khu rooftop", planX: 58, planY: 52, nearbyLandmarks: [] },
      { code: "T3-B06", capacity: 8, position: "Khu VIP", note: "Riêng tư nhất", planX: 78, planY: 72, nearbyLandmarks: ["Khu VIP", "Lõi cầu thang"] },
    ],
  },
];

export const restaurantMenu: readonly MenuItem[] = [
  { code: "MV-KV01", category: "starters", name: "Gỏi bưởi tôm thịt", description: "Gỏi bưởi với tôm và thịt.", price: 89000, featured: true, available: true },
  { code: "MV-KV02", category: "starters", name: "Nem Mộc Vị", description: "Món nem trong menu mô phỏng Mộc Vị.", price: 79000, featured: true, available: true },
  { code: "MV-KV03", category: "starters", name: "Cuốn tôm rau thơm", description: "Cuốn tôm cùng rau thơm.", price: 69000, available: true },
  { code: "MV-KV04", category: "starters", name: "Nộm hoa chuối gà xé", description: "Nộm hoa chuối cùng gà xé.", price: 79000, available: true },
  { code: "MV-KV05", category: "starters", name: "Đậu hũ giòn sốt sả", description: "Đậu hũ giòn với sốt sả.", price: 59000, available: true },
  { code: "MV-DT01", category: "specialties", name: "Cá lăng nướng riềng mẻ", description: "Cá lăng nướng với riềng mẻ.", price: 229000, featured: true, available: true },
  { code: "MV-DT02", category: "specialties", name: "Gà nướng mắc khén", description: "Gà nướng cùng mắc khén.", price: 219000, featured: true, available: true },
  { code: "MV-DT03", category: "specialties", name: "Bò nướng lá lốt Mộc Vị", description: "Bò nướng lá lốt theo menu Mộc Vị.", price: 179000, featured: true, available: true },
  { code: "MV-DT04", category: "specialties", name: "Sườn non rim mắm tỏi", description: "Sườn non rim với mắm tỏi.", price: 189000, available: true },
  { code: "MV-DT05", category: "specialties", name: "Vịt áp chảo sốt me", description: "Vịt áp chảo cùng sốt me.", price: 199000, available: true },
  { code: "MV-MC01", category: "mains", name: "Cơm niêu Mộc Vị", description: "Cơm niêu trong menu mô phỏng Mộc Vị.", price: 139000, featured: true, available: true },
  { code: "MV-MC02", category: "mains", name: "Cơm gà nướng lá chanh", description: "Cơm gà nướng cùng lá chanh.", price: 129000, available: true },
  { code: "MV-MC03", category: "mains", name: "Bò lúc lắc khoai nướng", description: "Bò lúc lắc ăn cùng khoai nướng.", price: 189000, available: true },
  { code: "MV-MC04", category: "mains", name: "Cá kho tộ Mộc Vị", description: "Cá kho tộ theo menu Mộc Vị.", price: 169000, available: true },
  { code: "MV-MC05", category: "mains", name: "Thịt kho trứng kiểu nhà", description: "Thịt kho trứng kiểu nhà.", price: 149000, available: true },
  { code: "MV-MC06", category: "mains", name: "Tôm rang thịt ba chỉ", description: "Tôm rang cùng thịt ba chỉ.", price: 179000, available: true },
  { code: "MV-MC07", category: "mains", name: "Rau củ theo mùa xào nấm", description: "Rau củ theo mùa xào nấm.", price: 99000, available: true },
  { code: "MV-LA01", category: "hotpots", name: "Lẩu riêu cua đồng Mộc Vị", description: "Lẩu riêu cua đồng theo menu Mộc Vị.", price: 389000, fromPrice: true, featured: true, available: true },
  { code: "MV-LA02", category: "hotpots", name: "Lẩu nấm thảo mộc", description: "Lẩu nấm cùng thảo mộc.", price: 329000, fromPrice: true, available: true },
  { code: "MV-LA03", category: "hotpots", name: "Lẩu gà lá é", description: "Lẩu gà với lá é.", price: 369000, fromPrice: true, available: true },
  { code: "MV-LA04", category: "hotpots", name: "Cá lăng om chuối đậu", description: "Cá lăng om chuối đậu.", price: 299000, available: true },
  { code: "MV-TM01", category: "desserts", name: "Chè sen long nhãn", description: "Chè sen cùng long nhãn.", price: 59000, featured: true, available: true },
  { code: "MV-TM02", category: "desserts", name: "Kem dừa Mộc Vị", description: "Kem dừa trong menu Mộc Vị.", price: 69000, available: true },
  { code: "MV-TM03", category: "desserts", name: "Sữa chua nếp cẩm", description: "Sữa chua cùng nếp cẩm.", price: 49000, available: true },
  { code: "MV-TM04", category: "desserts", name: "Trái cây theo mùa", description: "Trái cây theo mùa.", price: 59000, fromPrice: true, available: true },
  { code: "MV-DU01", category: "drinks", name: "Trà sen Mộc Vị", description: "Trà sen trong menu Mộc Vị.", price: 49000, featured: true, available: true },
  { code: "MV-DU02", category: "drinks", name: "Trà đào cam sả", description: "Trà đào với cam và sả.", price: 59000, available: true },
  { code: "MV-DU03", category: "drinks", name: "Nước mơ gừng", description: "Nước mơ cùng gừng.", price: 49000, available: true },
  { code: "MV-DU04", category: "drinks", name: "Nước ép dứa bạc hà", description: "Nước ép dứa cùng bạc hà.", price: 59000, available: true },
  { code: "MV-DU05", category: "drinks", name: "Nước ép theo mùa", description: "Nước ép theo mùa.", price: 59000, available: true },
];

export const menuCombos: readonly MenuCombo[] = [
  { code: "MV-CB01", name: "Combo Mộc Duyên", guestCount: 2, price: 499000, description: "Gợi ý cho một bữa ăn hai người.", items: ["Gỏi bưởi tôm thịt", "Bò nướng lá lốt Mộc Vị", "Cơm niêu Mộc Vị", "Rau củ theo mùa xào nấm", "2 Chè sen long nhãn", "2 Trà sen Mộc Vị"] },
  { code: "MV-CB02", name: "Combo Mộc Gia", guestCount: 4, price: 899000, description: "Gợi ý cho bữa cơm gia đình bốn người.", items: ["Nem Mộc Vị", "Nộm hoa chuối gà xé", "Cá lăng nướng riềng mẻ", "Sườn non rim mắm tỏi", "Rau củ theo mùa xào nấm", "Cơm niêu", "Chè sen long nhãn", "Trà sen theo bình"] },
  { code: "MV-CB03", name: "Combo Mộc Tĩnh", guestCount: 6, price: 1349000, description: "Gợi ý cho nhóm sáu người gặp gỡ chậm rãi.", items: ["Gỏi bưởi tôm thịt", "Nem Mộc Vị", "Gà nướng mắc khén", "Cá lăng nướng riềng mẻ", "Tôm rang thịt ba chỉ", "Rau củ theo mùa xào nấm", "Lẩu nấm thảo mộc", "Cơm niêu", "Trái cây theo mùa", "Trà sen"] },
  { code: "MV-CB04", name: "Combo Mộc Thượng", guestCount: 8, price: 1799000, description: "Gợi ý cho nhóm tám người cùng dùng bữa.", items: ["Gỏi bưởi tôm thịt", "Nem Mộc Vị", "Nộm hoa chuối gà xé", "Gà nướng mắc khén", "Cá lăng nướng riềng mẻ", "Bò nướng lá lốt Mộc Vị", "Sườn non rim mắm tỏi", "Rau củ theo mùa xào nấm", "Lẩu riêu cua đồng Mộc Vị", "Cơm niêu", "Chè sen long nhãn", "Trà sen"] },
];

export const featuredMenuItems = restaurantMenu.filter((item) => item.featured);

export function formatPrice(price: number, fromPrice = false) {
  return `${fromPrice ? "Từ " : ""}${new Intl.NumberFormat("vi-VN").format(price)}đ`;
}

export function getFloor(slug: string) {
  return restaurantFloors.find((floor) => floor.slug === slug);
}

export function getCategoryLabel(category: MenuCategoryId) {
  return menuCategories.find((item) => item.id === category)?.label ?? category;
}
