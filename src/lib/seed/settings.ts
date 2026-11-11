import type { Settings } from "@/lib/domain/types";

export function seedSettings(): Settings {
  return {
    studioName: "Hermitage Interior Design",
    logo: null,
    whatsapp: "+996554884666",
    instagram: "https://www.instagram.com/hermitage_interior_design/",
    cities: [
      {
        id: "osh",
        name: { ru: "Ош", ky: "Ош", uz: "Oʻsh" },
        note: { ru: "", ky: "", uz: "" },
        latitude: 40.5283,
        longitude: 72.7985,
      },
      {
        id: "bishkek",
        name: { ru: "Бишкек", ky: "Бишкек", uz: "Bishkek" },
        note: { ru: "", ky: "", uz: "" },
        latitude: 42.8746,
        longitude: 74.5698,
      },
    ],
    defaultLocale: "ru",
    seo: {
      title: {
        ru: "Hermitage — архитектура и дизайн интерьера в Оше и Бишкеке",
        ky: "Hermitage — Ош жана Бишкектеги архитектура жана интерьер",
        uz: "Hermitage — Oʻsh va Bishkekda arxitektura va interyer",
      },
      description: {
        ru: "Студия архитектуры и дизайна интерьера Hermitage. Жилые и общественные пространства в Оше и Бишкеке.",
        ky: "Hermitage архитектура жана интерьер дизайны студиясы. Ош жана Бишкектеги турак жай жана коомдук мейкиндиктер.",
        uz: "Hermitage arxitektura va interyer dizayni studiyasi. Oʻsh va Bishkekdagi turar joy va jamoat makonlari.",
      },
    },
    updatedAt: "2026-10-01T09:00:00.000Z",
  };
}
