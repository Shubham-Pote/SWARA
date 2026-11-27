import akira from "../assets/akira.webp";
import maria from "../assets/maria.webp";

export const companions = {
  spanish: {
    first: "María",
    name: "María González",
    city: "Mexico City",
    image: maria,
    model: "Maria",
    locale: "es-MX",
    greeting: "¡Hola! Soy María.",
    introduction: "Hi, I’m María! Let’s learn Spanish together.",
    pronunciation: "OH-lah! Soy mah-REE-ah.",
  },
  japanese: {
    first: "Akira",
    name: "Akira Tanaka",
    city: "Tokyo",
    image: akira,
    model: "Akira",
    locale: "ja-JP",
    greeting: "こんにちは、アキラです。",
    introduction: "Hi, I’m Akira! Let’s learn Japanese together.",
    pronunciation: "Konnichiwa, Akira desu.",
  },
} as const;
