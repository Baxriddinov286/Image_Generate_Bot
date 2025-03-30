// async function createCollage(
//   photos: string[],
//   eanCode: string,
//   description: string,
//   price: string
// ) {
//   // Tasvirlarni yuklash
//   const images = await Promise.all(
//     photos.map(async (fileId) => {
//       const link = await bot.telegram.getFileLink(fileId);
//       return loadImage(link.href);
//     })
//   );

//   // image.png tasvirini yuklash
//   const imagePath = path.join(process.cwd(), "public", "image.png");
//   const codeImg = await loadImage(imagePath);

//   // Kanvas va kontekstni yaratish
//   const canvasWidth = 794;
//   const canvasHeight = 1123;
//   const canvas = createCanvas(canvasWidth, canvasHeight);
//   const ctx = canvas.getContext("2d");

//   // Kanvas fonini oq rang bilan to‘ldirish
//   ctx.fillStyle = "#ffffff";
//   ctx.fillRect(0, 0, canvasWidth, canvasHeight);

//   // Asosiy tasvirlarni joylashtirish
//   ctx.drawImage(images[0], 30, 30, 500, 600);
//   if (images[1]) ctx.drawImage(images[1], 550, 30, 200, 200);
//   if (images[2]) ctx.drawImage(images[2], 550, 250, 200, 200);

//   // image.png tasvirni joylashtirish
//   ctx.drawImage(codeImg, 30, 650, 500, 100);

//   // Narx 
//   if (price) {
//     ctx.fillStyle = "#000";
//     ctx.font = "bold 48px Arial";
//     ctx.textAlign = "left";
//     ctx.textBaseline = "top";
//     ctx.fillText(price, 40, 690, 480);
//   }

//   // Shtrix-kodni yaratish va joylashtirish
//   const barcodeBuffer = await bwipJs.toBuffer({
//     bcid: "code128",
//     text: eanCode.toString(),
//     scale: 3,
//     height: 10,
//     textsize: 6,
//     includetext: true,
//     textxalign: "center",
//   });
//   const barcodeImg = await loadImage(barcodeBuffer);
//   ctx.drawImage(barcodeImg, 550, 650, 200, 100);
//   // 550, 700, 200, 100

//   // Tavsif matni uchun fon yaratish
//   ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
//   ctx.fillRect(30, 850, 734, 250);

//   // Tavsif matnini joylashtirish
//   ctx.fillStyle = "#000";
//   ctx.font = "24px Arial";
//   ctx.textAlign = "left";
//   ctx.textBaseline = "top";
//   wrapText(ctx, description, 40, 870, 714, 30);

//   return canvas.toBuffer("image/jpeg");
// }