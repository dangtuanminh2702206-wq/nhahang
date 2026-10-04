export type MediaKind = "hero" | "space" | "dish" | "combo" | "isometric";

export type MediaAsset = {
  path: string;
  alt: string;
  aspectRatio: string;
  objectPosition: string;
};

export type ResolvedMedia = MediaAsset & {
  status: "available" | "pending";
};

function restaurantAsset(
  filename: string,
  alt: string,
  aspectRatio: string,
  objectPosition: string,
): MediaAsset {
  return { path: `/images/restaurant/${filename}.webp`, alt, aspectRatio, objectPosition };
}

export const restaurantMedia = {
  hero: restaurantAsset("hero/moc-vi-hero", "Minh họa AI không gian Mộc Vị với bàn gỗ, cửa kính và cây xanh trong nắng ấm", "4 / 5", "52% 54%"),
  exterior: restaurantAsset("exterior/moc-vi-exterior", "Minh họa AI mặt tiền ba tầng của nhà hàng giả định Mộc Vị vào buổi tối", "16 / 9", "50% 58%"),
  "floor-1": restaurantAsset("floors/floor-1-moc-gia", "Minh họa AI tầng Mộc Gia với quầy đón khách, lối đi và bàn gia đình gần cửa kính", "4 / 3", "54% 58%"),
  "floor-2": restaurantAsset("floors/floor-2-moc-tinh", "Minh họa AI tầng Mộc Tĩnh với bàn gỗ giãn cách bên cửa kính", "4 / 3", "48% 55%"),
  "floor-3": restaurantAsset("floors/floor-3-moc-thuong", "Minh họa AI tầng Mộc Thượng với bàn rooftop, cây xanh và khoảng trời hoàng hôn", "4 / 3", "46% 43%"),
  familyArea: restaurantAsset("areas/family", "Minh họa AI khu gia đình với bàn gỗ và cây xanh tại Mộc Gia", "3 / 2", "56% 58%"),
  quietArea: restaurantAsset("areas/quiet", "Minh họa AI góc bàn yên tĩnh cạnh cửa kính tại Mộc Tĩnh", "3 / 2", "53% 56%"),
  rooftopArea: restaurantAsset("areas/rooftop", "Minh họa AI khu rooftop với bàn ăn và khoảng trời hoàng hôn", "3 / 2", "49% 44%"),
  vipArea: restaurantAsset("areas/vip", "Minh họa AI khu VIP với bàn nhóm tám người và vách gỗ", "3 / 2", "56% 56%"),
  "isometric-floor-1": restaurantAsset("isometric/floor-1", "Minh họa AI isometric tầng Mộc Gia; sơ đồ tương tác thể hiện vị trí bàn chính thức", "4 / 3", "50% 52%"),
  "isometric-floor-2": restaurantAsset("isometric/floor-2", "Minh họa AI isometric tầng Mộc Tĩnh; sơ đồ tương tác thể hiện vị trí bàn chính thức", "4 / 3", "50% 50%"),
  "isometric-floor-3": restaurantAsset("isometric/floor-3", "Minh họa AI isometric tầng Mộc Thượng với rooftop và khu riêng", "4 / 3", "50% 48%"),
  coupleTable: restaurantAsset("tables/couple", "Minh họa AI bàn hai người cạnh cửa kính và cây xanh", "3 / 2", "46% 58%"),
  familyTable: restaurantAsset("tables/family", "Minh họa AI bàn gia đình với gốm và ghế mây trong không gian Mộc Vị", "3 / 2", "52% 59%"),
  groupTable: restaurantAsset("tables/group", "Minh họa AI bàn dài dành cho nhóm trong không gian gỗ ấm", "3 / 2", "51% 55%"),
  vipTable: restaurantAsset("tables/vip", "Minh họa AI toàn cảnh bàn VIP tám người với đèn ấm và vách gỗ", "3 / 2", "53% 55%"),
};

// Stable menu codes map to one expected filename each, including pending assets.
export const menuImageSlugs: Record<string, string> = {
  "MV-KV01": "goi-buoi-tom-thit",
  "MV-KV02": "nem-moc-vi",
  "MV-KV03": "cuon-tom-rau-thom",
  "MV-KV04": "nom-hoa-chuoi-ga-xe",
  "MV-KV05": "dau-hu-gion-sot-sa",
  "MV-DT01": "ca-lang-nuong-rieng-me",
  "MV-DT02": "ga-nuong-mac-khen",
  "MV-DT03": "bo-nuong-la-lot",
  "MV-DT04": "suon-non-rim-mam-toi",
  "MV-DT05": "vit-ap-chao-sot-me",
  "MV-MC01": "com-nieu-moc-vi",
  "MV-MC02": "com-ga-nuong-la-chanh",
  "MV-MC03": "bo-luc-lac-khoai-nuong",
  "MV-MC04": "ca-kho-to-moc-vi",
  "MV-MC05": "thit-kho-trung-kieu-nha",
  "MV-MC06": "tom-rang-thit-ba-chi",
  "MV-MC07": "rau-cu-theo-mua-xao-nam",
  "MV-LA01": "lau-rieu-cua-dong",
  "MV-LA02": "lau-nam-thao-moc",
  "MV-LA03": "lau-ga-la-e",
  "MV-LA04": "ca-lang-om-chuoi-dau",
  "MV-TM01": "che-sen-long-nhan",
  "MV-TM02": "kem-dua-moc-vi",
  "MV-TM03": "sua-chua-nep-cam",
  "MV-TM04": "trai-cay-theo-mua",
  "MV-DU01": "tra-sen-moc-vi",
  "MV-DU02": "tra-dao-cam-sa",
  "MV-DU03": "nuoc-mo-gung",
  "MV-DU04": "nuoc-ep-dua-bac-ha",
  "MV-DU05": "nuoc-ep-theo-mua",
};

export const comboImageSlugs: Record<string, string> = {
  "MV-CB01": "moc-duyen",
  "MV-CB02": "moc-gia",
  "MV-CB03": "moc-tinh",
  "MV-CB04": "moc-thuong",
};

const menuObjectPositions: Record<string, string> = {
  "MV-KV01": "50% 58%", "MV-KV02": "53% 61%", "MV-KV03": "50% 55%",
  "MV-DT01": "50% 56%", "MV-DT02": "50% 58%", "MV-MC01": "53% 56%",
  "MV-LA01": "51% 57%", "MV-LA02": "50% 53%", "MV-TM01": "50% 57%",
  "MV-DU01": "53% 56%",
};

export function getMenuImage(code: string, name: string, kind: "dish" | "combo" = "dish"): MediaAsset {
  const slug = (kind === "combo" ? comboImageSlugs : menuImageSlugs)[code];
  if (!slug) {
    if (kind === "combo") {
      return {
        path: "/images/menu/combos/pending.webp",
        alt: `Ảnh combo ${name} đang chờ được bổ sung trong catalogue Mộc Vị`,
        aspectRatio: "4 / 3",
        objectPosition: "50% 50%",
      };
    }
    throw new Error(`Missing canonical image mapping for ${code}`);
  }
  return {
    path: `/images/menu/${kind === "combo" ? "combos" : "dishes"}/${slug}.webp`,
    alt: `Minh họa AI ${name} trong catalogue Mộc Vị`,
    aspectRatio: "4 / 3",
    objectPosition: menuObjectPositions[code] ?? "50% 50%",
  };
}

// Scenes describe the concept, not the exact geometry or identity of a table.
export const floorScenes = {
  "floor-1": [
    { title: "Góc gia đình", asset: restaurantMedia.familyArea },
    { title: "Bàn hai người", asset: restaurantMedia.coupleTable },
    { title: "Bàn gia đình", asset: restaurantMedia.familyTable },
  ],
  "floor-2": [
    { title: "Góc yên tĩnh", asset: restaurantMedia.quietArea },
    { title: "Bàn nhóm", asset: restaurantMedia.groupTable },
  ],
  "floor-3": [
    { title: "Khoảng trời rooftop", asset: restaurantMedia.rooftopArea },
    { title: "Khu VIP", asset: restaurantMedia.vipArea },
    { title: "Bàn VIP tám người", asset: restaurantMedia.vipTable },
  ],
};
