import { NextRequest, NextResponse } from "next/server";
import { Telegraf, Context, Markup } from "telegraf";
import { createCanvas, loadImage, registerFont } from "canvas";
// @ts-ignore
import bwipJs from "bwip-js";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || "your-bot-token");

interface UserState {
  step: number;
  photos: string[];
  eanCode?: string;
  description?: string;
  url: string | null;
  price: number | null;
}

const userStates: Record<number, UserState> = {};

enum Steps {
  UPLOAD_MAIN_PHOTO = 1,
  UPLOAD_EXTRA_PHOTOS,
  UPLOAD_EAN,
  UPLOAD_DESCRIPTION,
  UPLOAD_Url,
  UPLOAD_PRICE,
  CONFIRM,
}

bot.start(async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;
  userStates[userId] = {
    step: Steps.UPLOAD_MAIN_PHOTO,
    photos: [],
    price: null,
  };
  await ctx.reply("👋 Assalomu alaykum! Asosiy rasmni yuboring.");
});

bot.on("message", async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId || !userStates[userId]) {
    await ctx.reply("Iltimos, /start tugmasini bosing.");
    return;
  }

  const state = userStates[userId];

  if ("photo" in ctx.message) {
    const photo = ctx.message.photo?.pop();
    if (!photo) return;

    if (state.step === Steps.UPLOAD_MAIN_PHOTO) {
      state.photos.push(photo.file_id);
      state.step = Steps.UPLOAD_EXTRA_PHOTOS;
      await ctx.reply(
        "✅ Asosiy rasm qabul qilindi! Endi yana 2 ta qo‘shimcha rasm yuboring."
      );
    } else if (state.step === Steps.UPLOAD_EXTRA_PHOTOS) {
      state.photos.push(photo.file_id);
      if (state.photos.length < 3) {
        await ctx.reply(
          `Rasm qabul qilindi! Yana ${3 - state.photos.length} ta yuboring.`
        );
      } else {
        state.step = Steps.UPLOAD_EAN;
        await ctx.reply("✅ Hammasi joyida! Endi EAN-13 kodini yuboring.");
      }
    }
  } else if ("text" in ctx.message) {
    const text = ctx.message.text.trim();

    if (state.step === Steps.UPLOAD_EAN) {
      if (!/^\d{12,13}$/.test(text)) {
        await ctx.reply(
          "❌ EAN kodi faqat 12 yoki 13 xonali raqam bo‘lishi kerak. Qayta yuboring!"
        );
        return;
      }
      state.eanCode = text;
      state.step = Steps.UPLOAD_DESCRIPTION;
      await ctx.reply("✅ EAN kod qabul qilindi! Endi tavsif yuboring.");
    } else if (state.step === Steps.UPLOAD_DESCRIPTION) {
      state.description = text;
      state.step = Steps.UPLOAD_Url;
      await ctx.reply(
        "✅ Tavsif qabul qilindi! Endi Buyurtma uchun URL yuboring yoki /skip buyrug‘ini bosing."
      );
    } else if (state.step === Steps.UPLOAD_Url) {
      state.url = text === "/skip" ? null : text;
      state.step = Steps.UPLOAD_PRICE;
      await ctx.reply(
        "✅ Url qabul qilindi! Endi narxni yuboring yoki /skip buyrug‘ini bosing."
      );
    } else if (state.step === Steps.UPLOAD_PRICE) {
      if (text === "/skip") {
        state.price = null;
      } else {
        const parsedPrice = Number(text);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          await ctx.reply(
            "❌ Narx faqat musbat son bo‘lishi kerak. Qayta yuboring!"
          );
          return;
        }
        state.price = parsedPrice;
      }

      await ctx.reply("🔄 Rasm tayyorlanmoqda...");
      try {
        const buffer = await createCollage(
          state.photos,
          state.eanCode!,
          state.description!,
          state.price
        );

        const caption = state.url
          ? `<a href="${state.url}">💥 Chegirma bilan xarid qiling — 🛍️ buyurtmani hoziroq bering!</a>`
          : "";

        await ctx.replyWithPhoto(
          { source: buffer },
          {
            caption,
            parse_mode: "HTML",
          }
        );

        state.step = Steps.CONFIRM;
        await ctx.reply(
          "✅ Tayyor! Yana tayyorlashni xohlaysizmi? /new tugmasini bosing."
        );
      } catch (error) {
        console.error("Rasm xatosi:", error);
        await ctx.reply("❌ Rasm yaratishda xato yuz berdi.");
      }
    } else if (state.step === Steps.CONFIRM && text === "/new") {
      userStates[userId] = {
        step: Steps.UPLOAD_MAIN_PHOTO,
        photos: [],
        price: null,
      };
      await ctx.reply(
        "🔄 Yangi Rasm yaratish uchun avval asosiy rasmni yuboring."
      );
    }
  } else {
    await ctx.reply("❌ Noto‘g‘ri ma’lumot. /start tugmasini bosing.");
  }
});

async function createCollage(
  photos: string[],
  eanCode: string,
  description: string,
  price: number
) {
  const images = await Promise.all(
    photos.map(async (fileId) => {
      const link = await bot.telegram.getFileLink(fileId);
      return loadImage(link.href);
    })
  );

  const imagePath = path.join(process.cwd(), "public", "image.png");
  const codeImg = await loadImage(imagePath);

  const canvasWidth = 281;
  const canvasHeight = 378;
  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Asosiy tasvirlarni
  ctx.drawImage(images[0], 10, 10, 167, 189);
  ctx.drawImage(images[1], 187, 10, 84, 90);
  ctx.drawImage(images[2], 187, 109, 84, 90);

  // image.png
  ctx.globalAlpha = 0.3;
  ctx.drawImage(codeImg, 10, 210, 167, 37);
  ctx.globalAlpha = 1.0;

  // narx
  const fontPath = path.join(
    process.cwd(),
    "public",
    "static",
    "Oxanium-ExtraLight.ttf"
  );
  registerFont(fontPath, { family: "Oxanium" });

  if (price) {
    ctx.fillStyle = "#000";
    ctx.font = `bold 36px "Oxanium"`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(price.toString(), 15, 207, 167);
  }

  // Shtrix-kodni yaratish va joylashtirish
  const barcodeBuffer = await bwipJs.toBuffer({
    bcid: "code128",
    text: eanCode.toString(),
    scale: 5,
    height: 10,
    textsize: 11,
    includetext: true,
    textxalign: "center",
  });
  const barcodeImg = await loadImage(barcodeBuffer);
  ctx.drawImage(barcodeImg, 187, 214, 84, 37);

  // Tavsif matni uchun fon
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillRect(10, 250, 261, 98);

  // Tavsif matnini joylashtirish
  ctx.fillStyle = "#000";
  ctx.font = "12px Arial";
  wrapText(ctx, description, 15, 290, 251, 15);

  return canvas.toBuffer("image/jpeg");
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";

  for (let i = 0; i < words.length; i++) {
    let testLine = line + words[i] + " ";
    let testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line, x, y);
      line = words[i] + " ";
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await bot.handleUpdate(body);
    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error) {
    console.error("Bot xatosi:", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
