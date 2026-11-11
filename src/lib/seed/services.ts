import type { Service } from "@/lib/domain/types";

/** Demonstration service list — to be replaced with the studio's own wording. */
const T = "2026-10-01T09:00:00.000Z";

export function seedServices(): Service[] {
  const rows: Array<Omit<Service, "order" | "createdAt" | "updatedAt">> = [
    {
      id: "svc_interior",
      visible: true,
      title: { ru: "Дизайн-проект интерьера", ky: "Интерьердин дизайн-долбоору", uz: "Interyer dizayn loyihasi" },
      description: {
        ru: "Полный комплект чертежей и визуализаций: от планировочного решения до раскладки плитки, спецификаций мебели и света.",
        ky: "Чиймелер жана визуализациялардын толук топтому: пландоо чечиминен баштап плитканын жайгашуусуна, эмерек жана жарык спецификацияларына чейин.",
        uz: "Chizmalar va vizualizatsiyalarning toʻliq toʻplami: rejalashtirish yechimidan tortib plitka joylashuvi, mebel va yoritish spetsifikatsiyalarigacha.",
      },
    },
    {
      id: "svc_architecture",
      visible: true,
      title: { ru: "Архитектурное проектирование", ky: "Архитектуралык долбоорлоо", uz: "Arxitektura loyihalash" },
      description: {
        ru: "Концепция и проект частного дома или общественного здания: объёмы, фасады, связь с участком и ландшафтом.",
        ky: "Жеке үйдүн же коомдук имараттын концепциясы жана долбоору: көлөмдөр, фасаддар, жер участогу жана ландшафт менен байланыш.",
        uz: "Xususiy uy yoki jamoat binosining konsepsiyasi va loyihasi: hajmlar, fasadlar, yer uchastkasi va landshaft bilan bogʻliqlik.",
      },
    },
    {
      id: "svc_commercial",
      visible: true,
      title: {
        ru: "Дизайн коммерческих пространств",
        ky: "Коммерциялык мейкиндиктердин дизайны",
        uz: "Tijorat makonlari dizayni",
      },
      description: {
        ru: "Офисы, рестораны, шоурумы и отели, где интерьер работает на задачу бизнеса и узнаваемость бренда.",
        ky: "Интерьер бизнестин максатына жана бренддин таанымалдуулугуна иштеген кеңселер, ресторандар, шоурумдар жана мейманканалар.",
        uz: "Interyer biznes maqsadlari va brend taniqliligiga xizmat qiladigan ofislar, restoranlar, shourumlar va mehmonxonalar.",
      },
    },
    {
      id: "svc_procurement",
      visible: true,
      title: { ru: "Комплектация", ky: "Комплектация", uz: "Butlash" },
      description: {
        ru: "Подбор и заказ мебели, света, отделочных материалов и декора в рамках согласованного бюджета.",
        ky: "Макулдашылган бюджеттин чегинде эмерек, жарык, жасалга материалдарын жана декорду тандоо жана буйрутма кылуу.",
        uz: "Kelishilgan byudjet doirasida mebel, yoritgichlar, pardozlash materiallari va dekorni tanlash hamda buyurtma qilish.",
      },
    },
    {
      id: "svc_supervision",
      visible: true,
      title: { ru: "Авторский надзор", ky: "Автордук көзөмөл", uz: "Mualliflik nazorati" },
      description: {
        ru: "Регулярные выезды на объект, контроль соответствия проекту и решение вопросов вместе со строителями.",
        ky: "Объектке үзгүлтүксүз барып туруу, долбоорго шайкештигин текшерүү жана маселелерди курулушчулар менен бирге чечүү.",
        uz: "Obyektga muntazam tashrif buyurish, loyihaga muvofiqligini nazorat qilish va masalalarni quruvchilar bilan birgalikda hal etish.",
      },
    },
    {
      id: "svc_consultation",
      visible: false,
      title: { ru: "Консультация", ky: "Консультация", uz: "Maslahat" },
      description: {
        ru: "Разовая встреча на объекте или в студии: разбор планировки, материалов и следующих шагов.",
        ky: "Объектте же студияда бир жолку жолугушуу: пландоону, материалдарды жана кийинки кадамдарды талкуулоо.",
        uz: "Obyektda yoki studiyada bir martalik uchrashuv: rejalashtirish, materiallar va keyingi qadamlarni koʻrib chiqish.",
      },
    },
  ];
  return rows.map((row, order) => ({ ...row, order, createdAt: T, updatedAt: T }));
}
